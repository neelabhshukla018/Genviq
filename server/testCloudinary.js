// =====================================================
// CLOUDINARY DIRECT UPLOAD DIAGNOSTIC TEST
// =====================================================

import "dotenv/config";
import axios from "axios";
import crypto from "crypto";

// =====================================================
// ENV VARIABLES
// =====================================================

const CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME;

const API_KEY =
  process.env.CLOUDINARY_API_KEY;

const API_SECRET =
  process.env.CLOUDINARY_API_SECRET;

// =====================================================
// CHECK ENV
// =====================================================

console.log("\n======================================");
console.log("☁️ CLOUDINARY DIRECT UPLOAD TEST");
console.log("======================================");

console.log(
  "Cloud name:",
  CLOUD_NAME || "❌ MISSING"
);

console.log(
  "API key:",
  API_KEY ? "✅ LOADED" : "❌ MISSING"
);

console.log(
  "API secret:",
  API_SECRET ? "✅ LOADED" : "❌ MISSING"
);

if (
  !CLOUD_NAME ||
  !API_KEY ||
  !API_SECRET
) {
  console.error(
    "\n❌ Cloudinary environment variables are missing."
  );

  process.exit(1);
}

// =====================================================
// CREATE SIGNATURE
// =====================================================

const timestamp =
  Math.floor(Date.now() / 1000);

/*
  IMPORTANT:

  Cloudinary signatures are generated from
  the signed parameters in alphabetical order.

  For this simple test, we only sign:

  timestamp
*/

const signatureString =
  `timestamp=${timestamp}${API_SECRET}`;

const signature =
  crypto
    .createHash("sha1")
    .update(signatureString)
    .digest("hex");

// =====================================================
// TINY TEST IMAGE
// =====================================================

/*
  Tiny PNG data URI.

  This means:

  - No Hugging Face
  - No Cloudflare
  - No local file
  - No frontend

  We are testing ONLY Cloudinary.
*/

const testImage =
  "data:image/png;base64," +
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC" +
  "AAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

// =====================================================
// CLOUDINARY UPLOAD URL
// =====================================================

const uploadUrl =
  `https://api.cloudinary.com/v1_1/` +
  `${CLOUD_NAME}/image/upload`;

// =====================================================
// CREATE FORM DATA
// =====================================================

const formData =
  new FormData();

formData.append(
  "file",
  testImage
);

formData.append(
  "api_key",
  API_KEY
);

formData.append(
  "timestamp",
  timestamp.toString()
);

formData.append(
  "signature",
  signature
);

// =====================================================
// RUN TEST
// =====================================================

async function testCloudinary() {
  console.log(
    "\n🚀 Sending direct request to:"
  );

  console.log(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
  );

  console.log(
    "\n⏳ Testing signed Cloudinary upload..."
  );

  try {

    const response =
      await axios.post(
        uploadUrl,
        formData,
        {
          /*
            IMPORTANT:

            Don't let Axios throw automatically
            for 4xx/5xx.

            We want to READ the actual
            Cloudinary response.
          */

          validateStatus:
            () => true,

          timeout:
            30000,
        }
      );

    // =================================================
    // PRINT EVERYTHING USEFUL
    // =================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "📡 HTTP STATUS:",
      response.status
    );

    console.log(
      "======================================"
    );

    console.log(
      "\n📦 CLOUDINARY RESPONSE:"
    );

    console.dir(
      response.data,
      {
        depth: null,
        colors: true,
      }
    );

    // =================================================
    // SUCCESS
    // =================================================

    if (
      response.status >= 200 &&
      response.status < 300
    ) {

      console.log(
        "\n======================================"
      );

      console.log(
        "✅ CLOUDINARY UPLOAD WORKS!"
      );

      console.log(
        "======================================"
      );

      console.log(
        "Public ID:",
        response.data?.public_id
      );

      console.log(
        "Image URL:",
        response.data?.secure_url
      );

      console.log(
        "\n🎉 Cloudinary itself is working."
      );

      return;
    }

    // =================================================
    // FAILURE
    // =================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "❌ CLOUDINARY REJECTED THE UPLOAD"
    );

    console.log(
      "======================================"
    );

    console.log(
      "\nStatus:",
      response.status
    );

    const cloudinaryMessage =
      response.data?.error?.message ||
      response.data?.message ||
      JSON.stringify(
        response.data
      );

    console.log(
      "\n🔥 ACTUAL CLOUDINARY ERROR:"
    );

    console.log(
      cloudinaryMessage
    );

    // =================================================
    // COMMON ERROR HINTS
    // =================================================

    if (
      response.status === 401
    ) {

      console.log(
        "\n💡 This usually means:"
      );

      console.log(
        "- Wrong API key"
      );

      console.log(
        "- Wrong API secret"
      );

      console.log(
        "- Invalid signature"
      );

      console.log(
        "- Credentials belong to another cloud"
      );

    }

    if (
      response.status === 403
    ) {

      console.log(
        "\n💡 IMPORTANT:"
      );

      console.log(
        "Cloudinary authenticated/reached the request but refused the operation."
      );

      console.log(
        "The ACTUAL CLOUDINARY ERROR printed above should tell us why."
      );

    }

  } catch (error) {

    // =================================================
    // NETWORK / AXIOS FAILURE
    // =================================================

    console.log(
      "\n======================================"
    );

    console.log(
      "💥 REQUEST ITSELF FAILED"
    );

    console.log(
      "======================================"
    );

    console.log(
      "Message:",
      error.message
    );

    console.log(
      "Code:",
      error.code
    );

    if (
      error.response
    ) {

      console.log(
        "HTTP Status:",
        error.response.status
      );

      console.log(
        "Response:"
      );

      console.dir(
        error.response.data,
        {
          depth: null,
          colors: true,
        }
      );

    }

  }
}

// =====================================================
// START
// =====================================================

testCloudinary();