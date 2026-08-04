import { Cashfree } from "cashfree-pg";

const {
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY,
  CASHFREE_ENV = "SANDBOX",
} = process.env;

/* =====================================================
   CASHFREE ENVIRONMENT CHECK
===================================================== */

if (!CASHFREE_APP_ID) {
  throw new Error(
    "CASHFREE_APP_ID is missing from server/.env"
  );
}

if (!CASHFREE_SECRET_KEY) {
  throw new Error(
    "CASHFREE_SECRET_KEY is missing from server/.env"
  );
}

/* =====================================================
   CASHFREE INSTANCE
===================================================== */

const cashfree = new Cashfree(
  CASHFREE_ENV === "PRODUCTION"
    ? Cashfree.PRODUCTION
    : Cashfree.SANDBOX,
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY
);

export default cashfree;