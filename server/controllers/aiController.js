import OpenAI from "openai";
import sql from "../configs/db.js";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";

/* =====================================================
   GROQ AI CONFIGURATION
===================================================== */

if (!process.env.GROQ_API_KEY) {
  console.warn(
    "⚠️ GROQ_API_KEY is missing. Text AI features will not work."
  );
}

const AI = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const TEXT_AI_MODEL = "llama-3.3-70b-versatile";

/* =====================================================
   FREE PLAN CONFIGURATION

   Every FREE user gets:

   Article Writing        5
   Blog Titles            5
   Image Generation       5
   Background Removal     5
   Object Removal         5
   Resume Review          5

   Each tool has its OWN independent counter.

   PRO users are not restricted by these counters.
===================================================== */

const FREE_USAGE_LIMIT = 5;

/* =====================================================
   VALID USAGE COLUMNS

   IMPORTANT:

   Never accept a database column name directly from
   req.body or any user-controlled input.

   Only these internally-defined columns are allowed.
===================================================== */

const USAGE_COLUMNS = new Set([
  "article_generation_used",
  "blog_title_used",
  "image_generation_used",
  "background_removal_used",
  "object_removal_used",
  "resume_analysis_used",
]);

/* =====================================================
   HELPER: VALIDATE USAGE COLUMN
===================================================== */

const validateUsageColumn = (column) => {
  if (!USAGE_COLUMNS.has(column)) {
    throw new Error(
      `Invalid Genviq usage column: ${column}`
    );
  }
};

/* =====================================================
   HELPER: HANDLE AI PROVIDER ERRORS
===================================================== */

const handleAIProviderError = (
  error,
  res,
  featureName = "AI request"
) => {
  console.error(`${featureName} Error:`, {
    status: error?.status,
    message: error?.message,
    code: error?.code,
    type: error?.type,
  });

  if (error?.status === 401) {
    return res.status(401).json({
      success: false,

      message:
        "AI provider authentication failed. Please check the API key.",
    });
  }

  if (error?.status === 429) {
    return res.status(429).json({
      success: false,

      message:
        "AI request limit reached. Please try again shortly.",
    });
  }

  return res.status(
    error?.status || 500
  ).json({
    success: false,

    message:
      error?.message ||
      `${featureName} failed. Please try again.`,
  });
};

/* =====================================================
   HELPER: MAKE SURE USER USAGE ROW EXISTS

   auth.js already creates this row.

   This helper is an additional safety check for:
   - Existing users
   - Old accounts
   - Missing usage records

   New row defaults:

   0 used = 5 remaining
===================================================== */

const ensureUsageRecord = async (userId) => {
  await sql`
    INSERT INTO user_usage (
      user_id
    )

    VALUES (
      ${userId}
    )

    ON CONFLICT (user_id)
    DO NOTHING
  `;
};

/* =====================================================
   HELPER: GET FEATURE USAGE

   Example:

   getFeatureUsage(
     userId,
     "blog_title_used"
   )

   Result:

   {
     used: 0,
     remaining: 5,
     limit: 5
   }
===================================================== */

const getFeatureUsage = async (
  userId,
  column
) => {
  validateUsageColumn(column);

  await ensureUsageRecord(userId);

  /*
    @neondatabase/serverless tagged-template SQL
    intentionally does not interpolate identifiers
    like column names.

    Since the column is selected exclusively from our
    internal allowlist, we map it to a fixed query.
  */

  let result;

  switch (column) {
    case "article_generation_used":
      result = await sql`
        SELECT article_generation_used AS used
        FROM user_usage
        WHERE user_id = ${userId}
        LIMIT 1
      `;
      break;

    case "blog_title_used":
      result = await sql`
        SELECT blog_title_used AS used
        FROM user_usage
        WHERE user_id = ${userId}
        LIMIT 1
      `;
      break;

    case "image_generation_used":
      result = await sql`
        SELECT image_generation_used AS used
        FROM user_usage
        WHERE user_id = ${userId}
        LIMIT 1
      `;
      break;

    case "background_removal_used":
      result = await sql`
        SELECT background_removal_used AS used
        FROM user_usage
        WHERE user_id = ${userId}
        LIMIT 1
      `;
      break;

    case "object_removal_used":
      result = await sql`
        SELECT object_removal_used AS used
        FROM user_usage
        WHERE user_id = ${userId}
        LIMIT 1
      `;
      break;

    case "resume_analysis_used":
      result = await sql`
        SELECT resume_analysis_used AS used
        FROM user_usage
        WHERE user_id = ${userId}
        LIMIT 1
      `;
      break;

    default:
      throw new Error(
        "Unsupported usage feature."
      );
  }

  const used =
    Number(result?.[0]?.used) || 0;

  return {
    used,

    remaining: Math.max(
      FREE_USAGE_LIMIT - used,
      0
    ),

    limit: FREE_USAGE_LIMIT,
  };
};

/* =====================================================
   HELPER: CHECK FREE FEATURE ACCESS

   Call this BEFORE using Groq / Cloudflare / Cloudinary.

   FREE:
   - Checks individual feature quota.

   PRO:
   - Immediately allowed.
===================================================== */

const checkFeatureAccess = async ({
  userId,
  plan,
  column,
  featureName,
}) => {
  if (plan === "pro") {
    return {
      allowed: true,

      plan: "pro",

      usage: null,
    };
  }

  const usage =
    await getFeatureUsage(
      userId,
      column
    );

  console.log(
    `📊 ${featureName} usage: ${usage.used}/${usage.limit} used`
  );

  console.log(
    `🎁 ${featureName} remaining: ${usage.remaining}/${usage.limit}`
  );

  if (
    usage.used >=
    FREE_USAGE_LIMIT
  ) {
    return {
      allowed: false,

      plan: "free",

      usage,
    };
  }

  return {
    allowed: true,

    plan: "free",

    usage,
  };
};

/* =====================================================
   HELPER: INCREMENT FEATURE USAGE

   IMPORTANT:

   Call this ONLY AFTER the operation has completed
   successfully.

   Failed generation should NOT consume a free use.

   Example:

   Before:
   blog_title_used = 0
   remaining = 5

   Successful generation:

   blog_title_used = 1
   remaining = 4
===================================================== */

const incrementFeatureUsage = async (
  userId,
  plan,
  column
) => {
  validateUsageColumn(column);

  /*
    PRO users do not consume free quota.
  */

  if (plan === "pro") {
    return {
      used: null,
      remaining: null,
      limit: null,
      unlimited: true,
    };
  }

  await ensureUsageRecord(userId);

  let result;

  /*
    The WHERE condition prevents the value from
    exceeding FREE_USAGE_LIMIT.

    This also provides an additional server-side
    safeguard against accidental increments above 5.
  */

  switch (column) {
    case "article_generation_used":
      result = await sql`
        UPDATE user_usage

        SET
          article_generation_used =
            article_generation_used + 1,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE
          user_id = ${userId}

          AND article_generation_used <
            ${FREE_USAGE_LIMIT}

        RETURNING
          article_generation_used AS used
      `;
      break;

    case "blog_title_used":
      result = await sql`
        UPDATE user_usage

        SET
          blog_title_used =
            blog_title_used + 1,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE
          user_id = ${userId}

          AND blog_title_used <
            ${FREE_USAGE_LIMIT}

        RETURNING
          blog_title_used AS used
      `;
      break;

    case "image_generation_used":
      result = await sql`
        UPDATE user_usage

        SET
          image_generation_used =
            image_generation_used + 1,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE
          user_id = ${userId}

          AND image_generation_used <
            ${FREE_USAGE_LIMIT}

        RETURNING
          image_generation_used AS used
      `;
      break;

    case "background_removal_used":
      result = await sql`
        UPDATE user_usage

        SET
          background_removal_used =
            background_removal_used + 1,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE
          user_id = ${userId}

          AND background_removal_used <
            ${FREE_USAGE_LIMIT}

        RETURNING
          background_removal_used AS used
      `;
      break;

    case "object_removal_used":
      result = await sql`
        UPDATE user_usage

        SET
          object_removal_used =
            object_removal_used + 1,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE
          user_id = ${userId}

          AND object_removal_used <
            ${FREE_USAGE_LIMIT}

        RETURNING
          object_removal_used AS used
      `;
      break;

    case "resume_analysis_used":
      result = await sql`
        UPDATE user_usage

        SET
          resume_analysis_used =
            resume_analysis_used + 1,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE
          user_id = ${userId}

          AND resume_analysis_used <
            ${FREE_USAGE_LIMIT}

        RETURNING
          resume_analysis_used AS used
      `;
      break;

    default:
      throw new Error(
        "Unsupported usage feature."
      );
  }

  /*
    If nothing was updated, quota was already exhausted.
  */

  if (!result?.length) {
    const usage =
      await getFeatureUsage(
        userId,
        column
      );

    return {
      ...usage,
      exhausted: true,
      unlimited: false,
    };
  }

  const used =
    Number(result[0].used);

  const usage = {
    used,

    remaining: Math.max(
      FREE_USAGE_LIMIT - used,
      0
    ),

    limit: FREE_USAGE_LIMIT,

    exhausted:
      used >= FREE_USAGE_LIMIT,

    unlimited: false,
  };

  console.log(
    `📉 Usage updated: ${usage.remaining}/${usage.limit} remaining`
  );

  return usage;
};

