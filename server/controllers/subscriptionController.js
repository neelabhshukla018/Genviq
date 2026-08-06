import razorpay from "../configs/razorpay.js";
import sql from "../configs/db.js";
import crypto from "crypto";


const razorpayTimestampToDate = (timestamp) => {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000);
};


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

export const createSubscription = async (
  req,
  res
) => {
  try {
    console.log(
      "💳 Create Tivion Pro subscription request received"
    );


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
      "Subscription user:",
      userId
    );

    const razorpayPlanId =
      process.env.RAZORPAY_PLAN_ID;

    if (!razorpayPlanId) {
      console.error(
        "RAZORPAY_PLAN_ID missing"
      );

      return res.status(500).json({
        success: false,

        message:
          "Razorpay subscription plan is not configured.",
      });
    }


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
          "Tivion user account was not found.",
      });
    }

    console.log(
      "Neon Plan:",
      user.plan
    );

    console.log(
      " Neon Subscription Status:",
      user.subscription_status
    );


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
        "User already has Tivion Pro"
      );

      return res.status(409).json({
        success: false,

        alreadyPro: true,

        plan: "pro",

        subscriptionStatus:
          user.subscription_status,

        message:
          "You already have an active Tivion Pro subscription.",
      });
    }

 

    if (
      user.razorpay_subscription_id
    ) {
      console.log(
        "Checking existing Razorpay subscription:",
        user.razorpay_subscription_id
      );

      try {
        const existingSubscription =
          await razorpay.subscriptions.fetch(
            user.razorpay_subscription_id
          );

        console.log(
          "Existing Razorpay Status:",
          existingSubscription.status
        );


        if (
          [
            "active",
            "authenticated",
          ].includes(
            existingSubscription.status
          )
        ) {
          console.log(
            "Razorpay subscription is valid."
          );

          console.log(
            "Synchronizing Tivion Pro with Neon..."
          );

          const updatedUser =
            await syncProSubscription(
              userId,
              existingSubscription
            );

          console.log(
            "TIVION PRO SYNCHRONIZED"
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
              "Your Tivion Pro subscription is already active.",

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
            "Reusing existing Razorpay subscription"
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
          "Existing subscription cannot be reused:",
          existingSubscription.status
        );
      } catch (existingError) {
        console.error(
          "Existing subscription fetch failed:",
          existingError?.error
            ?.description ||
            existingError.message
        );

      }
    }


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
          "Tivion Pro",

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
      "Creating new Razorpay subscription..."
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
      "Razorpay Subscription Created:",
      subscription.id
    );

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
      "Razorpay subscription saved in Neon"
    );


    return res.status(201).json({
      success: true,

      message:
        "Tivion Pro subscription created successfully.",

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
  console.error("========== RAZORPAY ERROR ==========");
  console.error(error);
  console.error("Status:", error?.statusCode);
  console.error("Error Object:", error?.error);
  console.error("Description:", error?.error?.description);
  console.error("Reason:", error?.error?.reason);
  console.error("Field:", error?.error?.field);
  console.error("====================================");

  return res
    .status(error?.statusCode || 500)
    .json({
      success: false,
      message:
        error?.error?.description ||
        error?.error?.reason ||
        error.message ||
        "Unable to create Tivion Pro subscription.",
    });
}
};


export const verifySubscriptionPayment = async (
  req,
  res
) => {
  try {
    console.log(
      "Verify Tivion Pro subscription request received"
    );


    const userId =
      req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized. Please sign in.",
      });
    }

  

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
      "Payment ID:",
      razorpay_payment_id
    );

    console.log(
      "Subscription ID:",
      razorpay_subscription_id
    );

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(500).json({
        success: false,

        message:
          "Razorpay payment verification is not configured.",
      });
    }



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
        "Invalid Razorpay signature"
      );

      return res.status(400).json({
        success: false,

        message:
          "Invalid Razorpay payment signature.",
      });
    }

    console.log(
      "Razorpay signature verified"
    );


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
          "Tivion user account was not found.",
      });
    }

    if (
      user.razorpay_subscription_id !==
      razorpay_subscription_id
    ) {
      console.error(
        "Subscription ID does not belong to user"
      );

      return res.status(403).json({
        success: false,

        message:
          "This subscription does not belong to the authenticated user.",
      });
    }


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
      "Razorpay Subscription Status:",
      subscription.status
    );


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


    if (
      subscription.plan_id !==
      process.env.RAZORPAY_PLAN_ID
    ) {
      console.error(
        "Razorpay plan mismatch"
      );

      return res.status(403).json({
        success: false,

        message:
          "Invalid subscription plan.",
      });
    }


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
      "TIVION PRO ACTIVATED"
    );

    console.log(
      "User:",
      userId
    );

    console.log(
      "Plan:",
      updatedUser.plan
    );

    console.log(
      "Status:",
      updatedUser.subscription_status
    );


    return res.status(200).json({
      success: true,

      message:
        "Tivion Pro activated successfully.",

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
      "VERIFY SUBSCRIPTION ERROR:"
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
          "Unable to verify Tivion Pro subscription.",
      });
  }
};