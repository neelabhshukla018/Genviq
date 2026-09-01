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


//have to add chatbot route here too, but not sure if it should be in userRoutes or a separate route file.


// The chatbot route could be added here if it is closely related to user actions, such as user interactions with the chatbot. However, if the chatbot has its own set of functionalities and endpoints that are not directly tied to user actions, it might be better to create a separate route file for it.


// If you decide to add the chatbot route here, you could do something like this:
// userRouter.post(
//   '/chatbot',
//   auth,
//   chatbotController.handleChatbotRequest
// );