/* =====================================================
   HELPER: SEND QUOTA LIMIT RESPONSE

   Standard response used by all six AI tools when
   a FREE user reaches 0/5.
===================================================== */

const sendQuotaExceeded = (
  res,
  featureName,
  usage
) => {
  return res.status(403).json({
    success: false,

    code:
      "FREE_QUOTA_EXCEEDED",

    message:
      `You have used all ${FREE_USAGE_LIMIT} free ${featureName} uses. Upgrade to Genviq Pro to continue.`,

    plan:
      "free",

    usage: {
      used:
        usage?.used ??
        FREE_USAGE_LIMIT,

      remaining: 0,

      limit:
        FREE_USAGE_LIMIT,
    },

    upgradeRequired:
      true,
  });
};

/* =====================================================
   GENERATE ARTICLE

   FREE USER:
   - 5 lifetime free article generations
   - Uses article_generation_used

   PRO USER:
   - No free quota restriction

   IMPORTANT:
   Usage is incremented ONLY after:
   1. Groq successfully generates the article
   2. Creation is successfully saved to Neon
===================================================== */

export const generateArticle = async (req, res) => {
  try {
    console.log("📝 Generate Article API hit");

    /* =================================================
       GET AUTHENTICATED USER

       auth.js already gives us:
       req.userId
       req.plan
    ================================================= */

    const userId = req.userId;

    const plan = req.plan || "free";

    const {
      prompt,
      length,
    } = req.body;

    console.log("User:", userId);
    console.log("Plan:", plan);

    /* =================================================
       AUTH CHECK
    ================================================= */

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }

    /* =================================================
       PROMPT VALIDATION
    ================================================= */

    if (
      !prompt ||
      !prompt.trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Please provide an article topic or prompt.",
      });
    }

    /* =================================================
       NORMALIZE ARTICLE LENGTH

       Protect the backend from invalid or extremely
       large frontend values.
    ================================================= */

    let requestedLength =
      Number(length);

    if (
      !Number.isFinite(
        requestedLength
      )
    ) {
      requestedLength = 800;
    }

    requestedLength = Math.min(
      Math.max(
        Math.round(
          requestedLength
        ),
        100
      ),
      3000
    );

    /* =================================================
       CHECK ARTICLE QUOTA

       This checks ONLY:

       article_generation_used

       It does NOT affect:
       - Images
       - Blog Titles
       - Resume
       - Background Removal
       - Object Removal
    ================================================= */

    const access =
      await checkFeatureAccess({
        userId,

        plan,

        column:
          "article_generation_used",

        featureName:
          "Article Writing",
      });

    /* =================================================
       FREE LIMIT REACHED
    ================================================= */

    if (!access.allowed) {
      console.log(
        "⛔ Article free quota exhausted"
      );

      return sendQuotaExceeded(
        res,
        "Article Writing",
        access.usage
      );
    }

    if (plan === "free") {
      console.log(
        `🎁 Article credits before generation: ${access.usage.remaining}/${access.usage.limit}`
      );
    } else {
      console.log(
        "👑 Genviq Pro — article quota bypassed"
      );
    }

    /* =================================================
       BUILD ARTICLE PROMPT
    ================================================= */

    const articlePrompt = `
Write a high-quality, original, well-structured article based on the following request:

${prompt.trim()}

Requirements:

- Target approximately ${requestedLength} words.
- Use a clear and engaging title when appropriate.
- Use useful headings and subheadings.
- Write naturally and professionally.
- Avoid unnecessary repetition.
- Keep paragraphs readable.
- Provide useful, relevant information.
- Do not mention these instructions.
- Return only the finished article.
`;

    /* =================================================
       GENERATE ARTICLE WITH GROQ
    ================================================= */

    console.log(
      "🤖 Generating article with Groq..."
    );

    const completion =
      await AI.chat.completions.create({
        model:
          TEXT_AI_MODEL,

        messages: [
          {
            role: "system",

            content:
              "You are Genviq's professional AI writing assistant. Produce polished, useful, original articles based on the user's request.",
          },

          {
            role: "user",

            content:
              articlePrompt,
          },
        ],

        temperature: 0.7,
      });

    /* =================================================
       EXTRACT GENERATED CONTENT
    ================================================= */

    const content =
      completion?.choices?.[0]
        ?.message?.content
        ?.trim();

    if (!content) {
      throw new Error(
        "AI provider returned an empty article."
      );
    }

    console.log(
      "✅ Article generated successfully"
    );

    /* =================================================
       SAVE CREATION TO NEON

       We save first.

       If this fails, usage is NOT deducted.
    ================================================= */

    await sql`
      INSERT INTO creations (
        user_id,
        prompt,
        content,
        type
      )

      VALUES (
        ${userId},
        ${prompt.trim()},
        ${content},
        'article'
      )
    `;

    console.log(
      "💾 Article saved to Neon"
    );

    /* =================================================
       INCREMENT ARTICLE USAGE

       ONLY after successful generation + DB save.

       FREE:
       5/5 → 4/5 → 3/5 → 2/5 → 1/5 → 0/5

       PRO:
       Does not consume free credits.
    ================================================= */

    const updatedUsage =
      await incrementFeatureUsage(
        userId,

        plan,

        "article_generation_used"
      );

    /* =================================================
       LOG UPDATED USAGE
    ================================================= */

    if (plan === "free") {
      console.log(
        `📊 Article credits after generation: ${updatedUsage.remaining}/${updatedUsage.limit}`
      );
    }

    /* =================================================
       SUCCESS RESPONSE

       Frontend will later use "usage" to update
       the counter instantly without refreshing.

       Example:

       usage: {
         used: 1,
         remaining: 4,
         limit: 5
       }
    ================================================= */

    return res.status(200).json({
      success: true,

      content,

      plan,

      usage:
        plan === "pro"
          ? {
              unlimited: true,
            }
          : {
              used:
                updatedUsage.used,

              remaining:
                updatedUsage.remaining,

              limit:
                updatedUsage.limit,
            },
    });

  } catch (error) {

    console.error(
      "❌ Generate Article Error:",
      error
    );

    return handleAIProviderError(
      error,
      res,
      "Generate Article"
    );
  }
};

