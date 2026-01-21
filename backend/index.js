const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "msdevika277@gmail.com",
    pass: "aqvhhgeohifvlhds",
  },
});

app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000);

  await db.collection("emailOtps").doc(email).set({
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  await transporter.sendMail({
    to: email,
    subject: "Your OTP",
    text: `Your OTP is ${otp}. Valid for 5 minutes.`,
  });

  res.send({ success: true });
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp, phone } = req.body;

  const doc = await db.collection("emailOtps").doc(email).get();
  if (!doc.exists) return res.status(400).send("Invalid");

  const data = doc.data();
  if (data.otp != otp || Date.now() > data.expiresAt)
    return res.status(400).send("Expired");

  await db.collection("users").doc(email).set({
    email,
    phone,
    createdAt: Date.now(),
  });

  res.send({ success: true });
});
app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.listen(4000, '0.0.0.0', () => {
  console.log("Server running on 4000")
});


// const express = require("express");
// const cors = require("cors");

// const app = express();

// app.use(cors());
// app.use(express.json());

// // 👇 THIS ROUTE IS REQUIRED
// app.get("/", (req, res) => {
//   res.send("Backend running");
// });

// app.listen(4000, () => {
//   console.log("Server running on port 4000");
// });

