import crypto from "crypto";
import sql from "../configs/db.js";

/* =====================================================
   RAZORPAY SUBSCRIPTION WEBHOOK CONTROLLER

   Razorpay
       ↓
   POST /api/subscription/webhook
       ↓
   Verify webhook signature
       ↓
   Read Razorpay event
       ↓
   Find user by razorpay_subscription_id
       ↓
   Synchronize Neon plan + subscription status

   IMPORTANT:

   - No Clerk auth is used here.
   - Razorpay itself calls this endpoint.
   - Authentication is done using:
     RAZORPAY_WEBHOOK_SECRET
     +
     x-razorpay-signature
===================================================== */


/* =====================================================
   HELPER: CONVERT UNIX TIMESTAMP TO DATE

   Razorpay generally returns timestamps
   as Unix seconds.
===================================================== */

const toDate = (timestamp) => {
  if (!timestamp) {
    return null;
  }

  return new Date(
    Number(timestamp) * 1000
  );
};


/* =====================================================
   WEBHOOK HANDLER
===================================================== */

export const razorpaySubscriptionWebhook =
  async (req, res) => {

    try {

      console.log(
        "📩 Razorpay webhook received"
      );


      /* ===============================================
         1. CHECK WEBHOOK SECRET
      =============================================== */

      const webhookSecret =
        process.env.RAZORPAY_WEBHOOK_SECRET;


      if (!webhookSecret) {

        console.error(
          "❌ RAZORPAY_WEBHOOK_SECRET is missing"
        );

        return res.status(500).json({

          success: false,

          message:
            "Webhook secret is not configured.",

        });

      }


      /* ===============================================
         2. GET RAZORPAY SIGNATURE
      =============================================== */

      const razorpaySignature =
        req.headers[
          "x-razorpay-signature"
        ];


      if (!razorpaySignature) {

        console.error(
          "❌ Razorpay webhook signature missing"
        );

        return res.status(400).json({

          success: false,

          message:
            "Webhook signature missing.",

        });

      }


      /* ===============================================
         3. GET RAW REQUEST BODY

         IMPORTANT:

         req.body MUST be a Buffer here.

         server.js will later use:

         express.raw({
           type: "application/json"
         })

         specifically for this webhook route.

         Do NOT JSON.stringify a body that has already
         been parsed by express.json() for signature
         verification.
      =============================================== */

      if (!Buffer.isBuffer(req.body)) {

        console.error(
          "❌ Razorpay webhook body is not raw Buffer"
        );

        return res.status(500).json({

          success: false,

          message:
            "Invalid webhook body configuration.",

        });

      }


      const rawBody =
        req.body;


      /* ===============================================
         4. CREATE EXPECTED SIGNATURE

         HMAC SHA256:

         raw webhook body

         signed using:

         RAZORPAY_WEBHOOK_SECRET
      =============================================== */

      const expectedSignature =

        crypto

          .createHmac(
            "sha256",
            webhookSecret
          )

          .update(rawBody)

          .digest("hex");


      /* ===============================================
         5. TIMING-SAFE SIGNATURE COMPARISON
      =============================================== */

      const expectedBuffer =
        Buffer.from(
          expectedSignature,
          "utf8"
        );


      const receivedBuffer =
        Buffer.from(
          String(
            razorpaySignature
          ),
          "utf8"
        );


      const signatureIsValid =

        expectedBuffer.length ===
          receivedBuffer.length &&

        crypto.timingSafeEqual(

          expectedBuffer,

          receivedBuffer

        );


      if (!signatureIsValid) {

        console.error(
          "❌ Invalid Razorpay webhook signature"
        );

        return res.status(400).json({

          success: false,

          message:
            "Invalid webhook signature.",

        });

      }


      console.log(
        "✅ Razorpay webhook signature verified"
      );


      /* ===============================================
         6. PARSE VERIFIED WEBHOOK

         Only parse AFTER signature verification.
      =============================================== */

      let webhook;


      try {

        webhook =
          JSON.parse(
            rawBody.toString("utf8")
          );

      } catch (parseError) {

        console.error(
          "❌ Invalid Razorpay webhook JSON"
        );

        return res.status(400).json({

          success: false,

          message:
            "Invalid webhook payload.",

        });

      }


      const event =
        webhook?.event;


      console.log(
        "⚡ Razorpay Event:",
        event
      );


      /* ===============================================
         7. GET SUBSCRIPTION ENTITY

         Subscription events normally contain:

         payload.subscription.entity
      =============================================== */

      const subscription =

        webhook?.payload
          ?.subscription
          ?.entity;


      /*
        Some payment-related webhook events may not
        contain a subscription entity.

        We only process subscription lifecycle events
        in this controller.
      */

      if (!subscription?.id) {

        console.log(
          "ℹ️ No subscription entity found. Event acknowledged."
        );

        return res.status(200).json({

          success: true,

          message:
            "Webhook acknowledged.",

        });

      }


      const subscriptionId =
        subscription.id;


      console.log(
        "📦 Subscription ID:",
        subscriptionId
      );


      console.log(
        "📊 Subscription Status:",
        subscription.status
      );


      /* ===============================================
         8. FIND GENVIQ USER

         We NEVER trust a user ID from the frontend.

         Webhook identifies the account using the
         Razorpay subscription ID stored in Neon.
      =============================================== */

      const [user] = await sql`

        SELECT

          clerk_user_id,

          plan,

          subscription_status,

          razorpay_subscription_id

        FROM users

        WHERE razorpay_subscription_id =
          ${subscriptionId}

        LIMIT 1

      `;


      if (!user) {

        /*
          Return 200 intentionally.

          Razorpay retries failed webhook deliveries.

          If this is an old/unrecognized subscription,
          retrying repeatedly won't help.
        */

        console.warn(

          "⚠️ No Genviq user found for Razorpay subscription:",

          subscriptionId

        );


        return res.status(200).json({

          success: true,

          message:
            "Subscription not associated with a Genviq user.",

        });

      }


      const periodStart =
        toDate(
          subscription.current_start
        );


      const periodEnd =
        toDate(
          subscription.current_end
        );


      /* ===============================================
         9. PROCESS WEBHOOK EVENT
      =============================================== */

      switch (event) {


        /* =============================================
           SUBSCRIPTION ACTIVATED

           User has an active subscription.

           Genviq:

           plan = pro
        ============================================= */

        case "subscription.activated": {

          await sql`

            UPDATE users

            SET

              plan =
                'pro',

              subscription_status =
                'active',

              current_period_start =
                ${periodStart},

              current_period_end =
                ${periodEnd},

              updated_at =
                CURRENT_TIMESTAMP

            WHERE razorpay_subscription_id =
              ${subscriptionId}

          `;


          console.log(

            "👑 Genviq Pro activated:",

            user.clerk_user_id

          );


          break;

        }


        /* =============================================
           SUBSCRIPTION CHARGED

           A recurring payment was successfully charged.

           Keep user Pro and refresh billing period.
        ============================================= */

        case "subscription.charged": {

          await sql`

            UPDATE users

            SET

              plan =
                'pro',

              subscription_status =
                ${subscription.status || "active"},

              current_period_start =
                ${periodStart},

              current_period_end =
                ${periodEnd},

              updated_at =
                CURRENT_TIMESTAMP

            WHERE razorpay_subscription_id =
              ${subscriptionId}

          `;


          console.log(

            "💳 Genviq Pro subscription charged:",

            user.clerk_user_id

          );


          break;

        }


        /* =============================================
           SUBSCRIPTION AUTHENTICATED

           Initial payment/authentication succeeded.

           We record the state.

           If Razorpay reports the subscription as
           active, Pro can be active as well.

           Usually subscription.activated follows.
        ============================================= */

        case "subscription.authenticated": {

          const isActive =
            subscription.status ===
            "active";


          await sql`

            UPDATE users

            SET

              plan =
                ${
                  isActive
                    ? "pro"
                    : user.plan
                },

              subscription_status =
                ${
                  subscription.status ||
                  "authenticated"
                },

              current_period_start =
                ${periodStart},

              current_period_end =
                ${periodEnd},

              updated_at =
                CURRENT_TIMESTAMP

            WHERE razorpay_subscription_id =
              ${subscriptionId}

          `;


          console.log(

            "🔐 Subscription authenticated:",

            user.clerk_user_id

          );


          break;

        }


        /* =============================================
           SUBSCRIPTION PENDING

           A charge/payment may require attention.

           IMPORTANT:

           Do NOT immediately remove Pro here.

           A temporary payment issue should not
           necessarily destroy access immediately.

           We record the status and let later Razorpay
           lifecycle events determine final access.
        ============================================= */

        case "subscription.pending": {

          await sql`

            UPDATE users

            SET

              subscription_status =
                'pending',

              current_period_start =
                ${periodStart},

              current_period_end =
                ${periodEnd},

              updated_at =
                CURRENT_TIMESTAMP

            WHERE razorpay_subscription_id =
              ${subscriptionId}

          `;


          console.log(

            "⏳ Subscription pending:",

            user.clerk_user_id

          );


          break;

        }


        /* =============================================
           SUBSCRIPTION HALTED

           Razorpay has halted recurring charges,
           usually after payment failures.

           We mark subscription halted.

           Access policy can later use current_period_end
           if you want a grace-period model.

           For now, we remove Pro access.
        ============================================= */

        case "subscription.halted": {

          await sql`

            UPDATE users

            SET

              plan =
                'free',

              subscription_status =
                'halted',

              updated_at =
                CURRENT_TIMESTAMP

            WHERE razorpay_subscription_id =
              ${subscriptionId}

          `;


          console.log(

            "⚠️ Genviq Pro halted:",

            user.clerk_user_id

          );


          break;

        }


        /* =============================================
           SUBSCRIPTION CANCELLED

           IMPORTANT:

           Depending on how cancellation is configured,
           a user may be entitled to access until the
           end of their already-paid billing period.

           If current_period_end is still in the future,
           preserve Pro until that date.

           Otherwise downgrade now.
        ============================================= */

        case "subscription.cancelled": {

          const now =
            new Date();


          const hasPaidTimeRemaining =

            periodEnd &&

            periodEnd > now;


          await sql`

            UPDATE users

            SET

              plan =
                ${
                  hasPaidTimeRemaining
                    ? "pro"
                    : "free"
                },

              subscription_status =
                'cancelled',

              current_period_start =
                ${periodStart},

              current_period_end =
                ${periodEnd},

              updated_at =
                CURRENT_TIMESTAMP

            WHERE razorpay_subscription_id =
              ${subscriptionId}

          `;


          console.log(

            hasPaidTimeRemaining

              ? "🗓️ Subscription cancelled; Pro retained until period end:"

              : "❌ Genviq Pro cancelled:",

            user.clerk_user_id

          );


          break;

        }


        /* =============================================
           SUBSCRIPTION COMPLETED

           All billing cycles are complete.

           No future subscription access.
        ============================================= */

        case "subscription.completed": {

          await sql`

            UPDATE users

            SET

              plan =
                'free',

              subscription_status =
                'completed',

              current_period_start =
                ${periodStart},

              current_period_end =
                ${periodEnd},

              updated_at =
                CURRENT_TIMESTAMP

            WHERE razorpay_subscription_id =
              ${subscriptionId}

          `;


          console.log(

            "🏁 Genviq Pro subscription completed:",

            user.clerk_user_id

          );


          break;

        }


        /* =============================================
           SUBSCRIPTION PAUSED

           If pause functionality is enabled later,
           suspend Pro while paused.
        ============================================= */

        case "subscription.paused": {

          await sql`

            UPDATE users

            SET

              plan =
                'free',

              subscription_status =
                'paused',

              updated_at =
                CURRENT_TIMESTAMP

            WHERE razorpay_subscription_id =
              ${subscriptionId}

          `;


          console.log(

            "⏸️ Genviq Pro paused:",

            user.clerk_user_id

          );


          break;

        }


        /* =============================================
           SUBSCRIPTION RESUMED
        ============================================= */

        case "subscription.resumed": {

          await sql`

            UPDATE users

            SET

              plan =
                'pro',

              subscription_status =
                ${
                  subscription.status ||
                  "active"
                },

              current_period_start =
                ${periodStart},

              current_period_end =
                ${periodEnd},

              updated_at =
                CURRENT_TIMESTAMP

            WHERE razorpay_subscription_id =
              ${subscriptionId}

          `;


          console.log(

            "▶️ Genviq Pro resumed:",

            user.clerk_user_id

          );


          break;

        }


        /* =============================================
           UNKNOWN / UNUSED EVENT

           Always acknowledge valid Razorpay events.

           This prevents unnecessary retries.
        ============================================= */

        default: {

          console.log(

            "ℹ️ Razorpay event acknowledged but no Genviq action required:",

            event

          );


          break;

        }

      }


      /* ===============================================
         10. ACKNOWLEDGE WEBHOOK

         Razorpay expects a successful 2xx response.
      =============================================== */

      return res.status(200).json({

        success: true,

        message:
          "Razorpay webhook processed successfully.",

      });


    } catch (error) {

      console.error(

        "❌ Razorpay Webhook Error:",

        error.message

      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to process Razorpay webhook.",

      });

    }

  };