/* =====================================================
   GENERATE BLOG TITLES

   FREE USER:
   - 5 lifetime free blog title generations
   - Uses blog_title_used

   PRO USER:
   - No free quota restriction

   IMPORTANT:
   Usage is incremented ONLY after:
   1. Groq successfully generates the titles
   2. Creation is successfully saved to Neon
===================================================== */

export const generateBlogTitle = async (req, res) => {
  try {
    console.log("🏷️ Generate Blog Title API hit");

    /* =================================================
       GET AUTHENTICATED USER

       auth.js provides:
       req.userId
       req.plan
    ================================================= */

    const userId = req.userId;

    const plan =
      req.plan || "free";

    const {
      prompt,
    } = req.body;

    console.log(
      "User:",
      userId
    );

    console.log(
      "Plan:",
      plan
    );

    /* =================================================
       AUTH CHECK
    ================================================= */

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }

    /* =================================================
       PROMPT VALIDATION
    ================================================= */

    if (
      !prompt ||
      !prompt.trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Please provide a topic or keyword for your blog titles.",
      });
    }

    /* =================================================
       CHECK BLOG TITLE QUOTA

       This checks ONLY:

       blog_title_used

       It does NOT affect:

       article_generation_used
       image_generation_used
       background_removal_used
       object_removal_used
       resume_analysis_used
    ================================================= */

    const access =
      await checkFeatureAccess({
        userId,

        plan,

        column:
          "blog_title_used",

        featureName:
          "Blog Title Generation",
      });

    /* =================================================
       FREE LIMIT REACHED
    ================================================= */

    if (!access.allowed) {
      console.log(
        "⛔ Blog Title free quota exhausted"
      );

      return sendQuotaExceeded(
        res,

        "Blog Title Generation",

        access.usage
      );
    }

    /* =================================================
       LOG CURRENT USAGE
    ================================================= */

    if (plan === "free") {
      console.log(
        `🎁 Blog Title credits before generation: ${access.usage.remaining}/${access.usage.limit}`
      );
    } else {
      console.log(
        "👑 Genviq Pro — Blog Title quota bypassed"
      );
    }

    /* =================================================
       BUILD AI PROMPT

       Your frontend may already combine keyword +
       category into req.body.prompt.

       So we keep "prompt" flexible rather than
       changing your frontend request structure.
    ================================================= */

    const blogTitlePrompt = `
Generate 10 high-quality, creative, clickable blog title ideas based on the following request:

${prompt.trim()}

Requirements:

- Generate exactly 10 title ideas.
- Make each title distinct.
- Make them engaging without using misleading clickbait.
- Keep titles concise and natural.
- Match the topic and intent of the request.
- Do not add explanations before or after the titles.
- Return one title per line.
`;

    /* =================================================
       GENERATE BLOG TITLES WITH GROQ
    ================================================= */

    console.log(
      "🤖 Generating blog titles with Groq..."
    );

    const completion =
      await AI.chat.completions.create({
        model:
          TEXT_AI_MODEL,

        messages: [
          {
            role:
              "system",

            content:
              "You are Genviq's professional blog title generator. Create concise, engaging, relevant, original blog title ideas.",
          },

          {
            role:
              "user",

            content:
              blogTitlePrompt,
          },
        ],

        temperature:
          0.8,
      });

    /* =================================================
       EXTRACT GENERATED CONTENT
    ================================================= */

    const content =
      completion?.choices?.[0]
        ?.message?.content
        ?.trim();

    if (!content) {
      throw new Error(
        "AI provider returned no blog titles."
      );
    }

    console.log(
      "✅ Blog titles generated successfully"
    );

    /* =================================================
       SAVE TO NEON

       Save BEFORE deducting a free use.

       If database saving fails:
       → user keeps their free credit.
    ================================================= */

    await sql`
      INSERT INTO creations (
        user_id,
        prompt,
        content,
        type
      )

      VALUES (
        ${userId},
        ${prompt.trim()},
        ${content},
        'blog-title'
      )
    `;

    console.log(
      "💾 Blog titles saved to Neon"
    );

    /* =================================================
       INCREMENT ONLY BLOG TITLE USAGE

       FREE:

       Before first generation:
       blog_title_used = 0
       UI = 5/5

       After first success:
       blog_title_used = 1
       UI = 4/5

       Other five feature counters remain unchanged.
    ================================================= */

    const updatedUsage =
      await incrementFeatureUsage(
        userId,

        plan,

        "blog_title_used"
      );

    /* =================================================
       LOG UPDATED USAGE
    ================================================= */

    if (plan === "free") {
      console.log(
        `📊 Blog Title credits after generation: ${updatedUsage.remaining}/${updatedUsage.limit}`
      );
    }

    /* =================================================
       SUCCESS RESPONSE

       Later BlogTitles.jsx can immediately use:

       data.usage.remaining
       data.usage.limit

       Example after first generation:

       {
         success: true,
         plan: "free",

         usage: {
           used: 1,
           remaining: 4,
           limit: 5
         }
       }

       This means no page refresh is required to
       visually change 5/5 → 4/5.
    ================================================= */

    return res.status(200).json({
      success: true,

      content,

      plan,

      usage:
        plan === "pro"
          ? {
              unlimited:
                true,
            }
          : {
              used:
                updatedUsage.used,

              remaining:
                updatedUsage.remaining,

              limit:
                updatedUsage.limit,
            },
    });

  } catch (error) {

    console.error(
      "❌ Generate Blog Title Error:",
      error
    );

    return handleAIProviderError(
      error,

      res,

      "Generate Blog Title"
    );
  }
};

/* =====================================================
   GENERATE IMAGE
   CLOUDFLARE WORKERS AI

   FREE USER:
   - 5 lifetime free image generations
   - Uses image_generation_used

   PRO USER:
   - No free quota restriction

   IMPORTANT:
   Usage is incremented ONLY after:
   1. Cloudflare successfully generates the image
   2. Cloudinary successfully uploads the image
   3. Creation is successfully saved to Neon
===================================================== */

