import OpenAI from "openai";
import sql from "../configs/db.js";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";



if (!process.env.GROQ_API_KEY) {
  console.warn(
    "GROQ_API_KEY is missing. Text AI features will not work."
  );
}

const AI = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const TEXT_AI_MODEL = "llama-3.3-70b-versatile";


const FREE_USAGE_LIMIT = 5;


const USAGE_COLUMNS = new Set([
  "article_generation_used",
  "blog_title_used",
  "image_generation_used",
  "background_removal_used",
  "object_removal_used",
  "resume_analysis_used",
]);


const validateUsageColumn = (column) => {
  if (!USAGE_COLUMNS.has(column)) {
    throw new Error(
      `Invalid Tivion usage column: ${column}`
    );
  }
};


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


const getFeatureUsage = async (
  userId,
  column
) => {
  validateUsageColumn(column);

  await ensureUsageRecord(userId);

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
    `${featureName} usage: ${usage.used}/${usage.limit} used`
  );

  console.log(
    `${featureName} remaining: ${usage.remaining}/${usage.limit}`
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

const incrementFeatureUsage = async (
  userId,
  plan,
  column
) => {
  validateUsageColumn(column);


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
    ` Usage updated: ${usage.remaining}/${usage.limit} remaining`
  );

  return usage;
};


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
      `You have used all ${FREE_USAGE_LIMIT} free ${featureName} uses. Upgrade to Tivion Pro to continue.`,

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


export const generateArticle = async (req, res) => {
  try {
    console.log("Generate Article API hit");

 
    const userId = req.userId;

    const plan = req.plan || "free";

    const {
      prompt,
      length,
    } = req.body;

    console.log("User:", userId);
    console.log("Plan:", plan);

  

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }

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

    const access =
      await checkFeatureAccess({
        userId,

        plan,

        column:
          "article_generation_used",

        featureName:
          "Article Writing",
      });

    if (!access.allowed) {
      console.log(
        "Article free quota exhausted"
      );

      return sendQuotaExceeded(
        res,
        "Article Writing",
        access.usage
      );
    }

    if (plan === "free") {
      console.log(
        `Article credits before generation: ${access.usage.remaining}/${access.usage.limit}`
      );
    } else {
      console.log(
        "Tivion Pro — article quota bypassed"
      );
    }

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


    console.log(
      " Generating article with Groq..."
    );

    const completion =
      await AI.chat.completions.create({
        model:
          TEXT_AI_MODEL,

        messages: [
          {
            role: "system",

            content:
              "You are Tivion's professional AI writing assistant. Produce polished, useful, original articles based on the user's request.",
          },

          {
            role: "user",

            content:
              articlePrompt,
          },
        ],

        temperature: 0.7,
      });

  

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
      " Article generated successfully"
    );

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
      "Article saved to Neon"
    );

    const updatedUsage =
      await incrementFeatureUsage(
        userId,

        plan,

        "article_generation_used"
      );

    if (plan === "free") {
      console.log(
        `Article credits after generation: ${updatedUsage.remaining}/${updatedUsage.limit}`
      );
    }

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
      "Generate Article Error:",
      error
    );

    return handleAIProviderError(
      error,
      res,
      "Generate Article"
    );
  }
};

export const generateBlogTitle = async (req, res) => {
  try {
    console.log("Generate Blog Title API hit");

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


    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }


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

 
    const access =
      await checkFeatureAccess({
        userId,

        plan,

        column:
          "blog_title_used",

        featureName:
          "Blog Title Generation",
      });

    if (!access.allowed) {
      console.log(
        "Blog Title free quota exhausted"
      );

      return sendQuotaExceeded(
        res,

        "Blog Title Generation",

        access.usage
      );
    }


    if (plan === "free") {
      console.log(
        `Blog Title credits before generation: ${access.usage.remaining}/${access.usage.limit}`
      );
    } else {
      console.log(
        "Tivion Pro — Blog Title quota bypassed"
      );
    }

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


    console.log(
      "Generating blog titles with Groq..."
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
              "You are Tivion's professional blog title generator. Create concise, engaging, relevant, original blog title ideas.",
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
      " Blog titles saved to Neon"
    );

    const updatedUsage =
      await incrementFeatureUsage(
        userId,

        plan,

        "blog_title_used"
      );


    if (plan === "free") {
      console.log(
        `Blog Title credits after generation: ${updatedUsage.remaining}/${updatedUsage.limit}`
      );
    }

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
      "Generate Blog Title Error:",
      error
    );

    return handleAIProviderError(
      error,

      res,

      "Generate Blog Title"
    );
  }
};


