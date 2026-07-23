import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  useAuth,
  useUser,
} from '@clerk/clerk-react';


import {
  Check,
  Crown,
  Sparkles,
  Zap,
  Loader2,
} from 'lucide-react';

/* =====================================================
   USAGE CONTEXT

   Neon is the source of truth for:

   plan:
   free | pro

   subscriptionStatus:
   inactive | created | authenticated | active | etc.

   This allows this page to immediately know whether
   the currently logged-in user already has Genviq Pro.
===================================================== */

import {
  useUsage,
} from '../context/UsageContext';


/* =====================================================
   API URL

   Local backend:

   http://localhost:3000

   Production:

   Add:

   VITE_API_URL=https://your-backend-url.com

   IMPORTANT:

   Your UsageContext currently uses VITE_BASE_URL,
   while this payment file uses VITE_API_URL.

   For now localhost fallback keeps development working.
===================================================== */

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000';


/* =====================================================
   ACTIVE SUBSCRIPTION STATUSES

   These statuses mean that the user should be treated
   as already subscribed to Genviq Pro.

   We use this together with:

   plan === "pro"

   to prevent Razorpay Checkout from opening again.
===================================================== */

const ACTIVE_SUBSCRIPTION_STATUSES = [
  'active',
  'authenticated',
];


/* =====================================================
   LOAD RAZORPAY CHECKOUT

   Razorpay Checkout is loaded dynamically.

   This means:

   - No Razorpay frontend npm package is required.
   - Script is only needed when a FREE user upgrades.
   - PRO users never need to load/open Checkout.
===================================================== */

const loadRazorpayScript = () => {

  return new Promise((resolve) => {


    /* ===============================================
       ALREADY LOADED

       Avoid adding the same Razorpay script multiple
       times if the user interacts with the page again.
    =============================================== */

    if (window.Razorpay) {

      resolve(true);

      return;

    }


    /* ===============================================
       CREATE SCRIPT
    =============================================== */

    const script =
      document.createElement(
        'script'
      );


    script.src =
      'https://checkout.razorpay.com/v1/checkout.js';


    script.async =
      true;


    /* ===============================================
       SCRIPT LOADED
    =============================================== */

    script.onload = () => {

      resolve(true);

    };


    /* ===============================================
       SCRIPT FAILED
    =============================================== */

    script.onerror = () => {

      resolve(false);

    };


    /* ===============================================
       ADD SCRIPT TO DOCUMENT
    =============================================== */

    document.body.appendChild(
      script
    );

  });

};


/* =====================================================
   PLANS COMPONENT
===================================================== */