export const generateImage = async (req, res) => {
  try {
    console.log("🎨 Generate Image API hit");

    /* =================================================
       AUTHENTICATED USER
    ================================================= */

    const userId = req.userId;

    const plan =
      req.plan || "free";

    const {
      prompt,
      publish = false,
    } = req.body;

    console.log(
      "User:",
      userId
    );

    console.log(
      "Plan:",
      plan
    );

    /* =================================================
       AUTH CHECK
    ================================================= */

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }

    /* =================================================
       PROMPT VALIDATION
    ================================================= */

    if (
      !prompt ||
      !prompt.trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Please provide an image prompt.",
      });
    }

    /* =================================================
       CHECK IMAGE GENERATION QUOTA

       Only image_generation_used is checked.

       Other counters are completely independent.
    ================================================= */

    const access =
      await checkFeatureAccess({
        userId,

        plan,

        column:
          "image_generation_used",

        featureName:
          "Image Generation",
      });

    /* =================================================
       FREE LIMIT REACHED
    ================================================= */

    if (!access.allowed) {
      console.log(
        "⛔ Image Generation free quota exhausted"
      );

      return sendQuotaExceeded(
        res,

        "Image Generation",

        access.usage
      );
    }

    /* =================================================
       LOG CURRENT USAGE
    ================================================= */

    if (plan === "free") {
      console.log(
        `🎁 Image credits before generation: ${access.usage.remaining}/${access.usage.limit}`
      );
    } else {
      console.log(
        "👑 Genviq Pro — Image Generation quota bypassed"
      );
    }

    /* =================================================
       CLOUDFLARE ENV CHECK
    ================================================= */

    const accountId =
      process.env.CLOUDFLARE_ACCOUNT_ID;

    const apiToken =
      process.env.CLOUDFLARE_API_TOKEN;

    console.log(
      "☁️ Cloudflare Account ID:",
      accountId
        ? "✅ LOADED"
        : "❌ MISSING"
    );

    console.log(
      "🔑 Cloudflare API Token:",
      apiToken
        ? "✅ LOADED"
        : "❌ MISSING"
    );

    if (
      !accountId ||
      !apiToken
    ) {
      return res.status(500).json({
        success: false,

        message:
          "Cloudflare image generation is not configured.",
      });
    }

    /* =================================================
       CLOUDFLARE MODEL

       Keep the model configurable through .env.

       If CLOUDFLARE_IMAGE_MODEL is not defined,
       this fallback model is used.
    ================================================= */

    const model =
      process.env
        .CLOUDFLARE_IMAGE_MODEL ||
      "@cf/black-forest-labs/flux-1-schnell";

    /* =================================================
       CLOUDFLARE API URL
    ================================================= */

    const cloudflareUrl =
      `https://api.cloudflare.com/client/v4/accounts/` +
      `${accountId}/ai/run/${model}`;

    console.log(
      "🎨 Generating image with Cloudflare Workers AI..."
    );

    console.log(
      "🤖 Cloudflare model:",
      model
    );

    /* =================================================
       GENERATE IMAGE

       responseType arraybuffer is important because
       Cloudflare returns binary image data for image
       generation models.
    ================================================= */

    const imageResponse =
      await axios.post(
        cloudflareUrl,

        {
          prompt:
            prompt.trim(),
        },

        {
          headers: {
            Authorization:
              `Bearer ${apiToken}`,

            "Content-Type":
              "application/json",
          },

          responseType:
            "arraybuffer",

          timeout:
            120000,

          validateStatus:
            () => true,
        }
      );

    console.log(
      "📡 Cloudflare status:",
      imageResponse.status
    );

    /* =================================================
       HANDLE CLOUDFLARE ERROR RESPONSE
    ================================================= */

    if (
      imageResponse.status < 200 ||
      imageResponse.status >= 300
    ) {
      let providerMessage =
        "Cloudflare image generation failed.";

      try {
        const errorText =
          Buffer.from(
            imageResponse.data
          ).toString(
            "utf8"
          );

        console.error(
          "❌ Cloudflare response:",
          errorText
        );

        try {
          const parsed =
            JSON.parse(
              errorText
            );

          providerMessage =
            parsed?.errors?.[0]
              ?.message ||
            parsed?.error ||
            parsed?.message ||
            providerMessage;

        } catch {
          if (
            errorText &&
            errorText.length < 1000
          ) {
            providerMessage =
              errorText;
          }
        }

      } catch (decodeError) {
        console.error(
          "Could not decode Cloudflare error:",
          decodeError.message
        );
      }

      return res
        .status(
          imageResponse.status
        )
        .json({
          success: false,

          message:
            providerMessage,
        });
    }

    /* =================================================
       VALIDATE GENERATED DATA
    ================================================= */

    if (
      !imageResponse.data ||
      !imageResponse.data
        .byteLength
    ) {
      throw new Error(
        "Cloudflare returned an empty image."
      );
    }

    /* =================================================
       DETECT RESPONSE CONTENT TYPE
    ================================================= */

    const contentType =
      imageResponse.headers[
        "content-type"
      ] ||
      "image/png";

    console.log(
      "🖼️ Cloudflare response type:",
      contentType
    );

    /*
      Some Cloudflare AI responses may return JSON
      instead of raw image bytes depending on the
      selected model/provider.

      Handle that safely.
    */

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      const responseText =
        Buffer.from(
          imageResponse.data
        ).toString(
          "utf8"
        );

      let parsed;

      try {
        parsed =
          JSON.parse(
            responseText
          );

      } catch {
        throw new Error(
          "Cloudflare returned an unexpected JSON response."
        );
      }

      /*
        Some models/providers can return a base64 image
        inside a JSON result.

        Support common response shapes.
      */

      const base64Result =
        parsed?.result?.image ||
        parsed?.result ||
        parsed?.image;

      if (
        typeof base64Result !==
          "string" ||
        !base64Result
      ) {
        console.error(
          "Unexpected Cloudflare JSON:",
          parsed
        );

        throw new Error(
          parsed?.errors?.[0]
            ?.message ||
          parsed?.message ||
          "Cloudflare did not return valid image data."
        );
      }

      const cleanBase64 =
        base64Result.replace(
          /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
          ""
        );

      imageResponse.data =
        Buffer.from(
          cleanBase64,
          "base64"
        );
    }

    /* =================================================
       CONVERT GENERATED IMAGE TO BUFFER
    ================================================= */

    const imageBuffer =
      Buffer.isBuffer(
        imageResponse.data
      )
        ? imageResponse.data
        : Buffer.from(
            imageResponse.data
          );

    if (!imageBuffer.length) {
      throw new Error(
        "Generated image buffer is empty."
      );
    }

    const imageSizeMB =
      (
        imageBuffer.length /
        1024 /
        1024
      ).toFixed(2);

    console.log(
      "✅ Cloudflare generated image successfully"
    );

    console.log(
      `📦 Generated image size: ${imageSizeMB} MB`
    );

    /* =================================================
       DETERMINE IMAGE MIME TYPE

       If Cloudflare returned JSON/base64, default PNG
       is safe for our Cloudinary data URI.
    ================================================= */

    let imageMimeType =
      contentType;

    if (
      !imageMimeType.startsWith(
        "image/"
      )
    ) {
      imageMimeType =
        "image/png";
    }

    /* =================================================
       CONVERT BUFFER TO BASE64 DATA URI
    ================================================= */

    const base64Image =
      `data:${imageMimeType};base64,` +
      imageBuffer.toString(
        "base64"
      );

    console.log(
      "📦 Image converted for Cloudinary"
    );

    /* =================================================
       CLOUDINARY CONFIG CHECK
    ================================================= */

    console.log(
      "☁️ Cloudinary configuration:"
    );

    console.log(
      "Cloud name:",
      process.env
        .CLOUDINARY_CLOUD_NAME
        ? "✅ LOADED"
        : "❌ MISSING"
    );

    console.log(
      "API key:",
      process.env
        .CLOUDINARY_API_KEY
        ? "✅ LOADED"
        : "❌ MISSING"
    );

    console.log(
      "API secret:",
      process.env
        .CLOUDINARY_API_SECRET
        ? "✅ LOADED"
        : "❌ MISSING"
    );

    if (
      !process.env
        .CLOUDINARY_CLOUD_NAME ||
      !process.env
        .CLOUDINARY_API_KEY ||
      !process.env
        .CLOUDINARY_API_SECRET
    ) {
      throw new Error(
        "Cloudinary configuration is incomplete."
      );
    }

    /* =================================================
       UPLOAD TO CLOUDINARY

       If this fails:
       → no usage credit is consumed.
    ================================================= */

    console.log(
      "☁️ Uploading generated image to Cloudinary..."
    );

    const uploadResult =
      await cloudinary.uploader.upload(
        base64Image,

        {
          folder:
            "genviq/generated-images",

          resource_type:
            "image",
        }
      );

    /* =================================================
       GET CLOUDINARY URL
    ================================================= */

    const secureUrl =
      uploadResult?.secure_url;

    if (!secureUrl) {
      throw new Error(
        "Cloudinary did not return an image URL."
      );
    }

    console.log(
      "✅ Cloudinary upload successful"
    );

    console.log(
      "🔗 Image URL:",
      secureUrl
    );

    /* =================================================
       SAVE CREATION TO NEON

       If Neon fails:
       usage is still NOT deducted.

       The Cloudinary asset may exist, but the user's
       free quota remains unchanged because Genviq
       did not complete the full operation.
    ================================================= */

    await sql`
      INSERT INTO creations (
        user_id,
        prompt,
        content,
        type,
        publish
      )

      VALUES (
        ${userId},
        ${prompt.trim()},
        ${secureUrl},
        'image',
        ${Boolean(publish)}
      )
    `;

    console.log(
      "💾 Generated image saved to Neon"
    );

    /* =================================================
       INCREMENT IMAGE USAGE

       Only now do we consume one FREE image use.

       FREE:
       5/5 → 4/5 → 3/5 → 2/5 → 1/5 → 0/5

       PRO:
       No free usage consumed.
    ================================================= */

    const updatedUsage =
      await incrementFeatureUsage(
        userId,

        plan,

        "image_generation_used"
      );

    /* =================================================
       LOG UPDATED USAGE
    ================================================= */

    if (plan === "free") {
      console.log(
        `📊 Image credits after generation: ${updatedUsage.remaining}/${updatedUsage.limit}`
      );
    }

    /* =================================================
       SUCCESS
    ================================================= */

    console.log(
      "🎉 Image generation completed successfully"
    );

    return res.status(200).json({
      success: true,

      content:
        secureUrl,

      plan,

      usage:
        plan === "pro"
          ? {
              unlimited:
                true,
            }
          : {
              used:
                updatedUsage.used,

              remaining:
                updatedUsage.remaining,

              limit:
                updatedUsage.limit,
            },
    });

  } catch (error) {

    console.error(
      "❌ Generate Image Error"
    );

    console.error(
      "Full error:",
      error
    );

    /* =================================================
       RESOLVE ERROR INFORMATION
    ================================================= */

    const status =
      error?.status ||
      error?.http_code ||
      error?.response?.status ||
      error?.cause?.status;

    const message =
      error?.response?.data
        ?.message ||
      error?.response?.data
        ?.error ||
      error?.message ||
      error?.cause?.message ||
      "Image generation failed.";

    console.error(
      "Resolved status:",
      status ||
        "Unknown"
    );

    console.error(
      "Resolved message:",
      message
    );

    /* =================================================
       CLOUDFLARE AUTH ERROR
    ================================================= */

    if (
      status === 401 ||
      status === 403
    ) {
      return res
        .status(status)
        .json({
          success: false,

          message:
            message ||
            "Image service authentication failed.",
        });
    }

    /* =================================================
       RATE LIMIT
    ================================================= */

    if (status === 429) {
      return res
        .status(429)
        .json({
          success: false,

          message:
            "Image generation rate limit reached. Please try again shortly.",
        });
    }

    /* =================================================
       GENERAL ERROR
    ================================================= */

    return res
      .status(
        status || 500
      )
      .json({
        success: false,

        message:
          message ||
          "Image generation failed. Please try again.",
      });
  }
};

