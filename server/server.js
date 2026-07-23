import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware } from "@clerk/express";
import chalk from "chalk";

/* =====================================================
   ROUTES
===================================================== */

import aiRouter from "./routes/aiRoutes.js";
import userRouter from "./routes/userRoutes.js";
import subscriptionRouter from "./routes/subscriptionRoutes.js";

/* =====================================================
   WEBHOOK CONTROLLER
===================================================== */

import {
  razorpaySubscriptionWebhook,
} from "./controllers/subscriptionWebhookController.js";

/* =====================================================
   CONFIGS
===================================================== */

import connectCloudinary from "./configs/cloudinary.js";

/* =====================================================
   DATABASE
===================================================== */

import {
  testDatabaseConnection,
} from "./configs/db.js";


/* =====================================================
   EXPRESS APP
===================================================== */

const app = express();


/* =====================================================
   ENVIRONMENT CHECK
===================================================== */

console.log(
  "\n========== ENVIRONMENT CHECK =========="
);

console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL
    ? "✅ LOADED"
    : "❌ MISSING"
);

console.log(
  "CLERK_PUBLISHABLE_KEY:",

  process.env.CLERK_PUBLISHABLE_KEY

    ? `✅ LOADED (${process.env.CLERK_PUBLISHABLE_KEY.substring(
        0,
        7
      )}...)`

    : "❌ MISSING"
);

console.log(
  "CLERK_SECRET_KEY:",

  process.env.CLERK_SECRET_KEY
    ? "✅ LOADED"
    : "❌ MISSING"
);

console.log(
  "GROQ_API_KEY:",

  process.env.GROQ_API_KEY
    ? "✅ LOADED"
    : "❌ MISSING"
);


/* =====================================================
   RAZORPAY ENVIRONMENT CHECK

   We only check whether values exist.

   NEVER print secrets into the terminal.
===================================================== */

console.log(
  "RAZORPAY_KEY_ID:",

  process.env.RAZORPAY_KEY_ID
    ? "✅ LOADED"
    : "❌ MISSING"
);

console.log(
  "RAZORPAY_KEY_SECRET:",

  process.env.RAZORPAY_KEY_SECRET
    ? "✅ LOADED"
    : "❌ MISSING"
);

console.log(
  "RAZORPAY_PLAN_ID:",

  process.env.RAZORPAY_PLAN_ID
    ? "✅ LOADED"
    : "❌ MISSING"
);

console.log(
  "RAZORPAY_WEBHOOK_SECRET:",

  process.env.RAZORPAY_WEBHOOK_SECRET
    ? "✅ LOADED"
    : "⚠️ NOT CONFIGURED YET"
);

console.log(
  "=======================================\n"
);


/* =====================================================
   TEST NEON DATABASE
===================================================== */

try {

  await testDatabaseConnection();

} catch (error) {

  console.error(
    chalk.red(
      "❌ Failed to verify Neon database:"
    )
  );

  console.error(
    error.message
  );

  process.exit(1);

}


/* =====================================================
   CONNECT CLOUDINARY
===================================================== */

try {

  await connectCloudinary();

  console.log(
    chalk.blueBright(
      "☁️ Cloudinary connection established successfully."
    )
  );

} catch (error) {

  console.error(
    chalk.red(
      "❌ Failed to connect to Cloudinary:"
    ),

    error.message
  );

  process.exit(1);

}


/* =====================================================
   CORS

   Allows your React/Vite frontend to communicate
   with the Genviq backend.

   Example development client:

   http://localhost:5173
===================================================== */

app.use(

  cors({

    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",

    credentials: true,

  })

);


/* =====================================================
   RAZORPAY WEBHOOK

   IMPORTANT:

   THIS ROUTE MUST COME BEFORE:

   app.use(express.json());

   WHY?

   Razorpay signs the exact raw HTTP request body.

   If express.json() parses the body first, the original
   raw bytes may no longer be available for signature
   verification.

   express.raw() preserves the exact request body.

   Razorpay calls this endpoint directly.

   Clerk authentication is NOT used for this endpoint.

   Authentication is performed using:

   x-razorpay-signature

   +

   RAZORPAY_WEBHOOK_SECRET
===================================================== */

app.post(

  "/api/subscription/webhook",

  express.raw({
    type: "application/json",
  }),

  razorpaySubscriptionWebhook

);


/* =====================================================
   JSON BODY PARSER

   Used by:

   /api/ai

   /api/user

   /api/subscription/create

   /api/subscription/verify


   IMPORTANT:

   Razorpay webhook is registered ABOVE this middleware
   so that its raw body remains available for signature
   verification.
===================================================== */

app.use(
  express.json()
);


/* =====================================================
   CLERK MIDDLEWARE

   Clerk is now used ONLY for authentication.

   Clerk Billing is NOT used.

   Clerk gives us:

   req.auth()

   which allows our auth middleware to obtain:

   userId


   IMPORTANT:

   Razorpay webhook is registered before this middleware
   because Razorpay itself calls the webhook.

   Razorpay does not have a Clerk session.
===================================================== */

