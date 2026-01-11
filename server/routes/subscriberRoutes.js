import express from "express";
import { subscribeEmail } from "../controllers/subscriberController.js";

const subscriberRouter = express.Router();
subscriberRouter.post("/subscribe", subscribeEmail);

export default subscriberRouter;