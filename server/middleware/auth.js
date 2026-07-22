import { createClerkClient } from "@clerk/express";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export const auth = async (req, res, next) => {
  try {
    console.log("🔐 Entered auth middleware");

    const authData = req.auth();

    const { userId, has } = authData;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in.",
      });
    }

    // Must match your Clerk plan key
    const hasProPlan = has({
      plan: "pro_user",
    });

    console.log("User ID:", userId);
    console.log("Genviq Pro:", hasProPlan);

    const user = await clerkClient.users.getUser(userId);

    let freeUsage = user.privateMetadata?.free_usage ?? 0;

    if (hasProPlan) {
      // Pro users don't use the free quota
      freeUsage = 0;

      req.plan = "pro";
    } else {
      req.plan = "free";
    }

    req.free_usage = freeUsage;
    req.userId = userId;

    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};