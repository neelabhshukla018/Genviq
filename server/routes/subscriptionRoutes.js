import express from "express";

import {
  createSubscription,
  verifySubscriptionPayment,
} from "../controllers/subscriptionController.js";

import {
  auth,
} from "../middleware/auth.js";


/* =====================================================
   SUBSCRIPTION ROUTER

   Clerk:
   - Authentication only
   - Provides authenticated user identity

   Razorpay:
   - Creates Genviq Pro subscriptions
   - Handles subscription payments

   Neon:
   - Stores user plan
   - Stores subscription status
   - Stores Razorpay subscription ID
===================================================== */

const subscriptionRouter = express.Router();


/* =====================================================
   1. CREATE GENVIQ PRO SUBSCRIPTION

   ENDPOINT:

   POST /api/subscription/create


   FLOW:

   User clicks:
   "Upgrade to Genviq Pro"

            ↓

   Frontend sends authenticated request

            ↓

   Clerk authentication

            ↓

   auth middleware

            ↓

   req.userId

            ↓

   createSubscription()

            ↓

   Razorpay creates subscription using:

   RAZORPAY_PLAN_ID

            ↓

   Neon stores:

   razorpay_subscription_id
   subscription_status = "created"


   IMPORTANT:

   Creating a Razorpay subscription does NOT
   automatically activate Genviq Pro.

   Payment must first be successfully completed
   and verified.
===================================================== */

subscriptionRouter.post(
  "/create",
  auth,
  createSubscription
);


/* =====================================================
   2. VERIFY SUBSCRIPTION PAYMENT

   ENDPOINT:

   POST /api/subscription/verify


   Razorpay Checkout returns:

   razorpay_payment_id

   razorpay_subscription_id

   razorpay_signature


   FLOW:

   Razorpay Checkout
          ↓

   User successfully completes payment
          ↓

   Frontend receives Razorpay response
          ↓

   POST /api/subscription/verify
          ↓

   Clerk authentication
          ↓

   auth middleware
          ↓

   verifySubscriptionPayment()
          ↓

   Verify Razorpay signature
          ↓

   Check subscription belongs to
   authenticated Genviq user
          ↓

   Fetch real subscription from Razorpay
          ↓

   Confirm valid subscription state
          ↓

   Update Neon:

   plan = "pro"

   subscription_status =
   "authenticated" / "active"

   current_period_start = ...

   current_period_end = ...

          ↓

   Genviq Pro activated


   SECURITY:

   The frontend cannot simply send:

   plan = "pro"

   and unlock Pro.

   The backend verifies the Razorpay payment
   before changing the user's plan.
===================================================== */

subscriptionRouter.post(
  "/verify",
  auth,
  verifySubscriptionPayment
);


/* =====================================================
   CURRENT SUBSCRIPTION API STRUCTURE


   CREATE:

   POST
   /api/subscription/create


   VERIFY:

   POST
   /api/subscription/verify


   FUTURE WEBHOOK:

   POST
   /api/subscription/webhook


   The webhook will NOT use the normal Clerk
   auth middleware.

   Razorpay itself will call that endpoint.

   We will authenticate Razorpay using the
   webhook signature + RAZORPAY_WEBHOOK_SECRET.
===================================================== */


/* =====================================================
   EXPORT
===================================================== */

export default subscriptionRouter;