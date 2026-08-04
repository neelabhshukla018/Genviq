import Cashfree from "../configs/cashfree.js";
import sql from "../configs/db.js";
import { randomUUID } from "crypto";

/* =====================================================
   CASHFREE SUBSCRIPTION CONTROLLER

   Cashfree
       ↓
   One-Time Payment

       ↓

   Verify Payment

       ↓

   Activate Tivion Pro

===================================================== */


/* =====================================================
   PLAN CONFIGURATION
===================================================== */

const PLAN_NAME = "Tivion Pro";

const PLAN_AMOUNT = 49;

const PLAN_CURRENCY = "INR";

const PLAN_DURATION_MONTHS = 1;


/* =====================================================
   GENERATE UNIQUE ORDER ID

   Example

   TIVION_1722882123_AB12CD34
===================================================== */

const generateOrderId = () => {

  return `TIVION_${Date.now()}_${randomUUID()
    .replace(/-/g, "")
    .substring(0, 8)}`;

};


/* =====================================================
   CALCULATE SUBSCRIPTION PERIOD
===================================================== */

const getSubscriptionPeriod = () => {

  const currentPeriodStart =
    new Date();

  const currentPeriodEnd =
    new Date();

  currentPeriodEnd.setMonth(

    currentPeriodEnd.getMonth() +
      PLAN_DURATION_MONTHS

  );

  return {

    currentPeriodStart,

    currentPeriodEnd,

  };

};


/* =====================================================
   COMMON ERROR RESPONSE
===================================================== */

const handleError = (
  res,
  error,
  message
) => {

  console.error("\n❌", message);

  console.error(

    error.response?.data ||

    error.message ||

    error

  );

  return res.status(500).json({

    success: false,

    message,

  });

};

/* =====================================================
   CREATE PAYMENT SESSION

   FLOW

   Clerk User
        ↓
   Validate User
        ↓
   Check Existing Plan
        ↓
   Create Cashfree Order
        ↓
   Return Payment Session
===================================================== */

export const createPaymentSession = async (
  req,
  res
) => {

  try {

    console.log(
      "\n=============================="
    );

    console.log(
      "💳 CREATE CASHFREE PAYMENT SESSION"
    );

    console.log(
      "=============================="
    );

    /* ================================================
       AUTHENTICATED USER
    ================================================ */

    const userId = req.auth.userId;

    if (!userId) {

      return res.status(401).json({

        success: false,

        message: "Unauthorized.",

      });

    }

    /* ================================================
       FETCH USER
    ================================================ */

    const [user] = await sql`

      SELECT

        clerk_user_id,

        full_name,

        email,

        phone,

        plan,

        subscription_status

      FROM users

      WHERE clerk_user_id =
        ${userId}

      LIMIT 1

    `;

    if (!user) {

      return res.status(404).json({

        success: false,

        message: "User not found.",

      });

    }

    /* ================================================
       ALREADY PRO
    ================================================ */

    if (

      user.plan === "pro" &&

      user.subscription_status ===
      "active"

    ) {

      return res.status(409).json({

        success: false,

        alreadyPro: true,

        message:
          "You already have an active Tivion Pro subscription.",

      });

    }

    /* ================================================
       GENERATE ORDER
    ================================================ */

    const orderId =
      generateOrderId();

    console.log(
      "Order ID:",
      orderId
    );

    /* ================================================
       CASHFREE ORDER REQUEST
    ================================================ */

    const request = {

      order_id:
        orderId,

      order_amount:
        PLAN_AMOUNT,

      order_currency:
        PLAN_CURRENCY,

      customer_details: {

        customer_id:
          user.clerk_user_id,

        customer_name:
          user.full_name ||
          "Tivion User",

        customer_email:
          user.email,

        customer_phone:
          user.phone ||
          "9999999999",

      },

      order_meta: {

        return_url:

          `${process.env.CLIENT_URL}/payment-success?order_id={order_id}`,

      },

      order_note:
        PLAN_NAME,

    };

    /* ================================================
       CREATE CASHFREE ORDER
    ================================================ */

    const response =
      await Cashfree.PGCreateOrder(
        request
      );

    const order =
      response.data;

    if (

      !order ||

      !order.payment_session_id

    ) {

      throw new Error(
        "Cashfree failed to create payment session."
      );

    }

    console.log(
      "Cashfree Order Created:",
      order.order_id
    );

    /* ================================================
       SUCCESS RESPONSE
    ================================================ */

    return res.status(201).json({

      success: true,

      message:
        "Payment session created successfully.",

      paymentSessionId:
        order.payment_session_id,

      orderId:
        order.order_id,

      amount:
        PLAN_AMOUNT,

      currency:
        PLAN_CURRENCY,

    });

  } catch (error) {

    return handleError(

      res,

      error,

      "Unable to create payment session."

    );

  }

};