/* =====================================================
   REMOVE IMAGE BACKGROUND

   FREE USER:
   - 5 lifetime free background removals
   - Uses background_removal_used

   PRO USER:
   - No free quota restriction

   IMPORTANT:
   Usage is incremented ONLY after:
   1. Image is successfully processed
   2. Final image is available
   3. Creation is successfully saved to Neon
===================================================== */

export const removeImageBackground = async (req, res) => {
  let localFilePath = null;

  try {
    console.log(
      "🖼️ Remove Image Background API hit"
    );

    /* =================================================
       AUTHENTICATED USER
    ================================================= */

    const userId =
      req.userId;

    const plan =
      req.plan || "free";

    console.log(
      "User:",
      userId
    );

    console.log(
      "Plan:",
      plan
    );

    /* =================================================
       AUTH CHECK
    ================================================= */

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }

    /* =================================================
       FILE VALIDATION
    ================================================= */

    if (!req.file) {
      return res.status(400).json({
        success: false,

        message:
          "Please upload an image.",
      });
    }

    localFilePath =
      req.file.path;

    console.log(
      "📁 Uploaded image:",
      localFilePath
    );

    /* =================================================
       CHECK BACKGROUND REMOVAL QUOTA

       ONLY this counter is checked:

       background_removal_used

       Other feature credits remain independent.
    ================================================= */

    const access =
      await checkFeatureAccess({
        userId,

        plan,

        column:
          "background_removal_used",

        featureName:
          "Background Removal",
      });

    /* =================================================
       FREE LIMIT REACHED
    ================================================= */

    if (!access.allowed) {
      console.log(
        "⛔ Background Removal free quota exhausted"
      );

      /*
        Since multer may already have saved the uploaded
        file before auth/controller execution, remove the
        temporary local file before returning.
      */

      if (
        localFilePath &&
        fs.existsSync(
          localFilePath
        )
      ) {
        try {
          fs.unlinkSync(
            localFilePath
          );

          console.log(
            "🧹 Temporary upload removed"
          );

        } catch (
          cleanupError
        ) {
          console.error(
            "⚠️ Temporary file cleanup failed:",
            cleanupError.message
          );
        }
      }

      return sendQuotaExceeded(
        res,

        "Background Removal",

        access.usage
      );
    }

    /* =================================================
       LOG CURRENT USAGE
    ================================================= */

    if (plan === "free") {
      console.log(
        `🎁 Background Removal credits before processing: ${access.usage.remaining}/${access.usage.limit}`
      );
    } else {
      console.log(
        "👑 Genviq Pro — Background Removal quota bypassed"
      );
    }

    /* =================================================
       CLOUDINARY CONFIG CHECK
    ================================================= */

    if (
      !process.env
        .CLOUDINARY_CLOUD_NAME ||
      !process.env
        .CLOUDINARY_API_KEY ||
      !process.env
        .CLOUDINARY_API_SECRET
    ) {
      throw new Error(
        "Cloudinary configuration is incomplete."
      );
    }

    /* =================================================
       UPLOAD ORIGINAL IMAGE TO CLOUDINARY

       We use Cloudinary background removal transformation.

       IMPORTANT:

       If your existing working function uses a specific
       Cloudinary transformation/add-on, preserve the
       transformation configuration that already works
       for your Cloudinary account.
    ================================================= */

    console.log(
      "☁️ Uploading image to Cloudinary..."
    );

    const uploadResult =
      await cloudinary.uploader.upload(
        localFilePath,

        {
          folder:
            "genviq/background-removal",

          resource_type:
            "image",

          background_removal:
            "cloudinary_ai",
        }
      );

    /* =================================================
       VALIDATE CLOUDINARY RESPONSE
    ================================================= */

    if (
      !uploadResult ||
      !uploadResult.public_id
    ) {
      throw new Error(
        "Cloudinary did not return a valid uploaded image."
      );
    }

    console.log(
      "✅ Image uploaded successfully"
    );

    console.log(
      "Public ID:",
      uploadResult.public_id
    );

    /* =================================================
       BUILD FINAL BACKGROUND-REMOVED IMAGE URL

       Cloudinary AI background removal can process
       asynchronously depending on account/configuration.

       The transformed URL uses the uploaded public ID.
    ================================================= */

    const transformedUrl =
      cloudinary.url(
        uploadResult.public_id,

        {
          secure:
            true,

          resource_type:
            "image",

          transformation: [
            {
              effect:
                "background_removal",
            },
          ],

          format:
            "png",
        }
      );

    if (!transformedUrl) {
      throw new Error(
        "Could not create the background-removed image URL."
      );
    }

    console.log(
      "🎨 Background removal result prepared"
    );

    console.log(
      "🔗 Result:",
      transformedUrl
    );

    /* =================================================
       SAVE CREATION TO NEON

       Save before deducting quota.

       If this fails:
       → user keeps their free credit.
    ================================================= */

    await sql`
      INSERT INTO creations (
        user_id,
        prompt,
        content,
        type,
        publish
      )

      VALUES (
        ${userId},
        ${"Remove image background"},
        ${transformedUrl},
        ${"background-removal"},
        ${false}
      )
    `;

    console.log(
      "💾 Background removal saved to Neon"
    );

    /* =================================================
       INCREMENT ONLY BACKGROUND REMOVAL USAGE

       FREE:

       5/5
       ↓ successful operation
       4/5

       Does NOT affect:
       - Article
       - Blog Titles
       - Images
       - Object Removal
       - Resume
    ================================================= */

    const updatedUsage =
      await incrementFeatureUsage(
        userId,

        plan,

        "background_removal_used"
      );

    /* =================================================
       CLEAN UP TEMPORARY LOCAL FILE
    ================================================= */

    if (
      localFilePath &&
      fs.existsSync(
        localFilePath
      )
    ) {
      try {
        fs.unlinkSync(
          localFilePath
        );

        console.log(
          "🧹 Temporary upload removed"
        );

        localFilePath =
          null;

      } catch (
        cleanupError
      ) {
        console.error(
          "⚠️ Temporary file cleanup failed:",
          cleanupError.message
        );
      }
    }

    /* =================================================
       LOG UPDATED USAGE
    ================================================= */

    if (plan === "free") {
      console.log(
        `📊 Background Removal credits after processing: ${updatedUsage.remaining}/${updatedUsage.limit}`
      );
    }

    /* =================================================
       SUCCESS RESPONSE
    ================================================= */

    return res.status(200).json({
      success:
        true,

      content:
        transformedUrl,

      plan,

      usage:
        plan === "pro"
          ? {
              unlimited:
                true,
            }
          : {
              used:
                updatedUsage.used,

              remaining:
                updatedUsage.remaining,

              limit:
                updatedUsage.limit,
            },
    });

  } catch (error) {

    console.error(
      "❌ Remove Background Error:",
      error
    );

    /* =================================================
       CLEAN TEMP FILE ON FAILURE

       A failed request must not leave unnecessary
       temporary files on the server.
    ================================================= */

    if (
      localFilePath &&
      fs.existsSync(
        localFilePath
      )
    ) {
      try {
        fs.unlinkSync(
          localFilePath
        );

        console.log(
          "🧹 Temporary upload removed after failure"
        );

      } catch (
        cleanupError
      ) {
        console.error(
          "⚠️ Temporary file cleanup failed:",
          cleanupError.message
        );
      }
    }

    /* =================================================
       RESOLVE ERROR
    ================================================= */

    const status =
      error?.status ||
      error?.http_code ||
      error?.response?.status ||
      error?.cause?.status;

    const message =
      error?.response?.data
        ?.error?.message ||
      error?.response?.data
        ?.message ||
      error?.message ||
      "Background removal failed.";

    console.error(
      "Resolved status:",
      status ||
        "Unknown"
    );

    console.error(
      "Resolved message:",
      message
    );

    /* =================================================
       AUTH / PERMISSION ERROR
    ================================================= */

    if (
      status === 401 ||
      status === 403
    ) {
      return res
        .status(status)
        .json({
          success:
            false,

          message:
            message ||
            "Image service authentication failed.",
        });
    }

    /* =================================================
       RATE LIMIT
    ================================================= */

    if (
      status === 429
    ) {
      return res
        .status(429)
        .json({
          success:
            false,

          message:
            "Background removal rate limit reached. Please try again shortly.",
        });
    }

    /* =================================================
       GENERAL ERROR
    ================================================= */

    return res
      .status(
        status || 500
      )
      .json({
        success:
          false,

        message:
          message ||
          "Background removal failed. Please try again.",
      });
  }
};

