import Razorpay from "razorpay";

const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
} = process.env;

if (!RAZORPAY_KEY_ID) {
  throw new Error(
    "RAZORPAY_KEY_ID is missing from server/.env"
  );
}

if (!RAZORPAY_KEY_SECRET) {
  throw new Error(
    "RAZORPAY_KEY_SECRET is missing from server/.env"
  );
}


const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

console.log("Razorpay Key ID:", RAZORPAY_KEY_ID);
console.log("Secret exists:", !!RAZORPAY_KEY_SECRET);



export default razorpay;