export const generateImage = async (req, res) => {
  try {
    console.log(" Generate Image API hit");


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


    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }


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

    const access =
      await checkFeatureAccess({
        userId,

        plan,

        column:
          "image_generation_used",

        featureName:
          "Image Generation",
      });


    if (!access.allowed) {
      console.log(
        "Image Generation free quota exhausted"
      );

      return sendQuotaExceeded(
        res,

        "Image Generation",

        access.usage
      );
    }

    if (plan === "free") {
      console.log(
        `Image credits before generation: ${access.usage.remaining}/${access.usage.limit}`
      );
    } else {
      console.log(
        "Tivion Pro — Image Generation quota bypassed"
      );
    }

    const accountId =
      process.env.CLOUDFLARE_ACCOUNT_ID;

    const apiToken =
      process.env.CLOUDFLARE_API_TOKEN;

    console.log(
      " Cloudflare Account ID:",
      accountId
        ? " LOADED"
        : " MISSING"
    );

    console.log(
      " Cloudflare API Token:",
      apiToken
        ? " LOADED"
        : " MISSING"
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


    const model =
      process.env
        .CLOUDFLARE_IMAGE_MODEL ||
      "@cf/black-forest-labs/flux-1-schnell";


    const cloudflareUrl =
      `https://api.cloudflare.com/client/v4/accounts/` +
      `${accountId}/ai/run/${model}`;

    console.log(
      " Generating image with Cloudflare Workers AI..."
    );

    console.log(
      "Cloudflare model:",
      model
    );


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
          "Cloudflare response:",
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


    if (
      !imageResponse.data ||
      !imageResponse.data
        .byteLength
    ) {
      throw new Error(
        "Cloudflare returned an empty image."
      );
    }


    const contentType =
      imageResponse.headers[
        "content-type"
      ] ||
      "image/png";

    console.log(
      "Cloudflare response type:",
      contentType
    );


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
      "Cloudflare generated image successfully"
    );

    console.log(
      `Generated image size: ${imageSizeMB} MB`
    );

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

    const base64Image =
      `data:${imageMimeType};base64,` +
      imageBuffer.toString(
        "base64"
      );

    console.log(
      "Image converted for Cloudinary"
    );

    console.log(
      "Cloudinary configuration:"
    );

    console.log(
      "Cloud name:",
      process.env
        .CLOUDINARY_CLOUD_NAME
        ? "LOADED"
        : "MISSING"
    );

    console.log(
      "API key:",
      process.env
        .CLOUDINARY_API_KEY
        ? "LOADED"
        : "MISSING"
    );

    console.log(
      "API secret:",
      process.env
        .CLOUDINARY_API_SECRET
        ? "LOADED"
        : "MISSING"
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

    console.log(
      "Uploading generated image to Cloudinary..."
    );

    const uploadResult =
      await cloudinary.uploader.upload(
        base64Image,

        {
          folder:
            "Tivion/generated-images",

          resource_type:
            "image",
        }
      );

    const secureUrl =
      uploadResult?.secure_url;

    if (!secureUrl) {
      throw new Error(
        "Cloudinary did not return an image URL."
      );
    }

    console.log(
      "Cloudinary upload successful"
    );

    console.log(
      "Image URL:",
      secureUrl
    );


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
      "Generated image saved to Neon"
    );

    const updatedUsage =
      await incrementFeatureUsage(
        userId,

        plan,

        "image_generation_used"
      );


    if (plan === "free") {
      console.log(
        `Image credits after generation: ${updatedUsage.remaining}/${updatedUsage.limit}`
      );
    }

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
      "Generate Image Error"
    );

    console.error(
      "Full error:",
      error
    );

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


    if (status === 429) {
      return res
        .status(429)
        .json({
          success: false,

          message:
            "Image generation rate limit reached. Please try again shortly.",
        });
    }

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

