import crypto from "crypto";
import sql from "../configs/db.js";


const toDate = (timestamp) => {
  if (!timestamp) {
    return null;
  }

  return new Date(
    Number(timestamp) * 1000
  );
};


export const razorpaySubscriptionWebhook =
  async (req, res) => {

    try {

      console.log(
        "Razorpay webhook received"
      );


      const webhookSecret =
        process.env.RAZORPAY_WEBHOOK_SECRET;


      if (!webhookSecret) {

        console.error(
          "RAZORPAY_WEBHOOK_SECRET is missing"
        );

        return res.status(500).json({

          success: false,

          message:
            "Webhook secret is not configured.",

        });

      }


      const razorpaySignature =
        req.headers[
          "x-razorpay-signature"
        ];


      if (!razorpaySignature) {

        console.error(
          "Razorpay webhook signature missing"
        );

        return res.status(400).json({

          success: false,

          message:
            "Webhook signature missing.",

        });

      }


      if (!Buffer.isBuffer(req.body)) {

        console.error(
          "Razorpay webhook body is not raw Buffer"
        );

        return res.status(500).json({

          success: false,

          message:
            "Invalid webhook body configuration.",

        });

      }


      const rawBody =
        req.body;



      const expectedSignature =

        crypto

          .createHmac(
            "sha256",
            webhookSecret
          )

          .update(rawBody)

          .digest("hex");


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
          "Invalid Razorpay webhook signature"
        );

        return res.status(400).json({

          success: false,

          message:
            "Invalid webhook signature.",

        });

      }


      console.log(
        "Razorpay webhook signature verified"
      );


      let webhook;


      try {

        webhook =
          JSON.parse(
            rawBody.toString("utf8")
          );

      } catch (parseError) {

        console.error(
          "Invalid Razorpay webhook JSON"
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
        "Razorpay Event:",
        event
      );


      const subscription =

        webhook?.payload
          ?.subscription
          ?.entity;


      if (!subscription?.id) {

        console.log(
          "No subscription entity found. Event acknowledged."
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
        "Subscription ID:",
        subscriptionId
      );


      console.log(
        "Subscription Status:",
        subscription.status
      );


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


        console.warn(

          "No Tivion user found for Razorpay subscription:",

          subscriptionId

        );


        return res.status(200).json({

          success: true,

          message:
            "Subscription not associated with a Tivion user.",

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


      switch (event) {


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

            "Tivion Pro activated:",

            user.clerk_user_id

          );


          break;

        }


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

            "Tivion Pro subscription charged:",

            user.clerk_user_id

          );


          break;

        }


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

            "Subscription authenticated:",

            user.clerk_user_id

          );


          break;

        }


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

            "Subscription pending:",

            user.clerk_user_id

          );


          break;

        }


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

            "Tivion Pro halted:",

            user.clerk_user_id

          );


          break;

        }


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

              ? "Subscription cancelled; Pro retained until period end:"

              : "Tivion Pro cancelled:",

            user.clerk_user_id

          );


          break;

        }


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

            "Tivion Pro subscription completed:",

            user.clerk_user_id

          );


          break;

        }


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

            "Tivion Pro paused:",

            user.clerk_user_id

          );


          break;

        }


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

            "Tivion Pro resumed:",

            user.clerk_user_id

          );


          break;

        }


        default: {

          console.log(

            "Razorpay event acknowledged but no Tivion action required:",

            event

          );


          break;

        }

      }


      return res.status(200).json({

        success: true,

        message:
          "Razorpay webhook processed successfully.",

      });


    } catch (error) {

      console.error(

        "Razorpay Webhook Error:",

        error.message

      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to process Razorpay webhook.",

      });

    }

  };