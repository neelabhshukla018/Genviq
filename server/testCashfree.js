import "dotenv/config";
import Cashfree from "./configs/cashfree.js";

const request = {
  order_id: `test_${Date.now()}`,

  order_amount: 1,

  order_currency: "INR",

  customer_details: {
    customer_id: "test123",

    customer_name: "Test User",

    customer_email: "test@example.com",

    customer_phone: "9999999999",
  },

  order_meta: {
    return_url:
      "http://localhost:5173/payment-success?order_id={order_id}",
  },
};

try {
  const response =
    await Cashfree.PGCreateOrder(request);

  console.log(response.data);

} catch (err) {
  console.log("Status:", err.response?.status);

  console.log("Body:");

  console.dir(
    err.response?.data,
    { depth: null }
  );
}