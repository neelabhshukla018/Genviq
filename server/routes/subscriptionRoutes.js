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

//have to add a subscription router

//subscribe it but get to access the subscription route.

//controllers is have to add subscription controller
