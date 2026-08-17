import sql from "../configs/db.js";

export const auth = async (req, res, next) => {
  try {
    console.log("Entered auth middleware");

    const authData = req.auth();

    const { userId } = authData;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in.",
      });
    }


    console.log("👤 Clerk User ID:", userId);


    let [user] = await sql`
      SELECT
        clerk_user_id,
        plan,
        subscription_status
      FROM users
      WHERE clerk_user_id = ${userId}
      LIMIT 1
    `;


    if (!user) {
      console.log(
        "User not found in Neon. Creating free Tivion account..."
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
        "New Tivion free user created"
      );

      console.log(
        "Initial free credits: 5/5 for every tool"
      );
    }


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


    const plan =
      user?.plan === "pro"
        ? "pro"
        : "free";


    req.userId = userId;

    req.plan = plan;

    req.subscriptionStatus =
      user?.subscription_status ||
      "inactive";

    console.log(
      "Tivion Plan:",
      plan
    );

    console.log(
      "Subscription:",
      req.subscriptionStatus
    );

    next();

  } catch (error) {

    console.error(
      "Auth middleware error:"
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