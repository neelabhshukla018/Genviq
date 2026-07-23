import razorpay from "../configs/razorpay.js";
import sql from "../configs/db.js";
import crypto from "crypto";

/* =====================================================
   HELPER — CONVERT RAZORPAY UNIX TIME TO JS DATE
===================================================== */

const razorpayTimestampToDate = (timestamp) => {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000);
};

/* =====================================================
   HELPER — ACTIVATE / SYNC PRO IN NEON

   IMPORTANT:

   Only call this after the subscription has been fetched
   directly from Razorpay server-side and verified as:

   authenticated
   OR
   active
===================================================== */

const syncProSubscription = async (
  userId,
  subscription
) => {
  const periodStart =
    razorpayTimestampToDate(
      subscription.current_start
    );

  const periodEnd =
    razorpayTimestampToDate(
      subscription.current_end
    );

  const [updatedUser] = await sql`
    UPDATE users

    SET
      plan = 'pro',

      subscription_status =
        ${subscription.status},

      razorpay_subscription_id =
        ${subscription.id},

      current_period_start =
        ${periodStart},

      current_period_end =
        ${periodEnd},

      updated_at =
        CURRENT_TIMESTAMP

    WHERE clerk_user_id =
      ${userId}

    RETURNING
      clerk_user_id,
      plan,
      subscription_status,
      razorpay_subscription_id,
      current_period_start,
      current_period_end
  `;

  return updatedUser;
};

/* =====================================================
   CREATE GENVIQ PRO SUBSCRIPTION

   FLOW:

   Clerk authenticated user
          ↓
   Check Neon
          ↓
   Check existing Razorpay subscription
          ↓

   If Razorpay says ACTIVE/AUTHENTICATED:
      Sync Neon → PRO

   If CREATED/PENDING:
      Reuse existing subscription

   Otherwise:
      Create new Razorpay subscription
===================================================== */