app.use(
  clerkMiddleware()
);


/* =====================================================
   REQUEST LOGGER
===================================================== */

app.use(
  (
    req,
    res,
    next
  ) => {

    console.log(

      chalk.magenta(

        `🚀 ${req.method} ${req.originalUrl}`

      )

    );

    next();

  }
);


/* =====================================================
   BASIC ROUTE
===================================================== */

app.get(
  "/",

  (
    req,
    res
  ) => {

    res.status(200).json({

      success: true,

      message:
        "🚀 Genviq API server is running.",

    });

  }
);


/* =====================================================
   HEALTH CHECK

   URL:

   GET /api/health

   Local example:

   http://localhost:3000/api/health
===================================================== */

app.get(
  "/api/health",

  (
    req,
    res
  ) => {

    res.status(200).json({

      success: true,

      server:
        "online",

      database:
        "configured",

      razorpay:
        process.env.RAZORPAY_KEY_ID &&
        process.env.RAZORPAY_KEY_SECRET &&
        process.env.RAZORPAY_PLAN_ID

          ? "configured"

          : "missing_configuration",

      webhook:
        process.env.RAZORPAY_WEBHOOK_SECRET

          ? "configured"

          : "not_configured",

      timestamp:
        new Date().toISOString(),

    });

  }
);


/* =====================================================
   AI ROUTES

   Base:

   /api/ai


   Examples:

   POST /api/ai/generate-article

   POST /api/ai/generate-blog-title

   POST /api/ai/generate-image

   POST /api/ai/remove-image-background

   POST /api/ai/remove-image-object

   POST /api/ai/resume-review
===================================================== */

app.use(
  "/api/ai",

  aiRouter
);


/* =====================================================
   USER ROUTES

   Base:

   /api/user


   Includes:

   User creations

   Published creations

   Likes

   User plan

   AI usage / 5-credit counters
===================================================== */

app.use(
  "/api/user",

  userRouter
);


/* =====================================================
   GENVIQ PRO / RAZORPAY SUBSCRIPTION ROUTES

   Base:

   /api/subscription


   AUTHENTICATED ENDPOINTS:


   1.

   POST /api/subscription/create


   FLOW:

   React frontend

        ↓

   User clicks:

   Upgrade to Genviq Pro

        ↓

   POST /api/subscription/create

        ↓

   Clerk Authentication

        ↓

   auth middleware

        ↓

   req.userId

        ↓

   subscriptionController

        ↓

   Razorpay creates subscription

        ↓

   Razorpay uses:

   RAZORPAY_PLAN_ID

        ↓

   Neon stores:

   razorpay_subscription_id

   subscription_status = "created"


   IMPORTANT:

   Creating the Razorpay subscription does NOT
   automatically make the user Pro.


   =====================================================


   2.

   POST /api/subscription/verify


   FLOW:

   User completes Razorpay Checkout

        ↓

   Razorpay returns:

   razorpay_payment_id

   razorpay_subscription_id

   razorpay_signature

        ↓

   Frontend sends them to:

   POST /api/subscription/verify

        ↓

   Clerk Authentication

        ↓

   Verify Razorpay signature

        ↓

   Verify subscription belongs to user

        ↓

   Fetch real subscription from Razorpay

        ↓

   Confirm valid subscription state

        ↓

   Neon:

   plan = "pro"

   subscription_status =
   "authenticated" / "active"


   =====================================================


   WEBHOOK:

   POST /api/subscription/webhook


   NOTE:

   The webhook route is NOT handled by this router.

   It was registered directly ABOVE express.json():

   app.post(
     "/api/subscription/webhook",
     express.raw(...),
     razorpaySubscriptionWebhook
   );

   This is required for correct Razorpay webhook
   signature verification.
===================================================== */

app.use(

  "/api/subscription",

  subscriptionRouter

);


/* =====================================================
   CURRENT RAZORPAY ARCHITECTURE


   CLERK
   ─────────────────────────────────────────────────────

   Authentication only

   Clerk provides:

   userId


                    ↓


   NEON POSTGRESQL
   ─────────────────────────────────────────────────────

   users table:

   clerk_user_id

   plan

   subscription_status

   razorpay_customer_id

   razorpay_subscription_id

   current_period_start

   current_period_end


   user_usage table:

   article_generation_used

   blog_title_used

   image_generation_used

   background_removal_used

   object_removal_used

   resume_analysis_used


                    ↓


   RAZORPAY
   ─────────────────────────────────────────────────────

   Genviq Pro

   ₹49 / month

   Razorpay handles:

   Subscription creation

   Checkout

   Recurring payments

   Subscription lifecycle

   Webhook events


                    ↓


   GENVIQ PRO ACCESS
   ─────────────────────────────────────────────────────

   Neon is the source of truth for application access.

   plan = "free"

   OR

   plan = "pro"


   Clerk Billing is NOT used.
===================================================== */


