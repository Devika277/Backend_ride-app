const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");

const app = express();

app.use(cors());            // ✅ allow Flutter requests
app.use(express.json());    // ✅ parse JSON body

// 🔐 Razorpay TEST keys (SAFE ONLY ON BACKEND)
const razorpay = new Razorpay({
  key_id: "rzp_test_YXemoshVoIu50O",
  key_secret: "DdQ6J6RzPuCOtmtxWIcYowf5",
});

app.post("/create-order", async (req, res) => {
  try {
    const { amount, receipt } = req.body;

    console.log("📥 Request received:", req.body);


    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // ✅ paise (IMPORTANT)
      currency: "INR",
      receipt: receipt ?? `ride_${Date.now()}`,
      payment_capture: 1,
    });

    // ✅ Send ONLY required fields to frontend
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });

  } catch (error) {
    console.error("❌ Razorpay Order Error:", error);
    res.status(500).json({ error: "Order creation failed" });
  }
});

app.listen(4000, "0.0.0.0", () => {
  console.log("🚀 Razorpay backend running on port 4000");
});




