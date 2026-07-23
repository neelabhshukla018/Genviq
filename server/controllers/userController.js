import sql from '../configs/db.js';

export const getUserCreations = async (req, res) => {
  try {
    const { userId } = req.auth();

    const creations =
      await sql`SELECT * FROM creations WHERE user_id=${userId} ORDER BY created_at DESC`;

    res.json({ success: true, creations });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
export const getPublishedCreations = async (req, res) => {
  try {
    const creations = await sql`
      SELECT * FROM creations WHERE publish=true ORDER BY created_at DESC`;

    res.json({ success: true, creations });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
export const toggleLikeCreation = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const [creation] = await sql`SELECT * FROM creations WHERE id=${id}`;

    if (!creation) {
      return res.json({ success: false, message: 'No such creation exists' });
    }

    const currentLikes = creation.likes;
    const userIDStr = userId.toString();
    let updatedLikes;
    let message;

    if (currentLikes.includes(userIDStr)) {
      updatedLikes = currentLikes.filter((user) => user !== userIDStr);
      message = 'Creation Unliked';
      console.log(message);
    } else {
      updatedLikes = [...currentLikes, userIDStr];
      message = 'Creation Liked';
      console.log(message);
    }

    const formatedArray = `{${updatedLikes.join(',')}}`;
    await sql`UPDATE creations SET likes=${formatedArray}::text[] WHERE id=${id}`;

    console.log(message);
    res.json({ success: true, message });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};


/* =====================================================
   GET USER PLAN + AI USAGE
===================================================== */

export const getUserUsage = async (req, res) => {
  try {
    console.log("📊 Get User Usage API hit");

    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in.",
      });
    }

    /* ===============================================
       GET USER PLAN
    =============================================== */

    const [user] = await sql`
      SELECT
        plan,
        subscription_status
      FROM users
      WHERE clerk_user_id = ${userId}
      LIMIT 1
    `;

    /* ===============================================
       GET USAGE
    =============================================== */

    let [usage] = await sql`
      SELECT
        article_generation_used,
        blog_title_used,
        image_generation_used,
        background_removal_used,
        object_removal_used,
        resume_analysis_used
      FROM user_usage
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    /*
      Safety for existing users.

      If usage row somehow doesn't exist,
      create it automatically.
    */

    if (!usage) {
      [usage] = await sql`
        INSERT INTO user_usage (
          user_id
        )

        VALUES (
          ${userId}
        )

        RETURNING
          article_generation_used,
          blog_title_used,
          image_generation_used,
          background_removal_used,
          object_removal_used,
          resume_analysis_used
      `;
    }

    const FREE_LIMIT = 5;

    const makeUsage = (used = 0) => {
      const safeUsed = Number(used) || 0;

      return {
        used: safeUsed,

        remaining: Math.max(
          FREE_LIMIT - safeUsed,
          0
        ),

        limit: FREE_LIMIT,
      };
    };

    /* ===============================================
       RESPONSE
    =============================================== */

    const plan =
      user?.plan === "pro"
        ? "pro"
        : "free";

    return res.status(200).json({
      success: true,

      plan,

      subscriptionStatus:
        user?.subscription_status ||
        "inactive",

      usage: {
        article: makeUsage(
          usage.article_generation_used
        ),

        blogTitle: makeUsage(
          usage.blog_title_used
        ),

        image: makeUsage(
          usage.image_generation_used
        ),

        backgroundRemoval: makeUsage(
          usage.background_removal_used
        ),

        objectRemoval: makeUsage(
          usage.object_removal_used
        ),

        resumeReview: makeUsage(
          usage.resume_analysis_used
        ),
      },
    });

  } catch (error) {
    console.error(
      "❌ Get User Usage Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Unable to get user usage.",
    });
  }
};