/* =====================================================
   REMOVE IMAGE OBJECT

   FREE USER:
   - 5 lifetime free object removals
   - Uses object_removal_used

   PRO USER:
   - No free quota restriction

   IMPORTANT:
   Usage is incremented ONLY after:
   1. Image is successfully uploaded/processed
   2. Final result is successfully created
   3. Creation is successfully saved to Neon
===================================================== */

export const removeImageObject = async (req, res) => {
  let localFilePath = null;

  try {
    console.log(
      "🪄 Remove Image Object API hit"
    );

    /* =================================================
       AUTHENTICATED USER
    ================================================= */

    const userId =
      req.userId;

    const plan =
      req.plan || "free";

    const {
      object,
      objectName,
      prompt,
    } = req.body;

    /*
      Your existing frontend may use one of these names.

      We support all three so we don't unnecessarily
      break the current frontend request.
    */

    const objectToRemove =
      object?.trim() ||
      objectName?.trim() ||
      prompt?.trim();

    console.log(
      "User:",
      userId
    );

    console.log(
      "Plan:",
      plan
    );

    console.log(
      "Object to remove:",
      objectToRemove
    );

    /* =================================================
       AUTH CHECK
    ================================================= */

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }

    /* =================================================
       FILE VALIDATION
    ================================================= */

    if (!req.file) {
      return res.status(400).json({
        success: false,

        message:
          "Please upload an image.",
      });
    }

    localFilePath =
      req.file.path;

    console.log(
      "📁 Uploaded image:",
      localFilePath
    );

    /* =================================================
       OBJECT VALIDATION
    ================================================= */

    if (!objectToRemove) {
      /*
        Multer may already have created a temporary
        local file, so clean it before returning.
      */

      if (
        localFilePath &&
        fs.existsSync(
          localFilePath
        )
      ) {
        try {
          fs.unlinkSync(
            localFilePath
          );

          localFilePath =
            null;

        } catch (
          cleanupError
        ) {
          console.error(
            "⚠️ Temporary file cleanup failed:",
            cleanupError.message
          );
        }
      }

      return res.status(400).json({
        success: false,

        message:
          "Please specify the object you want to remove.",
      });
    }

    /* =================================================
       CHECK OBJECT REMOVAL QUOTA

       This checks ONLY:

       object_removal_used

       It does NOT consume credits from any other tool.
    ================================================= */

    const access =
      await checkFeatureAccess({
        userId,

        plan,

        column:
          "object_removal_used",

        featureName:
          "Object Removal",
      });

    /* =================================================
       FREE LIMIT REACHED
    ================================================= */

    if (!access.allowed) {
      console.log(
        "⛔ Object Removal free quota exhausted"
      );

      if (
        localFilePath &&
        fs.existsSync(
          localFilePath
        )
      ) {
        try {
          fs.unlinkSync(
            localFilePath
          );

          localFilePath =
            null;

          console.log(
            "🧹 Temporary upload removed"
          );

        } catch (
          cleanupError
        ) {
          console.error(
            "⚠️ Temporary file cleanup failed:",
            cleanupError.message
          );
        }
      }

      return sendQuotaExceeded(
        res,

        "Object Removal",

        access.usage
      );
    }

    /* =================================================
       CURRENT USAGE
    ================================================= */

    if (plan === "free") {
      console.log(
        `🎁 Object Removal credits before processing: ${access.usage.remaining}/${access.usage.limit}`
      );
    } else {
      console.log(
        "👑 Genviq Pro — Object Removal quota bypassed"
      );
    }

    /* =================================================
       CLOUDINARY CONFIG CHECK
    ================================================= */

    if (
      !process.env
        .CLOUDINARY_CLOUD_NAME ||
      !process.env
        .CLOUDINARY_API_KEY ||
      !process.env
        .CLOUDINARY_API_SECRET
    ) {
      throw new Error(
        "Cloudinary configuration is incomplete."
      );
    }

    /* =================================================
       UPLOAD ORIGINAL IMAGE TO CLOUDINARY
    ================================================= */

    console.log(
      "☁️ Uploading image to Cloudinary..."
    );

    const uploadResult =
      await cloudinary.uploader.upload(
        localFilePath,

        {
          folder:
            "genviq/object-removal",

          resource_type:
            "image",
        }
      );

    if (
      !uploadResult ||
      !uploadResult.public_id
    ) {
      throw new Error(
        "Cloudinary did not return a valid uploaded image."
      );
    }

    console.log(
      "✅ Original image uploaded"
    );

    console.log(
      "Public ID:",
      uploadResult.public_id
    );

    /* =================================================
       CREATE OBJECT REMOVAL TRANSFORMATION

       Cloudinary Generative Remove syntax:

       e_gen_remove:prompt_<object>

       cloudinary.url() generates the delivery URL
       containing the transformation.

       IMPORTANT:
       If your OLD working object-removal function uses
       a different Cloudinary transformation syntax,
       preserve that exact working transformation block.
    ================================================= */

    console.log(
      "🪄 Preparing object removal..."
    );

    const transformedUrl =
      cloudinary.url(
        uploadResult.public_id,

        {
          secure:
            true,

          resource_type:
            "image",

          transformation: [
            {
              effect:
                `gen_remove:prompt_${objectToRemove}`,
            },
          ],
        }
      );

    if (!transformedUrl) {
      throw new Error(
        "Could not create the object-removed image URL."
      );
    }

    console.log(
      "✅ Object removal result prepared"
    );

    console.log(
      "🔗 Result:",
      transformedUrl
    );

    /* =================================================
       SAVE TO NEON

       We save before consuming quota.

       If this fails:
       FREE credit remains unchanged.
    ================================================= */

    await sql`
      INSERT INTO creations (
        user_id,
        prompt,
        content,
        type,
        publish
      )

      VALUES (
        ${userId},
        ${`Remove ${objectToRemove} from image`},
        ${transformedUrl},
        'object-removal',
        ${false}
      )
    `;

    console.log(
      "💾 Object removal saved to Neon"
    );

    /* =================================================
       INCREMENT ONLY OBJECT REMOVAL USAGE

       Only after successful processing + Neon save.
    ================================================= */

    const updatedUsage =
      await incrementFeatureUsage(
        userId,

        plan,

        "object_removal_used"
      );

    /* =================================================
       CLEAN TEMPORARY LOCAL FILE
    ================================================= */

    if (
      localFilePath &&
      fs.existsSync(
        localFilePath
      )
    ) {
      try {
        fs.unlinkSync(
          localFilePath
        );

        localFilePath =
          null;

        console.log(
          "🧹 Temporary upload removed"
        );

      } catch (
        cleanupError
      ) {
        console.error(
          "⚠️ Temporary file cleanup failed:",
          cleanupError.message
        );
      }
    }

    /* =================================================
       UPDATED USAGE
    ================================================= */

    if (plan === "free") {
      console.log(
        `📊 Object Removal credits after processing: ${updatedUsage.remaining}/${updatedUsage.limit}`
      );
    }

    /* =================================================
       SUCCESS RESPONSE

       Frontend can immediately update:

       5/5 → 4/5

       using data.usage.
    ================================================= */

    return res.status(200).json({
      success:
        true,

      content:
        transformedUrl,

      plan,

      usage:
        plan === "pro"
          ? {
              unlimited:
                true,
            }
          : {
              used:
                updatedUsage.used,

              remaining:
                updatedUsage.remaining,

              limit:
                updatedUsage.limit,
            },
    });

  } catch (error) {

    console.error(
      "❌ Remove Object Error:",
      error
    );

    /* =================================================
       CLEAN TEMP FILE ON FAILURE
    ================================================= */

    if (
      localFilePath &&
      fs.existsSync(
        localFilePath
      )
    ) {
      try {
        fs.unlinkSync(
          localFilePath
        );

        console.log(
          "🧹 Temporary upload removed after failure"
        );

      } catch (
        cleanupError
      ) {
        console.error(
          "⚠️ Temporary file cleanup failed:",
          cleanupError.message
        );
      }
    }

    /* =================================================
       RESOLVE ERROR
    ================================================= */

    const status =
      error?.status ||
      error?.http_code ||
      error?.response?.status ||
      error?.cause?.status;

    const message =
      error?.response?.data
        ?.error?.message ||
      error?.response?.data
        ?.message ||
      error?.message ||
      "Object removal failed.";

    console.error(
      "Resolved status:",
      status ||
        "Unknown"
    );

    console.error(
      "Resolved message:",
      message
    );

    /* =================================================
       AUTH / PERMISSION ERROR
    ================================================= */

    if (
      status === 401 ||
      status === 403
    ) {
      return res
        .status(status)
        .json({
          success:
            false,

          message:
            message ||
            "Image service authentication failed.",
        });
    }

    /* =================================================
       RATE LIMIT
    ================================================= */

    if (status === 429) {
      return res
        .status(429)
        .json({
          success:
            false,

          message:
            "Object removal rate limit reached. Please try again shortly.",
        });
    }

    /* =================================================
       GENERAL ERROR
    ================================================= */

    return res
      .status(
        status || 500
      )
      .json({
        success:
          false,

        message:
          message ||
          "Object removal failed. Please try again.",
      });
  }
};