const Plans = () => {


  /* ===================================================
     CLERK AUTHENTICATION

     Clerk handles authentication ONLY.

     Razorpay handles subscription billing.

     Neon stores:

     plan
     subscription_status
     razorpay_subscription_id
     billing period
  =================================================== */

  const {
    getToken,
    isSignedIn,
  } = useAuth();


  const {
    user,
  } = useUser();


  /* ===================================================
     GENVIQ PLAN / USAGE CONTEXT

     UsageContext calls:

     GET /api/user/usage

     and gets the REAL plan from Neon.

     Example after successful subscription:

     plan = "pro"

     subscriptionStatus = "active"

     isPro = true
  =================================================== */

  const {
    plan,
    isPro,
    subscriptionStatus,
    refreshUsage,
  } = useUsage();


  /* ===================================================
     PAYMENT STATE
  =================================================== */

  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState('');


  const [
    success,
    setSuccess,
  ] = useState('');


  /* ===================================================
     CHECK WHETHER CURRENT USER HAS ACTIVE PRO

     We primarily trust Neon:

     plan === "pro"

     And also make sure the subscription is in a valid
     active/authenticated state.

     Your current synchronized database row is:

     plan = pro
     subscription_status = active

     Therefore:

     hasActiveProSubscription = true
  =================================================== */

  const hasActiveProSubscription =

    isPro &&

    ACTIVE_SUBSCRIPTION_STATUSES.includes(
      subscriptionStatus
    );


  /* ===================================================
     PRO BUTTON CLICK

     FREE USER:

     Click Upgrade
          ↓
     handleUpgrade()
          ↓
     Razorpay


     PRO USER:

     Click dimmed button
          ↓
     Alert
          ↓
     Razorpay DOES NOT OPEN
          ↓
     No duplicate subscription
  =================================================== */

  const handleProButtonClick =
    async () => {


      /* ===============================================
         ALREADY ACTIVE PRO

         IMPORTANT:

         We intentionally DO NOT disable the HTML button.

         A disabled button cannot fire onClick.

         We want the button to LOOK dimmed but still
         respond with an informative alert.
      =============================================== */

      if (
        hasActiveProSubscription
      ) {

        alert(
          'You already have an active Genviq Pro subscription.'
        );

        return;

      }


      /* ===============================================
         FALLBACK

         If Neon says plan=pro but status is temporarily
         different, we still protect against accidentally
         starting another subscription.

         The backend also provides duplicate protection,
         but preventing it here gives better UX.
      =============================================== */

      if (isPro) {

        alert(
          'You currently have a Genviq Pro subscription.'
        );

        return;

      }


      /* ===============================================
         FREE USER

         Continue to Razorpay upgrade flow.
      =============================================== */

      await handleUpgrade();

    };


  /* ===================================================
     UPGRADE TO GENVIQ PRO

     COMPLETE FLOW:

     User clicks Upgrade

          ↓

     Frontend confirms user is not already Pro

          ↓

     Check Clerk login

          ↓

     Get Clerk authentication token

          ↓

     POST /api/subscription/create

          ↓

     BACKEND CHECKS:

     Neon user
          +
     existing Razorpay subscription

          ↓

     CASE A:

     Existing Razorpay subscription is ACTIVE

          ↓

     Backend synchronizes Neon:

     plan = "pro"
     subscription_status = "active"

          ↓

     Frontend refreshes UsageContext

          ↓

     NO CHECKOUT OPENS


     CASE B:

     User has no active subscription

          ↓

     Backend creates/reuses Razorpay subscription

          ↓

     Razorpay Checkout opens

          ↓

     Test payment / mandate succeeds

          ↓

     Razorpay returns:

     razorpay_payment_id
     razorpay_subscription_id
     razorpay_signature

          ↓

     POST /api/subscription/verify

          ↓

     Backend verifies signature

          ↓

     Backend verifies subscription with Razorpay

          ↓

     Neon:

     plan = "pro"
     subscription_status = "active/authenticated"

          ↓

     refreshUsage()

          ↓

     UI becomes Pro
  =================================================== */

  const handleUpgrade =
    async () => {

      try {


        /* =============================================
           RESET OLD UI MESSAGES
        ============================================= */

        setError('');

        setSuccess('');


        /* =============================================
           FRONTEND DUPLICATE PRO PROTECTION

           This check exists here AND in
           handleProButtonClick intentionally.

           Even if handleUpgrade() is called somewhere
           else later, an existing Pro user should never
           accidentally open another checkout.
        ============================================= */

        if (isPro) {

          alert(
            'You already have an active Genviq Pro subscription.'
          );

          return;

        }


        /* =============================================
           CHECK CLERK LOGIN
        ============================================= */

        if (!isSignedIn) {

          setError(
            'Please sign in before upgrading to Genviq Pro.'
          );

          return;

        }


        /* =============================================
           START LOADING
        ============================================= */

        setLoading(true);


        /* =============================================
           GET CLERK SESSION TOKEN FIRST

           We check the backend BEFORE loading Razorpay.

           Why?

           The backend may discover that an existing
           Razorpay subscription is already active.

           In that case:

           - Neon gets synchronized
           - User becomes Pro
           - Razorpay Checkout is unnecessary
        ============================================= */

        const token =
          await getToken();


        if (!token) {

          throw new Error(
            'Unable to verify your login session. Please sign in again.'
          );

        }


        /* =============================================
           CREATE / CHECK RAZORPAY SUBSCRIPTION

           Backend route:

           POST /api/subscription/create

           IMPORTANT:

           We NEVER send ₹49 from the browser.

           Backend uses the trusted:

           RAZORPAY_PLAN_ID

           configured in server/.env.
        ============================================= */

        const createResponse =
          await fetch(

            `${API_URL}/api/subscription/create`,

            {

              method:
                'POST',

              headers: {

                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,

              },

              body:
                JSON.stringify({}),

            }

          );


        /* =============================================
           READ BACKEND RESPONSE
        ============================================= */

        const createData =
          await createResponse.json();


        console.log(
          '💳 Create subscription response:',
          createData
        );


        /* =============================================
           SPECIAL CASE:

           BACKEND SAYS USER IS ALREADY PRO

           A 409 response can legitimately mean:

           "You already have an active Genviq Pro
           subscription."

           That is NOT something for which we should
           open Razorpay again.
        ============================================= */

        if (
          createResponse.status === 409 &&
          createData?.alreadyPro === true
        ) {

          console.log(
            '👑 Backend confirmed existing Pro subscription'
          );


          /* ===========================================
             REFRESH PLAN FROM NEON
          =========================================== */

          if (refreshUsage) {

            await refreshUsage();

          }


          setSuccess(
            'Your Genviq Pro subscription is already active.'
          );


          alert(
            'You already have an active Genviq Pro subscription.'
          );


          setLoading(false);

          return;

        }


        /* =============================================
           NORMAL SERVER ERROR
        ============================================= */

        if (!createResponse.ok) {

          throw new Error(

            createData?.message ||

            `Unable to create subscription. Server returned ${createResponse.status}.`

          );

        }


        if (
          createData?.success === false
        ) {

          throw new Error(

            createData?.message ||

            'Unable to create Genviq Pro subscription.'

          );

        }


        /* =============================================
           EXISTING ACTIVE SUBSCRIPTION SYNCHRONIZED

           This is the exact case we just fixed:

           Razorpay:
           active

           Neon BEFORE:
           free / created

           Backend:
           synchronizes Neon

           Neon AFTER:
           pro / active


           IMPORTANT:

           Backend intentionally does NOT need to return
           a Razorpay public key here because Checkout
           should NOT open.
        ============================================= */

        if (
          createData?.alreadyPro === true ||
          createData?.plan === 'pro' ||
          createData?.synchronized === true
        ) {

          console.log(
            '👑 Genviq Pro subscription synchronized:',
            createData
          );


          /* ===========================================
             REFRESH USAGE CONTEXT

             No full page reload is required for the
             context itself.

             UsageContext fetches the updated Neon plan:

             plan = pro
          =========================================== */

          if (refreshUsage) {

            await refreshUsage();

          }


          setSuccess(
            'Your Genviq Pro subscription is active.'
          );


          alert(
            'You already have an active Genviq Pro subscription.'
          );


          setLoading(false);

          return;

        }


        /* =============================================
           USER REALLY NEEDS CHECKOUT

           Only NOW do we load Razorpay's browser script.

           This prevents unnecessary Razorpay loading
           for existing Pro users.
        ============================================= */

        const loaded =
          await loadRazorpayScript();


        if (!loaded) {

          throw new Error(
            'Unable to load Razorpay Checkout. Please check your internet connection.'
          );

        }


        /* =============================================
           GET RAZORPAY SUBSCRIPTION ID

           Supported backend response shapes:

           subscription.id

           subscriptionId

           id
        ============================================= */

        const subscriptionId =

          createData?.subscription?.id ||

          createData?.subscriptionId ||

          createData?.id;


        /* =============================================
           GET PUBLIC RAZORPAY KEY

           This is the PUBLIC Key ID only.

           RAZORPAY_KEY_SECRET must NEVER be sent to
           the frontend.

           Supported response shapes:

           keyId
           key
           razorpayKeyId
        ============================================= */

        const razorpayKey =

          createData?.keyId ||

          createData?.key ||

          createData?.razorpayKeyId;


        /* =============================================
           VALIDATE SUBSCRIPTION ID
        ============================================= */

        if (!subscriptionId) {

          console.error(
            'Full create response:',
            createData
          );

          throw new Error(
            'The backend did not return a Razorpay subscription ID.'
          );

        }


        /* =============================================
           VALIDATE PUBLIC KEY
        ============================================= */

        if (!razorpayKey) {

          console.error(
            'Full create response:',
            createData
          );

          throw new Error(
            'The backend did not return the Razorpay public key.'
          );

        }


        console.log(
          '✅ Razorpay Subscription ID:',
          subscriptionId
        );


        /* =============================================
           CONTINUE IN PART 2

           Next:

           - Razorpay Checkout options
           - payment success handler
           - /verify request
           - refreshUsage after Pro activation
           - payment failure handling
        ============================================= */

                /* =============================================
           RAZORPAY CHECKOUT OPTIONS

           This point is reached ONLY when:

           - User is signed in
           - User is NOT already Pro
           - Backend returned a valid subscription
           - Backend returned Razorpay public Key ID
           - Razorpay Checkout script loaded

           Because server/.env currently uses:

           RAZORPAY_KEY_ID=rzp_test_...

           Checkout runs in TEST MODE.
        ============================================= */

        const options = {


          /* ===========================================
             PUBLIC RAZORPAY KEY

             Safe to use in frontend.

             NEVER expose:
             RAZORPAY_KEY_SECRET
          =========================================== */

          key:
            razorpayKey,


          /* ===========================================
             RAZORPAY SUBSCRIPTION ID

             Example:

             sub_xxxxxxxxx

             This was created/retrieved by our backend.
          =========================================== */

          subscription_id:
            subscriptionId,


          /* ===========================================
             CHECKOUT INFORMATION
          =========================================== */

          name:
            'Genviq',


          description:
            'Genviq Pro - ₹49/month',


          /* ===========================================
             PAYMENT / MANDATE SUCCESS HANDLER

             Razorpay Checkout returns:

             razorpay_payment_id

             razorpay_subscription_id

             razorpay_signature


             IMPORTANT:

             We DO NOT trust frontend success alone.

             We send all three values to our backend:

             POST /api/subscription/verify

             Backend then:

             1. Verifies cryptographic signature

             2. Checks subscription belongs to user

             3. Fetches subscription from Razorpay

             4. Checks Razorpay plan

             5. Checks active/authenticated status

             6. Updates Neon:

                plan = pro
          =========================================== */

          handler:
            async (response) => {

              try {


                console.log(
                  '✅ Razorpay checkout response:',
                  response
                );


                /* =====================================
                   SHOW VERIFYING STATE
                ===================================== */

                setLoading(true);

                setError('');


                setSuccess(
                  'Payment successful. Verifying your Genviq Pro subscription...'
                );


                /* =====================================
                   GET FRESH CLERK TOKEN

                   We intentionally request a fresh token
                   instead of reusing the earlier token.

                   Checkout may have remained open for
                   some time.
                ===================================== */

                const verifyToken =
                  await getToken();


                if (!verifyToken) {

                  throw new Error(
                    'Unable to verify your login session.'
                  );

                }


                /* =====================================
                   VERIFY SUBSCRIPTION WITH BACKEND
                ===================================== */

                const verifyResponse =
                  await fetch(

                    `${API_URL}/api/subscription/verify`,

                    {

                      method:
                        'POST',

                      headers: {

                        'Content-Type':
                          'application/json',

                        Authorization:
                          `Bearer ${verifyToken}`,

                      },

                      body:
                        JSON.stringify({

                          razorpay_payment_id:
                            response.razorpay_payment_id,

                          razorpay_subscription_id:
                            response.razorpay_subscription_id,

                          razorpay_signature:
                            response.razorpay_signature,

                        }),

                    }

                  );


                /* =====================================
                   READ VERIFY RESPONSE
                ===================================== */

                const verifyData =
                  await verifyResponse.json();


                console.log(
                  '🔐 Subscription verification response:',
                  verifyData
                );


                /* =====================================
                   HTTP ERROR
                ===================================== */

                if (!verifyResponse.ok) {

                  throw new Error(

                    verifyData?.message ||

                    `Verification failed with status ${verifyResponse.status}.`

                  );

                }


                /* =====================================
                   APPLICATION ERROR
                ===================================== */

                if (
                  verifyData?.success === false
                ) {

                  throw new Error(

                    verifyData?.message ||

                    'Razorpay subscription verification failed.'

                  );

                }


                /* =====================================
                   VERIFICATION SUCCESS

                   Backend should now have:

                   Neon:

                   plan = "pro"

                   subscription_status =
                   "active" / "authenticated"
                ===================================== */

                console.log(
                  '👑 Genviq Pro successfully activated'
                );


                setSuccess(
                  'Welcome to Genviq Pro! Your subscription has been activated.'
                );


                /* =====================================
                   REFRESH USAGE CONTEXT

                   This is important.

                   Instead of relying only on:

                   window.location.reload()

                   we immediately ask UsageContext to
                   fetch the updated plan from Neon.

                   GET /api/user/usage

                         ↓

                   plan = pro

                         ↓

                   isPro = true

                         ↓

                   UI automatically changes.
                ===================================== */

                if (refreshUsage) {

                  await refreshUsage();

                }


                /* =====================================
                   OPTIONAL PAGE REFRESH

                   UsageContext should already update
                   React state.

                   A short delayed refresh also ensures
                   other components outside this context
                   pick up the latest subscription state.

                   We keep this because your current app
                   may have other plan-dependent UI.
                ===================================== */

                setTimeout(() => {

                  window.location.reload();

                }, 1200);


              } catch (
                verificationError
              ) {


                console.error(
                  '❌ Payment verification error:',
                  verificationError
                );


                setSuccess('');


                setError(

                  verificationError?.message ||

                  'Payment completed but subscription verification failed.'

                );


              } finally {


                setLoading(false);


              }

            },


          /* ===========================================
             PREFILL USER DETAILS

             These values come from Clerk.

             They only improve checkout UX.
          =========================================== */

          prefill: {


            name:

              user?.fullName ||

              '',


            email:

              user
                ?.primaryEmailAddress
                ?.emailAddress ||

              '',


          },


          /* ===========================================
             NOTES

             Helpful metadata in Razorpay dashboard.

             IMPORTANT:

             These notes are NOT used as proof that a
             user paid.

             Backend verification remains the source
             of truth.
          =========================================== */

          notes: {


            product:
              'Genviq Pro',


            plan:
              'Monthly',


          },


          /* ===========================================
             CHECKOUT THEME

             Keeping your existing yellow/gold Genviq
             Pro styling.
          =========================================== */

          theme: {


            color:
              '#F59E0B',


          },


          /* ===========================================
             CHECKOUT MODAL EVENTS
          =========================================== */

          modal: {


            ondismiss: () => {


              console.log(
                'Razorpay Checkout closed'
              );


              setLoading(false);


            },


          },


        };


        /* =============================================
           CREATE RAZORPAY CHECKOUT INSTANCE
        ============================================= */

        const razorpay =
          new window.Razorpay(
            options
          );


        /* =============================================
           PAYMENT FAILED EVENT

           This handles Razorpay Checkout failures.

           It does NOT mark the user Pro.
        ============================================= */

        razorpay.on(

          'payment.failed',

          (response) => {


            console.error(
              '❌ Razorpay payment failed:',
              response?.error
            );


            setLoading(false);

            setSuccess('');


            setError(

              response
                ?.error
                ?.description ||

              'The test payment failed. Please try again.'

            );


          }

        );


        /* =============================================
           OPEN RAZORPAY CHECKOUT

           This only happens for a FREE user who does
           not already have an active subscription.
        ============================================= */

        razorpay.open();


        /* =============================================
           CHECKOUT IS NOW OPEN

           Remove loading spinner from the underlying
           page while Razorpay modal handles the flow.
        ============================================= */

        setLoading(false);


      } catch (
        upgradeError
      ) {


        /* =============================================
           UPGRADE FLOW ERROR
        ============================================= */

        console.error(
          '❌ Genviq upgrade error:',
          upgradeError
        );


        setSuccess('');


        setError(

          upgradeError?.message ||

          'Unable to start Razorpay Checkout.'

        );


        setLoading(false);


      }

    };


  /* =====================================================
     JSX

     From here we keep your existing UI structure:

     OUR PLANS

     Free Plan
          +
     Genviq Pro

     The visual design is NOT being redesigned.

     The important behavior change will be:

     FREE:

     [ ⚡ Upgrade to Genviq Pro ]


     PRO:

     [ 👑 Current Pro Subscription ]

     The Pro button will:

     - Look dimmed
     - Remain clickable
     - Show an alert when clicked
     - Never open Razorpay again
  ===================================================== */

  return (

    <div
      className="
        max-w-7xl
        mx-auto
        z-20
        my-30
        px-4
      "
    >


      {/* =============================================
          HEADING
      ============================================== */}

      <div
        className="text-center"
      >


        <motion.h2

          initial={{
            opacity: 0,
            y: 20,
          }}

          whileInView={{
            opacity: 1,
            y: 0,
          }}

          transition={{
            duration: 0.5,
            delay: 0.3,
          }}

          viewport={{
            once: true,
          }}

          className="
            text-white
            text-5xl
            sm:text-6xl
            lg:text-7xl
            font-bold
            mb-6
            leading-tight
          "

        >

          OUR PLANS

        </motion.h2>


        <motion.p

          initial={{
            opacity: 0,
            y: 20,
          }}

          whileInView={{
            opacity: 1,
            y: 0,
          }}

          transition={{
            duration: 0.5,
            delay: 0.4,
          }}

          viewport={{
            once: true,
          }}

          className="
            text-gray-400
            text-xl
            max-w-3xl
            mx-auto
            leading-relaxed
          "

        >

          Choose the plan that works best for you

        </motion.p>


      </div>


      {/* =============================================
          PRICING CARDS

          Responsive behavior:

          Mobile:
          1 column

          Tablet/Desktop:
          2 columns
      ============================================== */}

      <div

        className="
          mt-14
          grid
          grid-cols-1
          md:grid-cols-2
          gap-6
          max-w-5xl
          mx-auto
        "

      >


        {/* ===========================================
            FREE PLAN CARD
        ============================================ */}

        <motion.div

          initial={{
            opacity: 0,
            y: 30,
          }}

          whileInView={{
            opacity: 1,
            y: 0,
          }}

          transition={{
            duration: 0.5,
            delay: 0.2,
          }}

          viewport={{
            once: true,
          }}

          className="
            relative
            bg-gradient-to-br
            from-gray-900
            to-black
            border
            border-gray-700
            rounded-2xl
            p-7
          "

        >


          {/* =========================================
              FREE ICON
          ========================================== */}

          <div

            className="
              w-12
              h-12
              rounded-xl
              bg-gray-800
              border
              border-gray-700
              flex
              items-center
              justify-center
              mb-5
            "

          >

            <Sparkles

              className="
                w-6
                h-6
                text-gray-300
              "

            />

          </div>


          {/* =========================================
              FREE TITLE
          ========================================== */}

          <h3

            className="
              text-white
              text-2xl
              font-bold
            "

          >

            Free

          </h3>


          <p

            className="
              text-gray-400
              text-sm
              mt-2
            "

          >

            Explore Genviq and try every AI tool.

          </p>


          {/* =========================================
              FREE PRICE
          ========================================== */}

          <div
            className="mt-7"
          >


            <span

              className="
                text-5xl
                font-bold
                text-white
              "

            >

              ₹0

            </span>


            <span

              className="
                text-gray-500
                ml-2
              "

            >

              forever

            </span>


          </div>


          {/* =========================================
              FREE FEATURES

              CONTINUES IN PART 3
          ========================================== */}

                    {/* =========================================
              FREE FEATURES
          ========================================== */}

          <div
            className="
              mt-8
              space-y-4
            "
          >

            {[
              '5 AI article generations',
              '5 blog title generations',
              '5 AI image generations',
              '5 background removals',
              '5 object removals',
              '5 resume analyses',
            ].map(
              (
                feature,
                index
              ) => (

                <div

                  key={
                    index
                  }

                  className="
                    flex
                    items-center
                    gap-3
                    text-gray-300
                  "

                >

                  <div

                    className="
                      w-5
                      h-5
                      rounded-full
                      bg-gray-800
                      border
                      border-gray-700
                      flex
                      items-center
                      justify-center
                      flex-shrink-0
                    "

                  >

                    <Check

                      className="
                        w-3
                        h-3
                        text-gray-300
                      "

                    />

                  </div>


                  <span
                    className="text-sm"
                  >

                    {feature}

                  </span>

                </div>

              )
            )}

          </div>


          {/* =========================================
              FREE PLAN CURRENT BUTTON

              If user is NOT Pro:

              This is their current plan.

              If user IS Pro:

              We simply show that Free is the basic
              available tier, while Pro is current.
          ========================================== */}

          <button

            type="button"

            disabled

            className="
              mt-8
              w-full
              py-3.5
              rounded-xl
              border
              border-gray-700
              bg-gray-800/60
              text-gray-400
              font-semibold
              cursor-not-allowed
            "

          >

            {
              isPro
                ? 'Free Plan'
                : 'Current Plan'
            }

          </button>


        </motion.div>


        {/* ===========================================
            GENVIQ PRO CARD

            This card reacts to the REAL plan coming
            from Neon through UsageContext.

            FREE USER:

            isPro = false

            Button:
            Upgrade to Genviq Pro


            PRO USER:

            isPro = true

            Button:
            Current Pro Subscription

            The button becomes visually dimmed but
            remains clickable so we can show:

            "You already have an active Genviq Pro
            subscription."
        ============================================ */}

        <motion.div

          initial={{
            opacity: 0,
            y: 30,
          }}

          whileInView={{
            opacity: 1,
            y: 0,
          }}

          transition={{
            duration: 0.5,
            delay: 0.3,
          }}

          viewport={{
            once: true,
          }}

          className={`
            relative
            rounded-2xl
            p-[1px]
            overflow-hidden
            transition-all
            duration-300

            ${
              isPro

                ? `
                  bg-gradient-to-br
                  from-yellow-500/50
                  via-amber-500/20
                  to-yellow-700/30
                `

                : `
                  bg-gradient-to-br
                  from-yellow-400
                  via-amber-500
                  to-yellow-700
                `
            }
          `}

        >


          {/* =========================================
              PRO CARD INNER
          ========================================== */}

          <div

            className={`
              relative
              h-full
              rounded-2xl
              p-7
              overflow-hidden

              ${
                isPro

                  ? `
                    bg-gradient-to-br
                    from-[#17130a]
                    via-[#0d0d0d]
                    to-black
                  `

                  : `
                    bg-gradient-to-br
                    from-[#16120a]
                    via-[#0b0b0b]
                    to-black
                  `
              }
            `}

          >


            {/* =======================================
                BACKGROUND GLOW
            ======================================== */}

            <div

              className="
                absolute
                -top-20
                -right-20
                w-52
                h-52
                rounded-full
                bg-yellow-500/10
                blur-3xl
                pointer-events-none
              "

            />


            {/* =======================================
                POPULAR / ACTIVE BADGE

                FREE USER:
                MOST POPULAR

                PRO USER:
                ACTIVE PLAN
            ======================================== */}

            <div

              className={`
                absolute
                top-5
                right-5
                px-3
                py-1.5
                rounded-full
                text-[11px]
                font-bold
                uppercase
                tracking-wider
                border

                ${
                  isPro

                    ? `
                      bg-green-500/10
                      border-green-500/30
                      text-green-400
                    `

                    : `
                      bg-yellow-500/10
                      border-yellow-500/30
                      text-yellow-400
                    `
                }
              `}

            >

              {
                isPro
                  ? 'Active Plan'
                  : 'Most Popular'
              }

            </div>


            {/* =======================================
                PRO ICON
            ======================================== */}

            <div

              className={`
                relative
                w-12
                h-12
                rounded-xl
                flex
                items-center
                justify-center
                mb-5
                border

                ${
                  isPro

                    ? `
                      bg-yellow-500/10
                      border-yellow-500/20
                    `

                    : `
                      bg-yellow-500/15
                      border-yellow-500/30
                    `
                }
              `}

            >

              <Crown

                className={`
                  w-6
                  h-6

                  ${
                    isPro
                      ? 'text-yellow-300'
                      : 'text-yellow-400'
                  }
                `}

              />

            </div>


            {/* =======================================
                PRO TITLE
            ======================================== */}

            <div
              className="relative"
            >

              <div

                className="
                  flex
                  items-center
                  gap-2
                  flex-wrap
                "

              >

                <h3

                  className="
                    text-white
                    text-2xl
                    font-bold
                  "

                >

                  Genviq Pro

                </h3>


                {
                  isPro && (

                    <span

                      className="
                        inline-flex
                        items-center
                        gap-1
                        px-2
                        py-1
                        rounded-md
                        bg-yellow-500/10
                        border
                        border-yellow-500/20
                        text-yellow-300
                        text-[10px]
                        uppercase
                        tracking-wider
                        font-bold
                      "

                    >

                      <Crown
                        className="
                          w-3
                          h-3
                        "
                      />

                      Current

                    </span>

                  )
                }

              </div>


              <p

                className="
                  text-gray-400
                  text-sm
                  mt-2
                  max-w-sm
                "

              >

                {
                  isPro

                    ? 'Your Genviq Pro subscription is currently active.'

                    : 'Unlock unlimited access and get the most out of every Genviq AI tool.'
                }

              </p>

            </div>


            {/* =======================================
                PRO PRICE
            ======================================== */}

            <div

              className="
                relative
                mt-7
              "

            >

              <span

                className="
                  text-5xl
                  font-bold
                  text-white
                "

              >

                ₹49

              </span>


              <span

                className="
                  text-gray-500
                  ml-2
                "

              >

                / month

              </span>


            </div>


            {/* =======================================
                BILLING NOTE
            ======================================== */}

            <p

              className="
                relative
                text-xs
                text-gray-500
                mt-2
              "

            >

              Monthly subscription • Cancel according to your billing terms

            </p>


            {/* =======================================
                PRO FEATURES
            ======================================== */}

            <div

              className="
                relative
                mt-8
                space-y-4
              "

            >

              {[
                'Unlimited AI article generation',
                'Unlimited blog title generation',
                'Unlimited AI image generation',
                'Unlimited background removal',
                'Unlimited object removal',
                'Unlimited resume analysis',
                'Priority access to future Genviq tools',
              ].map(
                (
                  feature,
                  index
                ) => (

                  <div

                    key={
                      index
                    }

                    className="
                      flex
                      items-center
                      gap-3
                      text-gray-200
                    "

                  >

                    <div

                      className="
                        w-5
                        h-5
                        rounded-full
                        bg-yellow-500/10
                        border
                        border-yellow-500/25
                        flex
                        items-center
                        justify-center
                        flex-shrink-0
                      "

                    >

                      <Check

                        className="
                          w-3
                          h-3
                          text-yellow-400
                        "

                      />

                    </div>


                    <span
                      className="text-sm"
                    >

                      {feature}

                    </span>

                  </div>

                )
              )}

            </div>


            {/* =======================================
                SUCCESS MESSAGE
            ======================================== */}

            {
              success && (

                <div

                  className="
                    relative
                    mt-6
                    px-4
                    py-3
                    rounded-xl
                    bg-green-500/10
                    border
                    border-green-500/20
                    text-green-400
                    text-sm
                    leading-relaxed
                  "

                >

                  {success}

                </div>

              )
            }


            {/* =======================================
                ERROR MESSAGE
            ======================================== */}

            {
              error && (

                <div

                  className="
                    relative
                    mt-6
                    px-4
                    py-3
                    rounded-xl
                    bg-red-500/10
                    border
                    border-red-500/20
                    text-red-400
                    text-sm
                    leading-relaxed
                  "

                >

                  {error}

                </div>

              )
            }


            {/* =======================================
                PRO / UPGRADE BUTTON

                IMPORTANT:

                We only disable this button while an
                actual request is processing.

                We DO NOT use:

                disabled={isPro}

                because a disabled button cannot fire
                onClick.

                PRO USER:

                Button looks dimmed
                     ↓
                Still clickable
                     ↓
                handleProButtonClick()
                     ↓
                Alert
                     ↓
                Razorpay never opens
            ======================================== */}

            <button

              type="button"

              onClick={
                handleProButtonClick
              }

              disabled={
                loading
              }

              className={`
                relative
                mt-8
                w-full
                min-h-[52px]
                px-5
                py-3.5
                rounded-xl
                font-bold
                flex
                items-center
                justify-center
                gap-2
                transition-all
                duration-300

                ${
                  isPro

                    ? `
                      bg-yellow-500/10
                      border
                      border-yellow-500/20
                      text-yellow-300
                      opacity-60
                      hover:opacity-75
                      cursor-pointer
                    `

                    : `
                      bg-gradient-to-r
                      from-yellow-400
                      to-amber-500
                      text-black
                      shadow-lg
                      shadow-yellow-500/10
                      hover:from-yellow-500
                      hover:to-amber-600
                      hover:shadow-yellow-500/20
                      hover:-translate-y-0.5
                      cursor-pointer
                    `
                }

                ${
                  loading

                    ? `
                      opacity-60
                      cursor-not-allowed
                      pointer-events-none
                    `

                    : ''
                }
              `}

            >


              {/* =====================================
                  LOADING STATE
              ====================================== */}

              {
                loading ? (

                  <>

                    <Loader2

                      className="
                        w-4
                        h-4
                        animate-spin
                      "

                    />

                    Processing...

                  </>

                ) : isPro ? (


                  /* =================================
                     CURRENT PRO STATE
                  ================================== */

                  <>

                    <Crown

                      className="
                        w-4
                        h-4
                      "

                    />

                    Current Pro Subscription

                  </>

                ) : (


                  /* =================================
                     FREE USER UPGRADE STATE
                  ================================== */

                  <>

                    <Zap

                      className="
                        w-4
                        h-4
                      "

                    />

                    Upgrade to Genviq Pro

                  </>

                )
              }


            </button>


            {/* =======================================
                PRO ACTIVE INFORMATION

                Only visible for a Pro user.
            ======================================== */}

            {
              isPro && (

                <div

                  className="
                    relative
                    mt-4
                    flex
                    items-center
                    justify-center
                    gap-2
                    text-xs
                    text-gray-500
                    text-center
                  "

                >

                  <span

                    className="
                      inline-block
                      w-1.5
                      h-1.5
                      rounded-full
                      bg-green-400
                    "

                  />

                  Subscription status:

                  <span
                    className="
                      text-green-400
                      capitalize
                    "
                  >

                    {
                      subscriptionStatus ||
                      'active'
                    }

                  </span>

                </div>

              )
            }


          </div>

        </motion.div>


      </div>


      {/* =============================================
          PLAN STATUS INFORMATION

          This small section uses the real Neon plan.

          It also gives the user a clear indication that
          their account has already updated after payment.
      ============================================== */}

      {
        isSignedIn && (

          <motion.div

            initial={{
              opacity: 0,
              y: 15,
            }}

            whileInView={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.4,
              delay: 0.2,
            }}

            viewport={{
              once: true,
            }}

            className="
              max-w-5xl
              mx-auto
              mt-6
            "

          >

            <div

              className="
                flex
                flex-col
                sm:flex-row
                sm:items-center
                sm:justify-between
                gap-3
                px-5
                py-4
                rounded-xl
                bg-white/[0.02]
                border
                border-white/[0.06]
              "

            >

              <div>

                <p

                  className="
                    text-sm
                    text-gray-500
                  "

                >

                  Current Genviq account plan

                </p>


                <div

                  className="
                    flex
                    items-center
                    gap-2
                    mt-1
                  "

                >

                  {
                    isPro && (

                      <Crown

                        className="
                          w-4
                          h-4
                          text-yellow-400
                        "

                      />

                    )
                  }


                  <span

                    className={`
                      font-semibold

                      ${
                        isPro
                          ? 'text-yellow-300'
                          : 'text-white'
                      }
                    `}

                  >

                    {
                      isPro
                        ? 'Genviq Pro'
                        : 'Free'
                    }

                  </span>

                </div>

              </div>


              {
                isPro && (

                  <div

                    className="
                      inline-flex
                      items-center
                      gap-2
                      self-start
                      sm:self-auto
                      px-3
                      py-1.5
                      rounded-full
                      bg-green-500/10
                      border
                      border-green-500/20
                      text-green-400
                      text-xs
                      font-medium
                    "

                  >

                    <span

                      className="
                        w-1.5
                        h-1.5
                        rounded-full
                        bg-green-400
                      "

                    />

                    Active subscription

                  </div>

                )
              }


            </div>

          </motion.div>

        )
      }


      {/* =============================================
          CONTINUES IN PART 4

          Part 4 finishes:

          - Remaining bottom content from Plans.jsx
          - Any FAQ / information section
          - Closing JSX
          - export default Plans

          IMPORTANT:

          Do not add the final closing component braces
          yourself yet.
      ============================================== */}

            {/* =============================================
          IMPORTANT INFORMATION
      ============================================== */}

      <motion.div

        initial={{
          opacity: 0,
          y: 20,
        }}

        whileInView={{
          opacity: 1,
          y: 0,
        }}

        transition={{
          duration: 0.5,
          delay: 0.2,
        }}

        viewport={{
          once: true,
        }}

        className="
          max-w-5xl
          mx-auto
          mt-16
          mb-10
        "

      >

        <div

          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-4
          "

        >


          {/* =========================================
              SECURE PAYMENTS
          ========================================== */}

          <div

            className="
              p-5
              rounded-xl
              bg-white/[0.02]
              border
              border-white/[0.06]
            "

          >

            <div

              className="
                w-9
                h-9
                rounded-lg
                bg-yellow-500/10
                border
                border-yellow-500/20
                flex
                items-center
                justify-center
                mb-4
              "

            >

              <Check

                className="
                  w-4
                  h-4
                  text-yellow-400
                "

              />

            </div>


            <h4

              className="
                text-white
                font-semibold
                text-sm
              "

            >

              Secure Payments

            </h4>


            <p

              className="
                text-gray-500
                text-xs
                leading-relaxed
                mt-2
              "

            >

              Subscription payments are securely processed
              through Razorpay.

            </p>

          </div>


          {/* =========================================
              INSTANT ACTIVATION
          ========================================== */}

          <div

            className="
              p-5
              rounded-xl
              bg-white/[0.02]
              border
              border-white/[0.06]
            "

          >

            <div

              className="
                w-9
                h-9
                rounded-lg
                bg-yellow-500/10
                border
                border-yellow-500/20
                flex
                items-center
                justify-center
                mb-4
              "

            >

              <Zap

                className="
                  w-4
                  h-4
                  text-yellow-400
                "

              />

            </div>


            <h4

              className="
                text-white
                font-semibold
                text-sm
              "

            >

              Fast Activation

            </h4>


            <p

              className="
                text-gray-500
                text-xs
                leading-relaxed
                mt-2
              "

            >

              Your Pro access is activated after your
              subscription is securely verified.

            </p>

          </div>


          {/* =========================================
              PRO ACCESS
          ========================================== */}

          <div

            className="
              p-5
              rounded-xl
              bg-white/[0.02]
              border
              border-white/[0.06]
            "

          >

            <div

              className="
                w-9
                h-9
                rounded-lg
                bg-yellow-500/10
                border
                border-yellow-500/20
                flex
                items-center
                justify-center
                mb-4
              "

            >

              <Crown

                className="
                  w-4
                  h-4
                  text-yellow-400
                "

              />

            </div>


            <h4

              className="
                text-white
                font-semibold
                text-sm
              "

            >

              Genviq Pro

            </h4>


            <p

              className="
                text-gray-500
                text-xs
                leading-relaxed
                mt-2
              "

            >

              Unlock unlimited access to Genviq AI tools
              while your Pro subscription is active.

            </p>

          </div>


        </div>

      </motion.div>


      {/* =============================================
          PRO USER MESSAGE

          This only appears when Neon says:

          plan = pro

          It gives another clear visual confirmation
          that the current account is subscribed.
      ============================================== */}

      {
        isPro && (

          <motion.div

            initial={{
              opacity: 0,
              scale: 0.98,
            }}

            animate={{
              opacity: 1,
              scale: 1,
            }}

            transition={{
              duration: 0.4,
            }}

            className="
              max-w-5xl
              mx-auto
              mb-16
            "

          >

            <div

              className="
                relative
                overflow-hidden
                px-6
                py-5
                rounded-2xl
                bg-gradient-to-r
                from-yellow-500/[0.06]
                via-amber-500/[0.03]
                to-transparent
                border
                border-yellow-500/15
              "

            >


              {/* Decorative glow */}

              <div

                className="
                  absolute
                  -right-12
                  -top-12
                  w-32
                  h-32
                  rounded-full
                  bg-yellow-500/10
                  blur-3xl
                  pointer-events-none
                "

              />


              <div

                className="
                  relative
                  flex
                  flex-col
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                  gap-4
                "

              >


                <div

                  className="
                    flex
                    items-start
                    gap-4
                  "

                >

                  <div

                    className="
                      w-11
                      h-11
                      rounded-xl
                      bg-yellow-500/10
                      border
                      border-yellow-500/20
                      flex
                      items-center
                      justify-center
                      flex-shrink-0
                    "

                  >

                    <Crown

                      className="
                        w-5
                        h-5
                        text-yellow-400
                      "

                    />

                  </div>


                  <div>

                    <h4

                      className="
                        text-white
                        font-semibold
                      "

                    >

                      You're on Genviq Pro

                    </h4>


                    <p

                      className="
                        text-gray-500
                        text-sm
                        mt-1
                      "

                    >

                      Your Pro subscription is currently{' '}

                      <span

                        className="
                          text-green-400
                          capitalize
                        "

                      >

                        {
                          subscriptionStatus ||
                          'active'
                        }

                      </span>

                      .

                    </p>

                  </div>

                </div>


                <div

                  className="
                    inline-flex
                    items-center
                    gap-2
                    self-start
                    sm:self-auto
                    px-3
                    py-2
                    rounded-lg
                    bg-yellow-500/10
                    border
                    border-yellow-500/20
                    text-yellow-300
                    text-xs
                    font-semibold
                    whitespace-nowrap
                  "

                >

                  <Crown
                    className="
                      w-3.5
                      h-3.5
                    "
                  />

                  PRO ACTIVE

                </div>


              </div>

            </div>

          </motion.div>

        )
      }


    </div>

  );

};


/* =====================================================
   EXPORT
===================================================== */

export default Plans;