export const createSubscription = async (
  req,
  res
) => {
  try {
    console.log(
      "💳 Create Genviq Pro subscription request received"
    );

    /* =================================================
       1. AUTHENTICATED USER
    ================================================= */

    const userId =
      req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Unauthorized. Please sign in.",
      });
    }

    console.log(
      "👤 Subscription user:",
      userId
    );

    /* =================================================
       2. CHECK RAZORPAY CONFIG
    ================================================= */

    const razorpayPlanId =
      process.env.RAZORPAY_PLAN_ID;

    if (!razorpayPlanId) {
      console.error(
        "❌ RAZORPAY_PLAN_ID missing"
      );

      return res.status(500).json({
        success: false,

        message:
          "Razorpay subscription plan is not configured.",
      });
    }

    /* =================================================
       3. GET USER FROM NEON
    ================================================= */

    const [user] = await sql`
      SELECT
        clerk_user_id,
        email,
        plan,
        subscription_status,
        razorpay_customer_id,
        razorpay_subscription_id,
        current_period_start,
        current_period_end

      FROM users

      WHERE clerk_user_id =
        ${userId}

      LIMIT 1
    `;

    if (!user) {
      return res.status(404).json({
        success: false,

        message:
          "Genviq user account was not found.",
      });
    }

    console.log(
      "📦 Neon Plan:",
      user.plan
    );

    console.log(
      "📦 Neon Subscription Status:",
      user.subscription_status
    );

    /* =================================================
       4. USER ALREADY PRO

       No new Razorpay subscription should be created.
    ================================================= */

    if (
      user.plan === "pro" &&
      [
        "active",
        "authenticated",
      ].includes(
        user.subscription_status
      )
    ) {
      console.log(
        "👑 User already has Genviq Pro"
      );

      return res.status(409).json({
        success: false,

        alreadyPro: true,

        plan: "pro",

        subscriptionStatus:
          user.subscription_status,

        message:
          "You already have an active Genviq Pro subscription.",
      });
    }

    /* =================================================
       5. CHECK EXISTING RAZORPAY SUBSCRIPTION

       This fixes the exact situation where:

       Razorpay = active

       but

       Neon = free / created
    ================================================= */

    if (
      user.razorpay_subscription_id
    ) {
      console.log(
        "🔎 Checking existing Razorpay subscription:",
        user.razorpay_subscription_id
      );

      try {
        const existingSubscription =
          await razorpay.subscriptions.fetch(
            user.razorpay_subscription_id
          );

        console.log(
          "📊 Existing Razorpay Status:",
          existingSubscription.status
        );

        /* =============================================
           ACTIVE / AUTHENTICATED

           Razorpay itself confirms subscription state.

           Sync Neon immediately.

           This is especially useful locally before
           webhooks are configured.
        ============================================= */

        if (
          [
            "active",
            "authenticated",
          ].includes(
            existingSubscription.status
          )
        ) {
          console.log(
            "🔄 Razorpay subscription is valid."
          );

          console.log(
            "🔄 Synchronizing Genviq Pro with Neon..."
          );

          const updatedUser =
            await syncProSubscription(
              userId,
              existingSubscription
            );

          console.log(
            "👑 GENVIQ PRO SYNCHRONIZED"
          );

          console.log(
            "Plan:",
            updatedUser?.plan
          );

          console.log(
            "Status:",
            updatedUser?.subscription_status
          );

          return res.status(200).json({
            success: true,

            alreadyPro: true,

            synchronized: true,

            message:
              "Your Genviq Pro subscription is already active.",

            plan:
              "pro",

            subscriptionStatus:
              existingSubscription.status,

            subscription: {
              id:
                existingSubscription.id,

              status:
                existingSubscription.status,

              currentPeriodStart:
                updatedUser
                  ?.current_period_start,

              currentPeriodEnd:
                updatedUser
                  ?.current_period_end,
            },
          });
        }

        /* =============================================
           CREATED / PENDING

           Do NOT create duplicate subscriptions.

           Return existing subscription to checkout.
        ============================================= */

        const reusableStatuses = [
          "created",
          "pending",
        ];

        if (
          reusableStatuses.includes(
            existingSubscription.status
          )
        ) {
          console.log(
            "♻️ Reusing existing Razorpay subscription"
          );

          return res.status(200).json({
            success: true,

            existingSubscription:
              true,

            message:
              "Existing subscription found.",

            keyId:
              process.env.RAZORPAY_KEY_ID,

            subscription: {
              id:
                existingSubscription.id,

              status:
                existingSubscription.status,

              planId:
                existingSubscription.plan_id,

              shortUrl:
                existingSubscription.short_url ||
                null,
            },
          });
        }

        /* =============================================
           HALTED

           Do not silently create another recurring
           subscription.
        ============================================= */

        if (
          existingSubscription.status ===
          "halted"
        ) {
          return res.status(409).json({
            success: false,

            message:
              "Your existing subscription is halted. Please resolve the payment issue before creating another subscription.",
          });
        }

        console.log(
          "ℹ️ Existing subscription cannot be reused:",
          existingSubscription.status
        );
      } catch (existingError) {
        console.error(
          "⚠️ Existing subscription fetch failed:",
          existingError?.error
            ?.description ||
            existingError.message
        );

        /*
          The stored subscription may belong to an old
          Test/Live environment.

          Continue below and allow creation of a new
          subscription.
        */
      }
    }

    /* =================================================
       6. CREATE NEW RAZORPAY SUBSCRIPTION
    ================================================= */

    const subscriptionOptions = {
      plan_id:
        razorpayPlanId,

      total_count:
        120,

      quantity:
        1,

      customer_notify:
        1,

      notes: {
        clerk_user_id:
          userId,

        product:
          "Genviq Pro",

        billing:
          "monthly",
      },
    };

    if (
      user.email
    ) {
      subscriptionOptions.notes.email =
        user.email;
    }

    console.log(
      "🚀 Creating new Razorpay subscription..."
    );

    const subscription =
      await razorpay.subscriptions.create(
        subscriptionOptions
      );

    if (
      !subscription?.id
    ) {
      throw new Error(
        "Razorpay did not return a subscription ID."
      );
    }

    console.log(
      "✅ Razorpay Subscription Created:",
      subscription.id
    );

    /* =================================================
       7. SAVE CREATED SUBSCRIPTION

       IMPORTANT:

       User is NOT Pro yet.

       Checkout must complete first.
    ================================================= */

    await sql`
      UPDATE users

      SET
        razorpay_subscription_id =
          ${subscription.id},

        subscription_status =
          'created',

        updated_at =
          CURRENT_TIMESTAMP

      WHERE clerk_user_id =
        ${userId}
    `;

    console.log(
      "💾 Razorpay subscription saved in Neon"
    );

    /* =================================================
       8. RETURN CHECKOUT DATA
    ================================================= */

    return res.status(201).json({
      success: true,

      message:
        "Genviq Pro subscription created successfully.",

      keyId:
        process.env.RAZORPAY_KEY_ID,

      subscription: {
        id:
          subscription.id,

        status:
          subscription.status,

        planId:
          subscription.plan_id,

        shortUrl:
          subscription.short_url ||
          null,
      },
    });
  } catch (error) {
    console.error(
      "❌ CREATE SUBSCRIPTION ERROR:"
    );

    console.error(
      error?.error?.description ||
        error.message ||
        error
    );

    return res
      .status(
        error?.statusCode ||
          500
      )
      .json({
        success: false,

        message:
          error?.error
            ?.description ||
          error?.error?.reason ||
          error.message ||
          "Unable to create Genviq Pro subscription.",
      });
  }
};
/* =====================================================
   VERIFY RAZORPAY SUBSCRIPTION PAYMENT

   Called after Razorpay Checkout succeeds.

   SECURITY:

   1. Verify Razorpay signature
   2. Fetch subscription directly from Razorpay
   3. Confirm subscription belongs to this user
   4. Confirm valid subscription status
   5. Activate Genviq Pro in Neon
===================================================== */

