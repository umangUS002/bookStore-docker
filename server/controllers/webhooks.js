import { Webhook } from "svix";
import User from "../models/User.js";

// API Controller Function to Manage Clerk User with Database
const clerkWebhooks = async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === "user.created") {
      await User.findOneAndUpdate(
        { _id: data.id },
        {
          email: data.email_addresses?.[0]?.email_address,
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        },
        { upsert: true }
      );
    }

    if (type === "user.updated") {
      await User.findByIdAndUpdate(data.id, {
        email: data.email_addresses?.[0]?.email_address,
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
      });
    }

    if (type === "user.deleted") {
      await User.findByIdAndDelete(data.id);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(400).json({ error: "Webhook failed" });
  }
};

export default clerkWebhooks