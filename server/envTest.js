import "dotenv/config";

console.log({
  APP_ID: process.env.CASHFREE_APP_ID?.slice(0, 8),
  SECRET: process.env.CASHFREE_SECRET_KEY?.slice(0, 8),
  ENV: process.env.CASHFREE_ENV,
});