export const verifySubscriptionPayment = async (
  req,
  res
) => {
  try {
    console.log(
      "🔐 Verify Genviq Pro subscription request received"
    );

    /* =================================================
       1. AUTHENTICATED USER
    ================================================= */

    const userId =
      req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized. Please sign in.",
      });
    }

    /* =================================================
       2. GET RAZORPAY CHECKOUT RESPONSE
    ================================================= */

    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_payment_id ||
      !razorpay_subscription_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Missing Razorpay payment verification details.",
      });
    }

    console.log(
      "💳 Payment ID:",
      razorpay_payment_id
    );

    console.log(
      "📦 Subscription ID:",
      razorpay_subscription_id
    );

    /* =================================================
       3. CHECK SECRET
    ================================================= */

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(500).json({
        success: false,

        message:
          "Razorpay payment verification is not configured.",
      });
    }

    /* =================================================
       4. VERIFY RAZORPAY SIGNATURE

       Razorpay subscription signature format:

       payment_id | subscription_id
    ================================================= */

    const signatureBody =
      `${razorpay_payment_id}|${razorpay_subscription_id}`;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          keySecret
        )
        .update(signatureBody)
        .digest("hex");

    const signatureIsValid =
      crypto.timingSafeEqual(
        Buffer.from(
          expectedSignature,
          "utf8"
        ),

        Buffer.from(
          razorpay_signature,
          "utf8"
        )
      );

    if (!signatureIsValid) {
      console.error(
        "❌ Invalid Razorpay signature"
      );

      return res.status(400).json({
        success: false,

        message:
          "Invalid Razorpay payment signature.",
      });
    }

    console.log(
      "✅ Razorpay signature verified"
    );

    /* =================================================
       5. GET USER FROM NEON

       Make sure this subscription actually belongs
       to the currently logged-in Clerk user.
    ================================================= */

    const [user] = await sql`
      SELECT
        clerk_user_id,
        plan,
        subscription_status,
        razorpay_subscription_id

      FROM users

      WHERE clerk_user_id =
        ${userId}

      LIMIT 1
    `;

    if (!user) {
      return res.status(404).json({
        success: false,

        message:
          "Genviq user account was not found.",
      });
    }

    /* =================================================
       6. VERIFY SUBSCRIPTION ID MATCHES NEON
    ================================================= */

    if (
      user.razorpay_subscription_id !==
      razorpay_subscription_id
    ) {
      console.error(
        "❌ Subscription ID does not belong to user"
      );

      return res.status(403).json({
        success: false,

        message:
          "This subscription does not belong to the authenticated user.",
      });
    }

    /* =================================================
       7. FETCH SUBSCRIPTION DIRECTLY FROM RAZORPAY

       Never trust frontend status.
    ================================================= */

    const subscription =
      await razorpay.subscriptions.fetch(
        razorpay_subscription_id
      );

    if (!subscription?.id) {
      return res.status(400).json({
        success: false,

        message:
          "Unable to verify Razorpay subscription.",
      });
    }

    console.log(
      "📊 Razorpay Subscription Status:",
      subscription.status
    );

    /* =================================================
       8. VALID SUBSCRIPTION STATUS
    ================================================= */

    const validStatuses = [
      "authenticated",
      "active",
    ];

    if (
      !validStatuses.includes(
        subscription.status
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          `Subscription is not active yet. Current status: ${subscription.status}`,
      });
    }

    /* =================================================
       9. VERIFY PLAN

       Prevent a subscription from another Razorpay
       plan from activating Genviq Pro.
    ================================================= */

    if (
      subscription.plan_id !==
      process.env.RAZORPAY_PLAN_ID
    ) {
      console.error(
        "❌ Razorpay plan mismatch"
      );

      return res.status(403).json({
        success: false,

        message:
          "Invalid subscription plan.",
      });
    }

    /* =================================================
       10. PERIOD DATES
    ================================================= */

    const periodStart =
      razorpayTimestampToDate(
        subscription.current_start
      );

    const periodEnd =
      razorpayTimestampToDate(
        subscription.current_end
      );

    /* =================================================
       11. ACTIVATE GENVIQ PRO
    ================================================= */

    const [updatedUser] = await sql`
      UPDATE users

      SET
        plan =
          'pro',

        subscription_status =
          ${subscription.status},

        razorpay_subscription_id =
          ${subscription.id},

        current_period_start =
          ${periodStart},

        current_period_end =
          ${periodEnd},

        updated_at =
          CURRENT_TIMESTAMP

      WHERE clerk_user_id =
        ${userId}

      RETURNING
        clerk_user_id,
        plan,
        subscription_status,
        razorpay_subscription_id,
        current_period_start,
        current_period_end
    `;

    console.log(
      "👑 GENVIQ PRO ACTIVATED"
    );

    console.log(
      "👤 User:",
      userId
    );

    console.log(
      "📦 Plan:",
      updatedUser.plan
    );

    console.log(
      "💳 Status:",
      updatedUser.subscription_status
    );

    /* =================================================
       12. SUCCESS
    ================================================= */

    return res.status(200).json({
      success: true,

      message:
        "Genviq Pro activated successfully.",

      plan:
        updatedUser.plan,

      subscriptionStatus:
        updatedUser.subscription_status,

      subscription: {
        id:
          updatedUser.razorpay_subscription_id,

        currentPeriodStart:
          updatedUser.current_period_start,

        currentPeriodEnd:
          updatedUser.current_period_end,
      },
    });
  } catch (error) {
    console.error(
      "❌ VERIFY SUBSCRIPTION ERROR:"
    );

    console.error(
      error?.error?.description ||
        error.message ||
        error
    );

    return res
      .status(
        error?.statusCode ||
          500
      )
      .json({
        success: false,

        message:
          error?.error?.description ||
          error.message ||
          "Unable to verify Genviq Pro subscription.",
      });
  }
};