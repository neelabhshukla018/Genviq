import express from "express";

import {
  createSubscription,
  verifySubscriptionPayment,
} from "../controllers/subscriptionController.js";

import {
  auth,
} from "../middleware/auth.js";


const subscriptionRouter = express.Router();


subscriptionRouter.post(
  "/create",
  auth,
  createSubscription
);


subscriptionRouter.post(
  "/verify",
  auth,
  verifySubscriptionPayment
);


export default subscriptionRouter;