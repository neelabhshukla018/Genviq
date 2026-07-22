import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";

/* =====================================================
   AI CONFIGURATION
===================================================== */

const AI = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

/* =====================================================
   CONSTANTS
===================================================== */

const FREE_USAGE_LIMIT = 10;

/* =====================================================
   GENERATE ARTICLE
===================================================== */

export const generateArticle = async (req, res) => {
  try {
    console.log("📝 Generate Article API hit");

    const { userId } = req.auth();

    const { prompt, length } = req.body;

    const plan = req.plan;
    const free_usage = req.free_usage ?? 0;

    console.log("User:", userId);
    console.log("Plan:", plan);
    console.log("Free usage:", free_usage);

    /* -----------------------------------------
       FREE PLAN LIMIT
    ----------------------------------------- */

    if (plan !== "pro" && free_usage >= FREE_USAGE_LIMIT) {
      return res.status(403).json({
        success: false,
        message:
          "Free usage limit reached. Upgrade to Genviq Pro to continue.",
      });
    }

    /* -----------------------------------------
       GENERATE ARTICLE
    ----------------------------------------- */

    const response = await AI.chat.completions.create({
      model: "gemini-2.5-flash",

      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],

      temperature: 0.7,

      max_tokens: length,
    });

    const content =
      response.choices?.[0]?.message?.content ||
      "No content returned.";

    /* -----------------------------------------
       SAVE CREATION
    ----------------------------------------- */

    await sql`
      INSERT INTO creations(
        user_id,
        prompt,
        content,
        type
      )
      VALUES(
        ${userId},
        ${prompt},
        ${content},
        'article'
      )
    `;

    /* -----------------------------------------
       UPDATE FREE USAGE
    ----------------------------------------- */

    if (plan !== "pro") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    return res.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error("❌ Generate Article Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   GENERATE BLOG TITLE
===================================================== */

export const generateBlogTitle = async (req, res) => {
  try {
    console.log("✍️ Generate Blog Title API hit");

    const { userId } = req.auth();

    const { prompt } = req.body;

    const plan = req.plan;
    const free_usage = req.free_usage ?? 0;

    console.log("User:", userId);
    console.log("Plan:", plan);
    console.log("Free usage:", free_usage);

    /* -----------------------------------------
       FREE PLAN LIMIT
    ----------------------------------------- */

    if (plan !== "pro" && free_usage >= FREE_USAGE_LIMIT) {
      return res.status(403).json({
        success: false,
        message:
          "Free usage limit reached. Upgrade to Genviq Pro to continue.",
      });
    }

    /* -----------------------------------------
       GENERATE TITLE
    ----------------------------------------- */

    const response = await AI.chat.completions.create({
      model: "gemini-2.5-flash",

      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],

      temperature: 0.7,

      max_tokens: 100,
    });

    const content =
      response.choices?.[0]?.message?.content ||
      "No content returned.";

    /* -----------------------------------------
       SAVE CREATION
    ----------------------------------------- */

    await sql`
      INSERT INTO creations(
        user_id,
        prompt,
        content,
        type
      )
      VALUES(
        ${userId},
        ${prompt},
        ${content},
        'blog-title'
      )
    `;

    /* -----------------------------------------
       UPDATE FREE USAGE
    ----------------------------------------- */

    if (plan !== "pro") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    console.log("✅ Blog title generated successfully");

    return res.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error("❌ Generate Blog Title Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   GENERATE IMAGE
   GENVIQ PRO ONLY
===================================================== */

export const generateImage = async (req, res) => {
  try {
    console.log("🎨 Generate Image API hit");

    const { userId } = req.auth();

    const { prompt, publish } = req.body;

    const plan = req.plan;

    console.log("User:", userId);
    console.log("Plan:", plan);

    /* -----------------------------------------
       PRO CHECK
    ----------------------------------------- */

    if (plan !== "pro") {
      return res.status(403).json({
        success: false,
        message:
          "AI Image Generation is available with Genviq Pro.",
      });
    }

    /* -----------------------------------------
       GENERATE IMAGE
    ----------------------------------------- */

    const formData = new FormData();

    formData.append("prompt", prompt);

    const { data } = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",

      formData,

      {
        headers: {
          "x-api-key": process.env.CLIPDROP_API_KEY,
        },

        responseType: "arraybuffer",
      }
    );

    /* -----------------------------------------
       CONVERT IMAGE
    ----------------------------------------- */

    const base64Image =
      `data:image/png;base64,${Buffer.from(
        data,
        "binary"
      ).toString("base64")}`;

    /* -----------------------------------------
       UPLOAD TO CLOUDINARY
    ----------------------------------------- */

    const { secure_url } =
      await cloudinary.uploader.upload(base64Image);

    /* -----------------------------------------
       SAVE CREATION
    ----------------------------------------- */

    await sql`
      INSERT INTO creations(
        user_id,
        prompt,
        content,
        type,
        publish
      )
      VALUES(
        ${userId},
        ${prompt},
        ${secure_url},
        'image',
        ${publish ?? false}
      )
    `;

    return res.json({
      success: true,
      content: secure_url,
    });
  } catch (error) {
    console.error("❌ Generate Image Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   REMOVE IMAGE BACKGROUND
   GENVIQ PRO ONLY
===================================================== */

export const removeImageBackground = async (req, res) => {
  try {
    console.log("🖼️ Remove Background API hit");

    const { userId } = req.auth();

    const image = req.file;

    const plan = req.plan;

    console.log("User:", userId);
    console.log("Plan:", plan);

    /* -----------------------------------------
       PRO CHECK
    ----------------------------------------- */

    if (plan !== "pro") {
      return res.status(403).json({
        success: false,
        message:
          "Background Removal is available with Genviq Pro.",
      });
    }

    /* -----------------------------------------
       FILE CHECK
    ----------------------------------------- */

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image.",
      });
    }

    /* -----------------------------------------
       CLOUDINARY BACKGROUND REMOVAL
    ----------------------------------------- */

    const { secure_url } =
      await cloudinary.uploader.upload(image.path, {
        transformation: [
          {
            effect: "background_removal",

            background_removal:
              "remove_the_background",
          },
        ],
      });

    /* -----------------------------------------
       SAVE CREATION
    ----------------------------------------- */

    await sql`
      INSERT INTO creations(
        user_id,
        prompt,
        content,
        type
      )
      VALUES(
        ${userId},
        'Remove Background from the image',
        ${secure_url},
        'image'
      )
    `;

    return res.json({
      success: true,
      content: secure_url,
    });
  } catch (error) {
    console.error(
      "❌ Remove Background Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   REMOVE IMAGE OBJECT
   GENVIQ PRO ONLY
===================================================== */

export const removeImageObject = async (req, res) => {
  try {
    console.log("🪄 Remove Object API hit");

    const { userId } = req.auth();

    const { object } = req.body;

    const image = req.file;

    const plan = req.plan;

    console.log("User:", userId);
    console.log("Plan:", plan);

    /* -----------------------------------------
       PRO CHECK
    ----------------------------------------- */

    if (plan !== "pro") {
      return res.status(403).json({
        success: false,
        message:
          "Object Removal is available with Genviq Pro.",
      });
    }

    /* -----------------------------------------
       VALIDATION
    ----------------------------------------- */

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image.",
      });
    }

    if (!object) {
      return res.status(400).json({
        success: false,
        message:
          "Please specify the object you want to remove.",
      });
    }

    /* -----------------------------------------
       UPLOAD ORIGINAL IMAGE
    ----------------------------------------- */

    const { public_id } =
      await cloudinary.uploader.upload(image.path);

    /* -----------------------------------------
       GENERATIVE OBJECT REMOVAL
    ----------------------------------------- */

    const imageUrl = cloudinary.url(public_id, {
      transformation: [
        {
          effect: `gen_remove:${object}`,
        },
      ],

      resource_type: "image",
    });

    /* -----------------------------------------
       SAVE CREATION
    ----------------------------------------- */

    await sql`
      INSERT INTO creations(
        user_id,
        prompt,
        content,
        type
      )
      VALUES(
        ${userId},
        ${`Remove ${object} from this image`},
        ${imageUrl},
        'image'
      )
    `;

    return res.json({
      success: true,
      content: imageUrl,
    });
  } catch (error) {
    console.error(
      "❌ Remove Object Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   REVIEW RESUME
   GENVIQ PRO ONLY
===================================================== */

export const reviewResume = async (req, res) => {
  try {
    console.log("📄 Resume Review API hit");

    const { userId } = req.auth();

    const resume = req.file;

    const plan = req.plan;

    console.log("User:", userId);
    console.log("Plan:", plan);

    /* -----------------------------------------
       PRO CHECK
    ----------------------------------------- */

    if (plan !== "pro") {
      return res.status(403).json({
        success: false,
        message:
          "Advanced Resume Review is available with Genviq Pro.",
      });
    }

    /* -----------------------------------------
       FILE CHECK
    ----------------------------------------- */

    if (!resume) {
      return res.status(400).json({
        success: false,
        message: "Please upload your resume.",
      });
    }

    /* -----------------------------------------
       FILE SIZE LIMIT
    ----------------------------------------- */

    if (resume.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,

        message:
          "Resume file size exceeds the allowed size of 5MB.",
      });
    }

    /* -----------------------------------------
       READ PDF
    ----------------------------------------- */

    const dataBuffer =
      fs.readFileSync(resume.path);

    const pdfData =
      await pdf(dataBuffer);

    /* -----------------------------------------
       AI PROMPT
    ----------------------------------------- */

    const prompt = `
Review the following resume and provide constructive,
professional feedback.

Analyze:

1. Overall resume quality
2. Strengths
3. Weaknesses
4. Skills presentation
5. Experience presentation
6. ATS optimization
7. Areas for improvement
8. Actionable recommendations

Resume Content:

${pdfData.text}
`;

    /* -----------------------------------------
       GENERATE REVIEW
    ----------------------------------------- */

    const response =
      await AI.chat.completions.create({
        model: "gemini-2.5-flash",

        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.7,

        max_tokens: 1000,
      });

    const content =
      response.choices?.[0]?.message?.content ||
      "No content returned.";

    /* -----------------------------------------
       SAVE CREATION
    ----------------------------------------- */

    await sql`
      INSERT INTO creations(
        user_id,
        prompt,
        content,
        type
      )
      VALUES(
        ${userId},
        'Review the uploaded resume',
        ${content},
        'resume-review'
      )
    `;

    return res.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error(
      "❌ Resume Review Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};