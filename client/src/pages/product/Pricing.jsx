import React, { useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';

import {
  Sparkles,
  HelpCircle,
  Zap,
  Shield,
  Globe,
  Infinity,
  Check,
  Crown,
  Loader2,
} from 'lucide-react';

import Navbar from '../../components/Navbar';


/* =====================================================
   API URL

   Backend currently runs on:

   http://localhost:3000

   Later, when deployed, set:

   VITE_API_URL=https://your-backend-url.com
===================================================== */

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000';


/* =====================================================
   LOAD RAZORPAY CHECKOUT SCRIPT

   Razorpay Checkout requires:

   https://checkout.razorpay.com/v1/checkout.js

   We load it dynamically only when needed.
===================================================== */

const loadRazorpayScript = () => {
  return new Promise((resolve) => {

    /* -----------------------------------------------
       If Razorpay is already loaded,
       don't load the script again.
    ------------------------------------------------ */

    if (window.Razorpay) {
      resolve(true);
      return;
    }


    const script =
      document.createElement('script');

    script.src =
      'https://checkout.razorpay.com/v1/checkout.js';

    script.async = true;


    script.onload = () => {
      resolve(true);
    };


    script.onerror = () => {
      resolve(false);
    };


    document.body.appendChild(script);

  });
};


/* =====================================================
   ANIMATION VARIANTS
===================================================== */

const containerVariants = {

  hidden: {
    opacity: 0,
  },

  visible: {

    opacity: 1,

    transition: {
      staggerChildren: 0.1,
    },

  },

};


const itemVariants = {

  hidden: {
    opacity: 0,
    y: 20,
  },

  visible: {

    opacity: 1,
    y: 0,

    transition: {
      duration: 0.5,
    },

  },

};


/* =====================================================
   FEATURES DATA
===================================================== */

const features = [

  {

    icon: (
      <Zap className="w-5 h-5 text-purple-400" />
    ),

    title:
      'High Performance',

    description:
      'Lightning-fast AI processing with minimal latency for all your content generation needs.',

  },

  {

    icon: (
      <Shield className="w-5 h-5 text-purple-400" />
    ),

    title:
      'Secure & Private',

    description:
      'Your data is encrypted and protected with secure authentication and server-side payment verification.',

  },

  {

    icon: (
      <Globe className="w-5 h-5 text-purple-400" />
    ),

    title:
      'Available Anywhere',

    description:
      'Access Genviq and your AI-powered creation tools from anywhere with a modern web experience.',

  },

  {

    icon: (
      <Infinity className="w-5 h-5 text-purple-400" />
    ),

    title:
      'Powerful AI Tools',

    description:
      'Unlock enhanced access to Genviq AI tools with the Pro subscription.',

  },

];


/* =====================================================
   FAQ DATA
===================================================== */

const faqs = [

  {

    question:
      'Can I change plans anytime?',

    answer:
      'Yes. You can upgrade to Genviq Pro and manage your subscription according to your billing status.',

  },

  {

    question:
      'Is there a free plan?',

    answer:
      'Yes. Genviq includes a free plan with limited AI usage, so you can try the available tools before upgrading.',

  },

  {

    question:
      'What payment system does Genviq use?',

    answer:
      'Genviq uses Razorpay for secure subscription payments. During development, payments run in Razorpay Test Mode and no real money is charged.',

  },

  {

    question:
      'Can I cancel my subscription?',

    answer:
      'Yes. Subscription cancellation support can be provided while preserving access according to the remaining paid billing period.',

  },

];


/* =====================================================
   PRICING COMPONENT
===================================================== */

const Pricing = () => {


  /* ===================================================
     CLERK

     Clerk is still used for AUTHENTICATION.

     Clerk Billing / PricingTable is NOT used.

     getToken():

     Gives us the Clerk session token that our backend
     auth middleware uses to identify the user.
  =================================================== */

  const {
    getToken,
    isSignedIn,
  } = useAuth();


  const {
    user,
  } = useUser();


  /* ===================================================
     STATE
  =================================================== */

  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    message,
    setMessage,
  ] = useState('');


  const [
    error,
    setError,
  ] = useState('');


  /* ===================================================
     UPGRADE TO GENVIQ PRO

     FLOW:

     Click Upgrade

          ↓

     Load Razorpay Checkout

          ↓

     Get Clerk auth token

          ↓

     POST /api/subscription/create

          ↓

     Backend creates Razorpay subscription

          ↓

     Razorpay Test Checkout opens

          ↓

     Test payment succeeds

          ↓

     Razorpay returns:

     razorpay_payment_id
     razorpay_subscription_id
     razorpay_signature

          ↓

     POST /api/subscription/verify

          ↓

     Backend verifies payment

          ↓

     Neon:

     plan = "pro"
  =================================================== */

  const handleUpgrade = async () => {

    try {

      setError('');

      setMessage('');


      /* ===============================================
         CHECK AUTHENTICATION
      =============================================== */

      if (!isSignedIn) {

        setError(
          'Please sign in before upgrading to Genviq Pro.'
        );

        return;

      }


      setLoading(true);


      /* ===============================================
         LOAD RAZORPAY CHECKOUT
      =============================================== */

      const razorpayLoaded =
        await loadRazorpayScript();


      if (!razorpayLoaded) {

        throw new Error(
          'Unable to load Razorpay Checkout. Please check your internet connection.'
        );

      }


      /* ===============================================
         GET CLERK TOKEN
      =============================================== */

      const token =
        await getToken();


      if (!token) {

        throw new Error(
          'Unable to verify your login session. Please sign in again.'
        );

      }


      /* ===============================================
         CREATE SUBSCRIPTION

         IMPORTANT:

         We do NOT send:

         amount: 49

         from the frontend.

         The backend uses:

         RAZORPAY_PLAN_ID

         so users cannot manipulate the subscription
         price from browser DevTools.
      =============================================== */

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


      const createData =
        await createResponse.json();


      if (
        !createResponse.ok ||
        !createData.success
      ) {

        throw new Error(

          createData.message ||

          'Unable to create Genviq Pro subscription.'

        );

      }


      /* ===============================================
         GET SUBSCRIPTION ID

         Supports the response structure from our
         subscriptionController:

         {
           success: true,

           keyId: "...",

           subscription: {
             id: "sub_..."
           }
         }
      =============================================== */

      const subscriptionId =
        createData?.subscription?.id;


      const razorpayKeyId =
        createData?.keyId;


      if (!subscriptionId) {

        throw new Error(
          'Razorpay subscription ID was not returned by the server.'
        );

      }


      if (!razorpayKeyId) {

        throw new Error(
          'Razorpay checkout key was not returned by the server.'
        );

      }


      /* ===============================================
         RAZORPAY CHECKOUT OPTIONS

         TEST MODE:

         If your backend uses:

         RAZORPAY_KEY_ID=rzp_test_...

         Razorpay Checkout runs in Test Mode.

         NO REAL MONEY is charged.
      =============================================== */

      const options = {

        key:
          razorpayKeyId,

        subscription_id:
          subscriptionId,

        name:
          'Genviq',

        description:
          'Genviq Pro - ₹49/month',

        image:
          undefined,


        /* =============================================
           SUCCESS HANDLER

           Razorpay calls this after successful
           checkout.

           We DO NOT trust this alone.

           We send the response to our backend for
           cryptographic signature verification.
        ============================================= */

        handler:
          async (response) => {

            try {

              setLoading(true);

              setError('');

              setMessage(
                'Payment completed. Verifying your Genviq Pro subscription...'
              );


              /* =======================================
                 GET A FRESH CLERK TOKEN
              ======================================= */

              const verificationToken =
                await getToken();


              if (!verificationToken) {

                throw new Error(
                  'Your login session could not be verified.'
                );

              }


              /* =======================================
                 VERIFY PAYMENT ON BACKEND
              ======================================= */

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
                        `Bearer ${verificationToken}`,

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


              const verifyData =
                await verifyResponse.json();


              if (
                !verifyResponse.ok ||
                !verifyData.success
              ) {

                throw new Error(

                  verifyData.message ||

                  'Payment verification failed.'

                );

              }


              /* =======================================
                 SUCCESS

                 Backend has verified the payment.

                 Neon should now contain:

                 plan = pro
              ======================================= */

              setMessage(
                'Welcome to Genviq Pro! Your subscription has been activated successfully.'
              );


              /*
                Give the user a moment to see success,
                then refresh.

                This allows your existing user/usage
                context to fetch the updated Neon plan.
              */

              setTimeout(() => {

                window.location.reload();

              }, 1500);


            } catch (verificationError) {

              console.error(

                'Razorpay verification error:',

                verificationError

              );


              setError(

                verificationError.message ||

                'Your payment completed, but we could not verify the subscription.'

              );


            } finally {

              setLoading(false);

            }

          },


        /* =============================================
           PREFILL

           Uses authenticated Clerk user details.

           These are only convenience values for
           Razorpay Checkout.
        ============================================= */

        prefill: {

          name:
            user?.fullName ||
            '',

          email:
            user?.primaryEmailAddress
              ?.emailAddress ||
            '',

        },


        /* =============================================
           NOTES
        ============================================= */

        notes: {

          product:
            'Genviq Pro',

          billing:
            'monthly',

        },


        /* =============================================
           THEME

           Only affects Razorpay's hosted checkout.
        ============================================= */

        theme: {

          color:
            '#9333ea',

        },


        /* =============================================
           CHECKOUT MODAL EVENTS
        ============================================= */

        modal: {

          ondismiss: () => {

            setLoading(false);

            setMessage('');

          },

        },

      };


      /* ===============================================
         CREATE RAZORPAY CHECKOUT
      =============================================== */

      const razorpay =
        new window.Razorpay(
          options
        );


      /* ===============================================
         PAYMENT FAILURE EVENT
      =============================================== */

      razorpay.on(

        'payment.failed',

        (response) => {

          console.error(

            'Razorpay payment failed:',

            response?.error

          );


          setLoading(false);


          setError(

            response?.error?.description ||

            'The test payment failed. Please try again.'

          );

        }

      );


      /* ===============================================
         OPEN CHECKOUT
      =============================================== */

      razorpay.open();


      /*
        Checkout is now open.

        Remove the loading state so the Upgrade button
        does not remain visually stuck behind the modal.
      */

      setLoading(false);


    } catch (upgradeError) {

      console.error(

        'Genviq Pro upgrade error:',

        upgradeError

      );


      setError(

        upgradeError.message ||

        'Unable to start Genviq Pro checkout.'

      );


      setLoading(false);

    }

  };


  /* ===================================================
     JSX
  =================================================== */

  return (

    <div className="max-w-7xl mx-auto z-20 my-30 px-4">


      {/* =================================================
          NAVBAR
      ================================================= */}

      <div className="fixed top-0 left-0 w-full z-50 bg-opacity-70 backdrop-blur-md border-b border-purple-500/10">

        <Navbar />

      </div>


      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="text-center">

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

          className="text-white text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight"

        >

          CHOOSE YOUR PLAN

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

          className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed"

        >

          Start for free and scale up as you grow.
          Find the perfect plan for your AI content
          creation needs

        </motion.p>

      </div>


      {/* =================================================
          PRICING TABLE

          Clerk <PricingTable /> has been removed.

          Clerk is still used for authentication.

          Billing is now handled by Razorpay.
      ================================================= */}

      <div className="mt-14 max-sm:mx-2">


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">


          {/* =============================================
              FREE PLAN
          ============================================= */}

          <motion.div

            initial={{
              opacity: 0,
              y: 30,
            }}

            whileInView={{
              opacity: 1,
              y: 0,
            }}

            viewport={{
              once: true,
            }}

            transition={{
              duration: 0.5,
            }}

            whileHover={{
              y: -5,
            }}

            className="relative p-8 rounded-2xl border border-gray-800 backdrop-blur-sm transition-all duration-300"

          >


            <div className="mb-8">


              <div className="flex items-center gap-3 mb-4">

                <div className="p-2 rounded-lg border border-gray-700">

                  <Sparkles className="w-6 h-6 text-gray-300" />

                </div>


                <h3 className="text-2xl font-bold text-white">

                  Free

                </h3>

              </div>


              <p className="text-gray-400">

                Get started with Genviq AI tools.

              </p>

            </div>


            <div className="mb-8">

              <div className="flex items-end gap-2">

                <span className="text-5xl font-bold text-white">

                  ₹0

                </span>

                <span className="text-gray-400 mb-1">

                  / forever

                </span>

              </div>

            </div>


            <div className="space-y-4 mb-10">


              <div className="flex items-center gap-3 text-gray-300">

                <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />

                <span>

                  5 Article Generations

                </span>

              </div>


              <div className="flex items-center gap-3 text-gray-300">

                <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />

                <span>

                  5 Blog Title Generations

                </span>

              </div>


              <div className="flex items-center gap-3 text-gray-300">

                <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />

                <span>

                  5 Image Generations

                </span>

              </div>


              <div className="flex items-center gap-3 text-gray-300">

                <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />

                <span>

                  5 Background Removals

                </span>

              </div>


              <div className="flex items-center gap-3 text-gray-300">

                <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />

                <span>

                  5 Object Removals

                </span>

              </div>


              <div className="flex items-center gap-3 text-gray-300">

                <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />

                <span>

                  5 Resume Analyses

                </span>

              </div>

            </div>


            <div className="w-full py-3.5 rounded-xl border border-gray-700 text-center text-gray-300 font-semibold">

              Free Plan

            </div>


          </motion.div>


          {/* =============================================
              GENVIQ PRO PLAN
          ============================================= */}

          <motion.div

            initial={{
              opacity: 0,
              y: 30,
            }}

            whileInView={{
              opacity: 1,
              y: 0,
            }}

            viewport={{
              once: true,
            }}

            transition={{
              duration: 0.5,
              delay: 0.1,
            }}

            whileHover={{
              y: -5,
            }}

            className="relative p-8 rounded-2xl border border-purple-500/40 backdrop-blur-sm transition-all duration-300 shadow-2xl shadow-purple-500/10"

          >


            {/* Popular Badge */}

            <div className="absolute -top-4 left-1/2 -translate-x-1/2">

              <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold flex items-center gap-2 shadow-lg">

                <Crown className="w-4 h-4" />

                MOST POPULAR

              </div>

            </div>


            <div className="mb-8 mt-2">


              <div className="flex items-center gap-3 mb-4">

                <div className="p-2 rounded-lg border border-purple-500/30 bg-purple-600/10">

                  <Crown className="w-6 h-6 text-purple-400" />

                </div>


                <h3 className="text-2xl font-bold text-white">

                  Genviq Pro

                </h3>

              </div>


              <p className="text-gray-400">

                Unlock the full power of Genviq AI.

              </p>

            </div>


            <div className="mb-8">

              <div className="flex items-end gap-2">

                <span className="text-5xl font-bold text-white">

                  ₹49

                </span>

                <span className="text-gray-400 mb-1">

                  / month

                </span>

              </div>


              <p className="text-purple-300 text-sm mt-3">

                Razorpay Test Mode during development

              </p>

            </div>


            <div className="space-y-4 mb-10">


              <div className="flex items-center gap-3 text-gray-300">

                <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />

                <span>

                  Enhanced Article Generation

                </span>

              </div>


              <div className="flex items-center gap-3 text-gray-300">

                <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />

                <span>

                  Enhanced Blog Title Generation

                </span>

              </div>


              <div className="flex items-center gap-3 text-gray-300">

                <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />

                <span>

                  Enhanced AI Image Generation

                </span>

              </div>


              <div className="flex items-center gap-3 text-gray-300">

                <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />

                <span>

                  Background Removal

                </span>

              </div>


              <div className="flex items-center gap-3 text-gray-300">

                <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />

                <span>

                  Object Removal

                </span>

              </div>


              <div className="flex items-center gap-3 text-gray-300">

                <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />

                <span>

                  Advanced Resume Analysis

                </span>

              </div>

            </div>


            <motion.button

              whileHover={
                loading
                  ? {}
                  : {
                      scale: 1.02,
                    }
              }

              whileTap={
                loading
                  ? {}
                  : {
                      scale: 0.98,
                    }
              }

              onClick={
                handleUpgrade
              }

              disabled={
                loading
              }

              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"

            >

              {

                loading

                  ? (

                    <>

                      <Loader2 className="w-5 h-5 animate-spin" />

                      Processing...

                    </>

                  )

                  : (

                    <>

                      <Crown className="w-5 h-5" />

                      Upgrade to Genviq Pro

                    </>

                  )

              }

            </motion.button>


          </motion.div>


        </div>


        {/* =============================================
            PAYMENT STATUS
        ============================================= */}

        {

          message && (

            <div className="max-w-5xl mx-auto mt-6 p-4 rounded-xl border border-green-500/20 bg-green-500/5 text-green-300 text-center">

              {message}

            </div>

          )

        }


        {

          error && (

            <div className="max-w-5xl mx-auto mt-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-300 text-center">

              {error}

            </div>

          )

        }


      </div>


      {/* =================================================
          FEATURES SECTION
      ================================================= */}

      <motion.div

        variants={
          containerVariants
        }

        initial="hidden"

        whileInView="visible"

        viewport={{
          once: true,
        }}

        className="mb-28 mt-20"

      >


        <motion.h3

          variants={
            itemVariants
          }

          className="text-3xl lg:text-4xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"

        >

          All Plans Include

        </motion.h3>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">


          {

            features.map(

              (
                feature,
                index
              ) => (

                <motion.div

                  key={
                    index
                  }

                  variants={
                    itemVariants
                  }

                  whileHover={{
                    y: -5,
                    scale: 1.02,
                  }}

                  className="p-6 rounded-2xl border border-gray-800 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300 group"

                >


                  <div className="flex items-center gap-3 mb-4">


                    <div className="p-2 rounded-lg border border-purple-500/30 group-hover:bg-purple-600/20 transition-colors">

                      {
                        feature.icon
                      }

                    </div>


                    <h4 className="font-semibold text-white group-hover:text-purple-200 transition-colors">

                      {
                        feature.title
                      }

                    </h4>


                  </div>


                  <p className="text-gray-400 group-hover:text-gray-300 transition-colors">

                    {
                      feature.description
                    }

                  </p>


                </motion.div>

              )

            )

          }


        </div>


      </motion.div>


      {/* =================================================
          FAQ SECTION
      ================================================= */}

      <motion.div

        variants={
          containerVariants
        }

        initial="hidden"

        whileInView="visible"

        viewport={{
          once: true,
        }}

        className="mb-28"

      >


        <motion.h3

          variants={
            itemVariants
          }

          className="text-3xl lg:text-4xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"

        >

          Frequently Asked Questions

        </motion.h3>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">


          {

            faqs.map(

              (
                faq,
                index
              ) => (

                <motion.div

                  key={
                    index
                  }

                  variants={
                    itemVariants
                  }

                  className="p-6 rounded-2xl border border-gray-800 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300"

                >


                  <div className="flex items-start gap-4">


                    <HelpCircle className="w-5 h-5 mt-0.5 text-purple-400 flex-shrink-0" />


                    <div>


                      <h4 className="font-semibold text-white mb-3">

                        {
                          faq.question
                        }

                      </h4>


                      <p className="text-gray-400 leading-relaxed">

                        {
                          faq.answer
                        }

                      </p>


                    </div>


                  </div>


                </motion.div>

              )

            )

          }


        </div>


      </motion.div>


      {/* =================================================
          CTA SECTION
      ================================================= */}

      <motion.div

        initial={{
          opacity: 0,
          y: 40,
        }}

        whileInView={{
          opacity: 1,
          y: 0,
        }}

        viewport={{
          once: true,
        }}

        transition={{
          duration: 0.6,
        }}

        className="text-center mb-20"

      >


        <div className="px-8 py-12 rounded-2xl border border-purple-500/20 backdrop-blur-sm">


          <motion.h3

            initial={{
              opacity: 0,
              y: 20,
            }}

            whileInView={{
              opacity: 1,
              y: 0,
            }}

            viewport={{
              once: true,
            }}

            transition={{
              delay: 0.2,
            }}

            className="text-2xl lg:text-3xl font-bold text-white mb-4"

          >

            Still have questions?

          </motion.h3>


          <motion.p

            initial={{
              opacity: 0,
              y: 20,
            }}

            whileInView={{
              opacity: 1,
              y: 0,
            }}

            viewport={{
              once: true,
            }}

            transition={{
              delay: 0.3,
            }}

            className="text-gray-300 max-w-2xl mx-auto mb-8 text-lg"

          >

            Our team is here to help you choose the
            right plan for your specific needs and
            requirements.

          </motion.p>


        </div>


      </motion.div>


    </div>

  );

};


export default Pricing;