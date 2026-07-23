import Razorpay from "razorpay";

/* =====================================================
   RAZORPAY ENVIRONMENT CHECK
===================================================== */

const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
} = process.env;

if (!RAZORPAY_KEY_ID) {
  throw new Error(
    "❌ RAZORPAY_KEY_ID is missing from server/.env"
  );
}

if (!RAZORPAY_KEY_SECRET) {
  throw new Error(
    "❌ RAZORPAY_KEY_SECRET is missing from server/.env"
  );
}

/* =====================================================
   RAZORPAY INSTANCE

   IMPORTANT:

   This file is SERVER-SIDE ONLY.

   Never expose RAZORPAY_KEY_SECRET
   to the React/Vite frontend.
===================================================== */

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

/* =====================================================
   EXPORT
===================================================== */

export default razorpay;