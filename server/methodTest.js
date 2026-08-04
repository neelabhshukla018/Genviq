import "dotenv/config";
import Cashfree from "./configs/cashfree.js";

console.log(
  Object.getOwnPropertyNames(
    Object.getPrototypeOf(Cashfree)
  )
);