import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware } from "@clerk/express";
import chalk from "chalk";


import aiRouter from "./routes/aiRoutes.js";
import userRouter from "./routes/userRoutes.js";
import subscriptionRouter from "./routes/subscriptionRoutes.js";


import {
  razorpaySubscriptionWebhook,
} from "./controllers/subscriptionWebhookController.js";


import connectCloudinary from "./configs/cloudinary.js";

import {
  testDatabaseConnection,
} from "./configs/db.js";


const app = express();


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


app.use(

  cors({

    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",

    credentials: true,

  })

);


app.post(

  "/api/subscription/webhook",

  express.raw({
    type: "application/json",
  }),

  razorpaySubscriptionWebhook

);


app.use(
  express.json()
);


app.use(
  clerkMiddleware()
);


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


app.get(
  "/",

  (
    req,
    res
  ) => {

    res.status(200).json({

      success: true,

      message:
        "🚀 Tivion API server is running.",

    });

  }
);


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


app.use(
  "/api/ai",

  aiRouter
);


app.use(
  "/api/user",

  userRouter
);


app.use(

  "/api/subscription",

  subscriptionRouter

);


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


app.get("/api/test-razorpay", async (req, res) => {
  try {
    const plans = await razorpay.plans.all({ count: 1 });

    return res.json({
      success: true,
      plans,
    });
  } catch (err) {
    console.error("========== RAZORPAY TEST ==========");
    console.error(err);
    console.error("Status:", err.statusCode);
    console.error("Message:", err.message);
    console.error("Error:", err.error);
    console.error("Stack:", err.stack);
    console.error("===================================");

    return res.status(500).json({
      success: false,
      status: err.statusCode,
      message: err.message,
      error: err.error,
    });
  }
});


const PORT =
  process.env.PORT ||
  3000;


app.listen(
  PORT,

  () => {

    console.log(

      chalk.green(

        `\n🌐 Tivion Server: http://localhost:${PORT}`

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

        "✨ Tivion backend started successfully."

      )

    );


    console.log(

      chalk.gray(

        "---------------------------------------------------\n"

      )

    );

  }
);