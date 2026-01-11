// controllers/subscriberController.js
import Subscriber from "../models/Subscriber.js";

export const subscribeEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email required" });

    const exists = await Subscriber.findOne({ email });
    if (exists)
      return res.status(200).json({ message: "Already subscribed" });

    await Subscriber.create({ email });
    res.json({ success: true, message: "Subscribed successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
