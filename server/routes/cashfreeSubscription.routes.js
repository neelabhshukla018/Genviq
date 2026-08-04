import express from "express";

import {
  createPaymentSession,
  verifyPayment,
  getSubscriptionStatus,
  cancelSubscription,
  syncSubscription,
} from "../controllers/cashfreeSubscription.controller.js";

import {
  auth,
} from "../middleware/auth.js";

/* =====================================================
   CASHFREE SUBSCRIPTION ROUTER

   Clerk
      ↓
   Authentication

   Cashfree
      ↓
   One-Time Monthly Payment

   Neon
      ↓
   Stores:

   plan

   subscription_status

   cashfree_order_id

   cashfree_payment_id
===================================================== */

const cashfreeSubscriptionRouter =
  express.Router();

/* =====================================================
   1. CREATE PAYMENT SESSION

   POST

   /api/cashfree-subscription/create

===================================================== */

cashfreeSubscriptionRouter.post(
  "/create",
  auth,
  createPaymentSession
);

/* =====================================================
   2. VERIFY PAYMENT

   POST

   /api/cashfree-subscription/verify

===================================================== */

cashfreeSubscriptionRouter.post(
  "/verify",
  auth,
  verifyPayment
);

/* =====================================================
   3. GET SUBSCRIPTION STATUS

   GET

   /api/cashfree-subscription/status

===================================================== */

cashfreeSubscriptionRouter.get(
  "/status",
  auth,
  getSubscriptionStatus
);

/* =====================================================
   4. CANCEL SUBSCRIPTION

   POST

   /api/cashfree-subscription/cancel

===================================================== */

cashfreeSubscriptionRouter.post(
  "/cancel",
  auth,
  cancelSubscription
);

/* =====================================================
   5. SYNC SUBSCRIPTION

   GET

   /api/cashfree-subscription/sync

===================================================== */

cashfreeSubscriptionRouter.get(
  "/sync",
  auth,
  syncSubscription
);

/* =====================================================
   EXPORT
===================================================== */

export default
cashfreeSubscriptionRouter;