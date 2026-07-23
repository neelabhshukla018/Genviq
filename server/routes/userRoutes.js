import express from 'express';

import {
  getPublishedCreations,
  getUserCreations,
  toggleLikeCreation,
  getUserUsage
} from '../controllers/userController.js';

import { auth } from '../middleware/auth.js';

const userRouter = express.Router();

/* =====================================================
   USER CREATIONS
===================================================== */

userRouter.get(
  '/get-user-creations',
  auth,
  getUserCreations
);

/* =====================================================
   PUBLISHED CREATIONS
===================================================== */

userRouter.get(
  '/get-published-creations',
  auth,
  getPublishedCreations
);

/* =====================================================
   LIKE / UNLIKE CREATION
===================================================== */

userRouter.post(
  '/toggle-like-creation',
  auth,
  toggleLikeCreation
);

/* =====================================================
   USER PLAN + AI USAGE

   Used by frontend to display:

   Article Writing        5/5
   Blog Titles            5/5
   Generate Images        5/5
   Remove Background      5/5
   Remove Object          5/5
   Resume Review          5/5

   Endpoint:
   GET /api/user/usage
===================================================== */

userRouter.get(
  '/usage',
  auth,
  getUserUsage
);

export default userRouter;