export const removeImageBackground = async (req, res) => {
  let localFilePath = null;

  try {
    console.log(
      "Remove Image Background API hit"
    );


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


    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }


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


    const access =
      await checkFeatureAccess({
        userId,

        plan,

        column:
          "background_removal_used",

        featureName:
          "Background Removal",
      });

    if (!access.allowed) {
      console.log(
        "Background Removal free quota exhausted"
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

          console.log(
            "🧹 Temporary upload removed"
          );

        } catch (
          cleanupError
        ) {
          console.error(
            "Temporary file cleanup failed:",
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


    if (plan === "free") {
      console.log(
        `Background Removal credits before processing: ${access.usage.remaining}/${access.usage.limit}`
      );
    } else {
      console.log(
        "Tivion Pro — Background Removal quota bypassed"
      );
    }

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


    console.log(
      "Uploading image to Cloudinary..."
    );

    const uploadResult =
      await cloudinary.uploader.upload(
        localFilePath,

        {
          folder:
            "Tivion/background-removal",

          resource_type:
            "image",

          background_removal:
            "cloudinary_ai",
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
      "✅ Image uploaded successfully"
    );

    console.log(
      "Public ID:",
      uploadResult.public_id
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
      "Background removal result prepared"
    );

    console.log(
      "Result:",
      transformedUrl
    );


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
      "Background removal saved to Neon"
    );


    const updatedUsage =
      await incrementFeatureUsage(
        userId,

        plan,

        "background_removal_used"
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

        console.log(
          "Temporary upload removed"
        );

        localFilePath =
          null;

      } catch (
        cleanupError
      ) {
        console.error(
          "Temporary file cleanup failed:",
          cleanupError.message
        );
      }
    }


    if (plan === "free") {
      console.log(
        `Background Removal credits after processing: ${updatedUsage.remaining}/${updatedUsage.limit}`
      );
    }


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
      "Remove Background Error:",
      error
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

        console.log(
          "Temporary upload removed after failure"
        );

      } catch (
        cleanupError
      ) {
        console.error(
          "Temporary file cleanup failed:",
          cleanupError.message
        );
      }
    }

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


export const removeImageObject = async (req, res) => {
  let localFilePath = null;

  try {
    console.log(
      "🪄 Remove Image Object API hit"
    );

    const userId =
      req.userId;

    const plan =
      req.plan || "free";

    const {
      object,
      objectName,
      prompt,
    } = req.body;

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


    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }


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


    if (!objectToRemove) {

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
            "Temporary file cleanup failed:",
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

    const access =
      await checkFeatureAccess({
        userId,

        plan,

        column:
          "object_removal_used",

        featureName:
          "Object Removal",
      });

    if (!access.allowed) {
      console.log(
        "Object Removal free quota exhausted"
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
            "Temporary upload removed"
          );

        } catch (
          cleanupError
        ) {
          console.error(
            "Temporary file cleanup failed:",
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


    if (plan === "free") {
      console.log(
        `Object Removal credits before processing: ${access.usage.remaining}/${access.usage.limit}`
      );
    } else {
      console.log(
        "Tivion Pro — Object Removal quota bypassed"
      );
    }

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


    console.log(
      "Uploading image to Cloudinary..."
    );

    const uploadResult =
      await cloudinary.uploader.upload(
        localFilePath,

        {
          folder:
            "Tivion/object-removal",

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
      "Result:",
      transformedUrl
    );


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
      "Object removal saved to Neon"
    );


    const updatedUsage =
      await incrementFeatureUsage(
        userId,

        plan,

        "object_removal_used"
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
          "Temporary upload removed"
        );

      } catch (
        cleanupError
      ) {
        console.error(
          "Temporary file cleanup failed:",
          cleanupError.message
        );
      }
    }

    if (plan === "free") {
      console.log(
        `Object Removal credits after processing: ${updatedUsage.remaining}/${updatedUsage.limit}`
      );
    }

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
      "Remove Object Error:",
      error
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

        console.log(
          "Temporary upload removed after failure"
        );

      } catch (
        cleanupError
      ) {
        console.error(
          "Temporary file cleanup failed:",
          cleanupError.message
        );
      }
    }

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

export const reviewResume = async (req, res) => {
  let localFilePath = null;

  try {
    console.log(
      "Resume Review API hit"
    );

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

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }


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


    const access =
      await checkFeatureAccess({
        userId,

        plan,

        column:
          "resume_analysis_used",

        featureName:
          "Resume Analysis",
      });

    if (!access.allowed) {
      console.log(
        "Resume Analysis free quota exhausted"
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
            "Temporary resume removed"
          );

        } catch (
          cleanupError
        ) {
          console.error(
            "Resume cleanup failed:",
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

    if (plan === "free") {
      console.log(
        `Resume Analysis credits before review: ${access.usage.remaining}/${access.usage.limit}`
      );
    } else {
      console.log(
        "Tivion Pro — Resume Analysis quota bypassed"
      );
    }


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
            "Resume cleanup failed:",
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

    console.log(
      "Reading resume PDF..."
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


    console.log(
      "Extracting text from resume..."
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
      "Resume text extracted"
    );

    console.log(
      "Resume characters:",
      resumeText.length
    );


    const MAX_RESUME_CHARACTERS =
      30000;

    const safeResumeText =
      resumeText.slice(
        0,
        MAX_RESUME_CHARACTERS
      );

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


    console.log(
      "Analyzing resume with Groq..."
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
              "You are Tivion's expert resume analyzer, technical recruiter, ATS specialist, and career advisor. Give accurate, specific, constructive resume feedback without inventing candidate information.",
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
      "Resume analyzed successfully"
    );


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
      "Resume review saved to Neon"
    );



    const updatedUsage =
      await incrementFeatureUsage(
        userId,

        plan,

        "resume_analysis_used"
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
          "Temporary resume removed"
        );

      } catch (
        cleanupError
      ) {
        console.error(
          "Resume cleanup failed:",
          cleanupError.message
        );
      }
    }



    if (plan === "free") {
      console.log(
        `Resume Analysis credits after review: ${updatedUsage.remaining}/${updatedUsage.limit}`
      );
    }


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
      "Resume Review Error:",
      error
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

        console.log(
          "🧹 Temporary resume removed after failure"
        );

      } catch (
        cleanupError
      ) {
        console.error(
          "Resume cleanup failed:",
          cleanupError.message
        );
      }
    }

    return handleAIProviderError(
      error,

      res,

      "Resume Review"
    );
  }
};