/* =====================================================
   REVIEW RESUME
   GENVIQ AI RESUME ANALYZER

   FREE USER:
   - 5 lifetime free resume reviews
   - Uses resume_analysis_used

   PRO USER:
   - No free quota restriction

   IMPORTANT:
   Usage is incremented ONLY after:
   1. Resume is successfully uploaded/read
   2. PDF text is successfully extracted
   3. Groq successfully analyzes the resume
   4. Review is successfully saved to Neon
===================================================== */

export const reviewResume = async (req, res) => {
  let localFilePath = null;

  try {
    console.log(
      "📄 Resume Review API hit"
    );

    /* =================================================
       AUTHENTICATED USER

       auth.js provides:

       req.userId
       req.plan
    ================================================= */

    const userId =
      req.userId;

    const plan =
      req.plan || "free";

    console.log(
      "User:",
      userId
    );

    console.log(
      "Plan:",
      plan
    );

    /* =================================================
       AUTH CHECK
    ================================================= */

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }

    /* =================================================
       FILE VALIDATION
    ================================================= */

    if (!req.file) {
      return res.status(400).json({
        success: false,

        message:
          "Please upload your resume.",
      });
    }

    localFilePath =
      req.file.path;

    console.log(
      "📁 Resume uploaded:",
      localFilePath
    );

    /* =================================================
       CHECK RESUME ANALYSIS QUOTA

       Checks ONLY:

       resume_analysis_used

       It does NOT affect:

       article_generation_used
       blog_title_used
       image_generation_used
       background_removal_used
       object_removal_used
    ================================================= */

    const access =
      await checkFeatureAccess({
        userId,

        plan,

        column:
          "resume_analysis_used",

        featureName:
          "Resume Analysis",
      });

    /* =================================================
       FREE LIMIT REACHED
    ================================================= */

    if (!access.allowed) {
      console.log(
        "⛔ Resume Analysis free quota exhausted"
      );

      /*
        Multer has already handled the upload,
        so remove the temporary file before returning.
      */

      if (
        localFilePath &&
        fs.existsSync(
          localFilePath
        )
      ) {
        try {
          fs.unlinkSync(
            localFilePath
          );

          localFilePath =
            null;

          console.log(
            "🧹 Temporary resume removed"
          );

        } catch (
          cleanupError
        ) {
          console.error(
            "⚠️ Resume cleanup failed:",
            cleanupError.message
          );
        }
      }

      return sendQuotaExceeded(
        res,

        "Resume Analysis",

        access.usage
      );
    }

    /* =================================================
       CURRENT USAGE
    ================================================= */

    if (plan === "free") {
      console.log(
        `🎁 Resume Analysis credits before review: ${access.usage.remaining}/${access.usage.limit}`
      );
    } else {
      console.log(
        "👑 Genviq Pro — Resume Analysis quota bypassed"
      );
    }

    /* =================================================
       VALIDATE FILE TYPE

       Your route uses:

       upload.single("resume")

       We expect a PDF resume.
    ================================================= */

    const mimeType =
      req.file.mimetype;

    console.log(
      "📎 Resume MIME type:",
      mimeType
    );

    if (
      mimeType !==
      "application/pdf"
    ) {
      if (
        localFilePath &&
        fs.existsSync(
          localFilePath
        )
      ) {
        try {
          fs.unlinkSync(
            localFilePath
          );

          localFilePath =
            null;

        } catch (
          cleanupError
        ) {
          console.error(
            "⚠️ Resume cleanup failed:",
            cleanupError.message
          );
        }
      }

      return res.status(400).json({
        success: false,

        message:
          "Please upload your resume as a PDF file.",
      });
    }

    /* =================================================
       READ PDF FILE
    ================================================= */

    console.log(
      "📖 Reading resume PDF..."
    );

    const pdfBuffer =
      fs.readFileSync(
        localFilePath
      );

    if (
      !pdfBuffer ||
      !pdfBuffer.length
    ) {
      throw new Error(
        "Uploaded resume file is empty."
      );
    }

    /* =================================================
       EXTRACT TEXT FROM PDF
    ================================================= */

    console.log(
      "🔍 Extracting text from resume..."
    );

    const pdfData =
      await pdf(
        pdfBuffer
      );

    const resumeText =
      pdfData?.text?.trim();

    if (!resumeText) {
      throw new Error(
        "Could not extract readable text from the resume. Please upload a text-based PDF."
      );
    }

    console.log(
      "✅ Resume text extracted"
    );

    console.log(
      "Resume characters:",
      resumeText.length
    );

    /* =================================================
       LIMIT INPUT SIZE

       Large PDFs can contain huge amounts of text.

       Resume analysis generally does not need unlimited
       document content, so cap the extracted text before
       sending it to the AI provider.
    ================================================= */

    const MAX_RESUME_CHARACTERS =
      30000;

    const safeResumeText =
      resumeText.slice(
        0,
        MAX_RESUME_CHARACTERS
      );

    /* =================================================
       BUILD RESUME REVIEW PROMPT
    ================================================= */

    const resumePrompt = `
You are an expert technical recruiter, resume reviewer, ATS specialist, and career advisor.

Analyze the following resume carefully.

RESUME:

${safeResumeText}

Provide a detailed, practical review using this structure:

## Overall Resume Score
Give a score out of 100 and briefly explain the score.

## Professional Summary
Evaluate the candidate's overall profile and how clearly the resume communicates their value.

## Strengths
Identify the strongest parts of the resume.

## Areas for Improvement
Identify specific weaknesses and explain exactly how they should be improved.

## ATS Analysis
Evaluate:
- ATS friendliness
- Keyword usage
- Section structure
- Formatting considerations
- Potential ATS problems

## Skills Analysis
Evaluate whether the listed technical and professional skills are presented effectively.

## Experience / Internship Analysis
Evaluate experience descriptions, impact, action verbs, metrics, and relevance.

If the candidate has little or no professional experience, evaluate projects and other relevant experience instead.

## Projects Analysis
Evaluate the quality and presentation of projects, technologies, descriptions, and measurable impact.

## Education Analysis
Evaluate how effectively education and academic achievements are presented.

## Missing or Weak Keywords
Suggest relevant keywords or skill terms that could strengthen the resume based only on the candidate's apparent field.

Do not invent experience or skills the candidate does not have.

## Bullet Point Improvements
Give concrete examples of how weak resume bullet points or descriptions could be rewritten more effectively.

## Top 5 Priority Improvements
Give the five most important changes the candidate should make first.

## Final Verdict
Give a concise recruiter-style assessment of the resume.

Important requirements:

- Be specific and constructive.
- Do not invent facts.
- Do not claim the candidate has experience that is not present.
- Focus on actionable improvements.
- Use clean Markdown formatting.
- Return only the resume analysis.
`;

    /* =================================================
       GENERATE REVIEW WITH GROQ
    ================================================= */

    console.log(
      "🤖 Analyzing resume with Groq..."
    );

    const completion =
      await AI.chat.completions.create({
        model:
          TEXT_AI_MODEL,

        messages: [
          {
            role:
              "system",

            content:
              "You are Genviq's expert resume analyzer, technical recruiter, ATS specialist, and career advisor. Give accurate, specific, constructive resume feedback without inventing candidate information.",
          },

          {
            role:
              "user",

            content:
              resumePrompt,
          },
        ],

        temperature:
          0.4,
      });

    /* =================================================
       EXTRACT AI REVIEW
    ================================================= */

    const content =
      completion?.choices?.[0]
        ?.message?.content
        ?.trim();

    if (!content) {
      throw new Error(
        "AI provider returned an empty resume review."
      );
    }

    console.log(
      "✅ Resume analyzed successfully"
    );

    /* =================================================
       SAVE REVIEW TO NEON

       Save BEFORE consuming a credit.

       If this fails:
       → user's Resume Analysis remains unchanged.
    ================================================= */

    const originalFileName =
      req.file.originalname ||
      "Resume";

    await sql`
      INSERT INTO creations (
        user_id,
        prompt,
        content,
        type
      )

      VALUES (
        ${userId},
        ${`Resume Review: ${originalFileName}`},
        ${content},
        'resume-review'
      )
    `;

    console.log(
      "💾 Resume review saved to Neon"
    );

    /* =================================================
       INCREMENT ONLY RESUME ANALYSIS USAGE

       Only now is one credit consumed.

       FREE:

       5/5
        ↓
       successful analysis
        ↓
       4/5

       All other counters remain unchanged.
    ================================================= */

    const updatedUsage =
      await incrementFeatureUsage(
        userId,

        plan,

        "resume_analysis_used"
      );

    /* =================================================
       CLEAN TEMPORARY RESUME

       The analysis is complete, so the temporary
       uploaded PDF is no longer needed.
    ================================================= */

    if (
      localFilePath &&
      fs.existsSync(
        localFilePath
      )
    ) {
      try {
        fs.unlinkSync(
          localFilePath
        );

        localFilePath =
          null;

        console.log(
          "🧹 Temporary resume removed"
        );

      } catch (
        cleanupError
      ) {
        console.error(
          "⚠️ Resume cleanup failed:",
          cleanupError.message
        );
      }
    }

    /* =================================================
       UPDATED USAGE LOG
    ================================================= */

    if (plan === "free") {
      console.log(
        `📊 Resume Analysis credits after review: ${updatedUsage.remaining}/${updatedUsage.limit}`
      );
    }

    /* =================================================
       SUCCESS RESPONSE

       Frontend receives:

       FREE example:

       {
         success: true,
         content: "...review...",
         plan: "free",

         usage: {
           used: 1,
           remaining: 4,
           limit: 5
         }
       }

       PRO:

       usage: {
         unlimited: true
       }
    ================================================= */

    return res.status(200).json({
      success:
        true,

      content,

      plan,

      usage:
        plan === "pro"
          ? {
              unlimited:
                true,
            }
          : {
              used:
                updatedUsage.used,

              remaining:
                updatedUsage.remaining,

              limit:
                updatedUsage.limit,
            },
    });

  } catch (error) {

    console.error(
      "❌ Resume Review Error:",
      error
    );

    /* =================================================
       CLEAN TEMP FILE ON ANY FAILURE

       Failed analysis does NOT consume quota.
    ================================================= */

    if (
      localFilePath &&
      fs.existsSync(
        localFilePath
      )
    ) {
      try {
        fs.unlinkSync(
          localFilePath
        );

        console.log(
          "🧹 Temporary resume removed after failure"
        );

      } catch (
        cleanupError
      ) {
        console.error(
          "⚠️ Resume cleanup failed:",
          cleanupError.message
        );
      }
    }

    /* =================================================
       AI PROVIDER ERRORS
    ================================================= */

    return handleAIProviderError(
      error,

      res,

      "Resume Review"
    );
  }
};