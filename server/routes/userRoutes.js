import express from 'express';

import {
  getPublishedCreations,
  getUserCreations,
  toggleLikeCreation,
  getUserUsage
} from '../controllers/userController.js';

import { auth } from '../middleware/auth.js';

const userRouter = express.Router();


userRouter.get(
  '/get-user-creations',
  auth,
  getUserCreations
);


userRouter.get(
  '/get-published-creations',
  auth,
  getPublishedCreations
);


userRouter.post(
  '/toggle-like-creation',
  auth,
  toggleLikeCreation
);


userRouter.get(
  '/usage',
  auth,
  getUserUsage
);

export default userRouter;