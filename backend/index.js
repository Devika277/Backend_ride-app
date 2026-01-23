const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

/* ================= RAZORPAY ================= */

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post("/create-order", async (req, res) => {
  try {
    const { amount, receipt } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: receipt ?? `ride_${Date.now()}`,
      payment_capture: 1,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

/* ================= OTP + EMAIL ================= */

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.MAIL_USER,
//     pass: process.env.MAIL_PASS,
//   },
// });


// app.post("/send-otp", async (req, res) => {
//   try {
//     console.log("📩 /send-otp HIT", req.body);

//     const { email } = req.body;
//     if (!email) {
//       return res.status(400).json({ success: false, message: "Email required" });
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000);

//     await db.collection("emailOtps").doc(email).set({
//       otp,
//       expiresAt: Date.now() + 5 * 60 * 1000,
//     });

//     await transporter.sendMail({
//       from: `"Ride App" <${process.env.MAIL_USER}>`,
//       to: email,
//       subject: "MyRideApp OTP ",
//       text: `OTP for login into the MyRide App.
//       Your OTP is ${otp}. Valid for 5 minutes.`,
//     });

//     res.json({ success: true });
//   } catch (error) {
//     console.error("❌ OTP SEND FAILED:", error);
//     res.status(500).json({ success: false, message: "OTP failed" });
//   }
// });



import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/send-otp", async (req, res) => {
  try {
    console.log("📩 /send-otp HIT", req.body);

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email required",
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to Firestore
    await db.collection("emailOtps").doc(email).set({
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    // Send email using Resend
    await resend.emails.send({
      from: "MyRide App <onboarding@resend.dev>",
      to: email,
      subject: "MyRideApp OTP",
      html: `
        <p>OTP for login into the <b>MyRide App</b>.</p>
        <h2>${otp}</h2>
        <p>Valid for 5 minutes.</p>
      `,
    });

    console.log("✅ OTP sent successfully");

    return res.json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {
    console.error("❌ OTP SEND FAILED:", error);

    return res.status(500).json({
      success: false,
      message: "OTP failed",
      error: error.message,
    });
  }
});





// app.post("/verify-otp", async (req, res) => {
//   const { email, otp, phone } = req.body;

//   const doc = await db.collection("emailOtps").doc(email).get();
//   if (!doc.exists) return res.status(400).send("Invalid");

//   const data = doc.data();
//   if (data.otp != otp || Date.now() > data.expiresAt)
//     return res.status(400).send("Expired");

//   await db.collection("users").doc(email).set({
//     email,
//     phone,
//     createdAt: Date.now(),
//   });

//   res.send({ success: true });
// });


app.post("/verify-otp", async (req, res) => {
  try {
    console.log("✅ /verify-otp HIT", req.body);

    const { email, otp, phone } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const doc = await db.collection("emailOtps").doc(email).get();
    if (!doc.exists) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const data = doc.data();

    if (String(data.otp) !== String(otp)) {
      return res.status(400).json({ success: false, message: "Wrong OTP" });
    }

    if (Date.now() > data.expiresAt) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    await db.collection("users").doc(email).set(
      {
        email,
        phone: phone || null,
        createdAt: Date.now(),
      },
      { merge: true }
    );

    // 🔥 Important: delete OTP after success
    await db.collection("emailOtps").doc(email).delete();

    res.json({ success: true });
  } catch (error) {
    console.error("❌ VERIFY OTP FAILED:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});







/* ================= TEST ================= */

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

/* ================= ONLY LISTEN ONCE ================= */

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});
