import sql from "../configs/db.js";

/* =====================================================
   GENVIQ AUTH MIDDLEWARE

   Clerk:
   - Authentication only
   - Provides userId

   Neon:
   - Stores plan
   - Stores subscription status

   Clerk Billing is NOT used.
===================================================== */

export const auth = async (req, res, next) => {
  try {
    console.log("🔐 Entered auth middleware");

    /* =================================================
       1. GET CLERK AUTHENTICATED USER
    ================================================= */

    const authData = req.auth();

    const { userId } = authData;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in.",
      });
    }

    console.log("👤 Clerk User ID:", userId);

    /* =================================================
       2. FIND USER IN NEON
    ================================================= */

    let [user] = await sql`
      SELECT
        clerk_user_id,
        plan,
        subscription_status
      FROM users
      WHERE clerk_user_id = ${userId}
      LIMIT 1
    `;

    /* =================================================
       3. CREATE USER IF FIRST TIME

       Every new user starts on FREE.

       Usage counters will start at 0,
       meaning they have 5/5 available.
    ================================================= */

    if (!user) {
      console.log(
        "🆕 User not found in Neon. Creating free Genviq account..."
      );

      [user] = await sql`
        INSERT INTO users (
          clerk_user_id,
          plan,
          subscription_status
        )

        VALUES (
          ${userId},
          'free',
          'inactive'
        )

        RETURNING
          clerk_user_id,
          plan,
          subscription_status
      `;

      /* ===============================================
         CREATE USAGE RECORD

         0 used = 5/5 remaining
      =============================================== */

      await sql`
        INSERT INTO user_usage (
          user_id,
          image_generation_used,
          resume_analysis_used,
          object_removal_used,
          background_removal_used,
          article_generation_used,
          blog_title_used
        )

        VALUES (
          ${userId},
          0,
          0,
          0,
          0,
          0,
          0
        )

        ON CONFLICT (user_id)
        DO NOTHING
      `;

      console.log(
        "✅ New Genviq free user created"
      );

      console.log(
        "🎁 Initial free credits: 5/5 for every tool"
      );
    }

    /* =================================================
       4. MAKE SURE USAGE RECORD EXISTS

       This is important for existing users who were
       created before we introduced user_usage.
    ================================================= */

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

    /* =================================================
       5. NORMALIZE PLAN
    ================================================= */

    const plan =
      user?.plan === "pro"
        ? "pro"
        : "free";

    /* =================================================
       6. ATTACH USER DATA TO REQUEST
    ================================================= */

    req.userId = userId;

    req.plan = plan;

    req.subscriptionStatus =
      user?.subscription_status ||
      "inactive";

    /* =================================================
       7. DEBUG LOG
    ================================================= */

    console.log(
      "📦 Genviq Plan:",
      plan
    );

    console.log(
      "💳 Subscription:",
      req.subscriptionStatus
    );

    next();

  } catch (error) {

    console.error(
      "❌ Auth middleware error:"
    );

    console.error(error);

    return res.status(500).json({
      success: false,

      message:
        "Authentication failed. Please try again.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};