/* =====================================================
   RAZORPAY WEBHOOK FLOW


   Razorpay

        ↓

   POST /api/subscription/webhook

        ↓

   express.raw({
     type: "application/json"
   })

        ↓

   Preserve exact raw request bytes

        ↓

   Read:

   x-razorpay-signature

        ↓

   Verify using:

   RAZORPAY_WEBHOOK_SECRET

        ↓

   Signature valid?

        ↓ YES

   Parse webhook JSON

        ↓

   Read:

   webhook.event

   webhook.payload.subscription.entity

        ↓

   Find Neon user using:

   razorpay_subscription_id

        ↓

   Synchronize Genviq plan
===================================================== */


/* =====================================================
   RAZORPAY SUBSCRIPTION EVENTS


   subscription.activated

        ↓

   plan = "pro"

   subscription_status = "active"


   -----------------------------------------------------


   subscription.charged

        ↓

   Recurring payment succeeded

        ↓

   Keep:

   plan = "pro"

   Refresh billing period


   -----------------------------------------------------


   subscription.authenticated

        ↓

   Initial subscription authentication completed

        ↓

   Record Razorpay state


   -----------------------------------------------------


   subscription.pending

        ↓

   Payment may require attention

        ↓

   Record pending state


   -----------------------------------------------------


   subscription.halted

        ↓

   Recurring payment problems / halted subscription

        ↓

   plan = "free"

   subscription_status = "halted"


   -----------------------------------------------------


   subscription.cancelled

        ↓

   If paid billing period remains:

   Keep Pro until current_period_end

   Otherwise:

   plan = "free"


   -----------------------------------------------------


   subscription.completed

        ↓

   Subscription billing lifecycle completed

        ↓

   plan = "free"


   -----------------------------------------------------


   subscription.paused

        ↓

   plan = "free"


   -----------------------------------------------------


   subscription.resumed

        ↓

   plan = "pro"
===================================================== */


/* =====================================================
   SECURITY RULES


   1.

   RAZORPAY_KEY_SECRET

   MUST NEVER be sent to the frontend.


   2.

   RAZORPAY_WEBHOOK_SECRET

   MUST NEVER be sent to the frontend.


   3.

   Frontend must NEVER decide:

   plan = "pro"


   4.

   Frontend must NEVER send a custom subscription price.


   5.

   ₹49 pricing comes from:

   RAZORPAY_PLAN_ID


   6.

   Razorpay payment signatures are verified server-side.


   7.

   Razorpay webhook signatures are verified server-side.


   8.

   Neon stores the final Genviq application plan state.
===================================================== */


/* =====================================================
   404 HANDLER

   Must remain AFTER all valid routes.

   Any request that reaches this point did not match:

   /

   /api/health

   /api/ai/*

   /api/user/*

   /api/subscription/*
===================================================== */

app.use(
  (
    req,
    res
  ) => {

    res.status(404).json({

      success: false,

      message:
        `Route not found: ${req.method} ${req.originalUrl}`,

    });

  }
);


/* =====================================================
   GLOBAL ERROR HANDLER

   Must remain after routes + 404 handler.
===================================================== */

app.use(
  (
    err,
    req,
    res,
    next
  ) => {

    console.error(

      chalk.red(
        "⚠️ Server Error:"
      ),

      err.message

    );


    if (
      process.env.NODE_ENV !==
      "production"
    ) {

      console.error(
        err.stack
      );

    }


    res
      .status(
        err.status ||
        500
      )
      .json({

        success: false,

        message:

          process.env.NODE_ENV ===
          "production"

            ? "Something went wrong on the server."

            : err.message,

      });

  }
);


/* =====================================================
   START SERVER
===================================================== */

const PORT =
  process.env.PORT ||
  3000;


app.listen(
  PORT,

  () => {

    console.log(

      chalk.green(

        `\n🌐 Genviq Server: http://localhost:${PORT}`

      )

    );


    console.log(

      chalk.green(

        `💚 Health Check: http://localhost:${PORT}/api/health`

      )

    );


    console.log(

      chalk.green(

        `💳 Create Subscription: http://localhost:${PORT}/api/subscription/create`

      )

    );


    console.log(

      chalk.green(

        `🔐 Verify Subscription: http://localhost:${PORT}/api/subscription/verify`

      )

    );


    console.log(

      chalk.green(

        `📩 Razorpay Webhook: http://localhost:${PORT}/api/subscription/webhook`

      )

    );


    console.log(

      chalk.gray(

        "---------------------------------------------------"

      )

    );


    console.log(

      chalk.cyan(

        "✨ Genviq backend started successfully."

      )

    );


    console.log(

      chalk.gray(

        "---------------------------------------------------\n"

      )

    );

  }
);