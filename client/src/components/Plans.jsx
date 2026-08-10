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


import {
  useUsage,
} from '../context/UsageContext';


const API_URL =
  import.meta.env.VITE_BASE_URL ||
  "https://genviq-backend.onrender.com";

 
const ACTIVE_SUBSCRIPTION_STATUSES = [
  'active',
  'authenticated',
];


const loadRazorpayScript = () => {

  return new Promise((resolve) => {


    if (window.Razorpay) {

      resolve(true);

      return;

    }

  
    const script =
      document.createElement(
        'script'
      );


    script.src =
      'https://checkout.razorpay.com/v1/checkout.js';


    script.async =
      true;


    script.onload = () => {

      resolve(true);

    };


    script.onerror = () => {

      resolve(false);

    };


    document.body.appendChild(
      script
    );

  });

};


const Plans = () => {


  const {
    getToken,
    isSignedIn,
  } = useAuth();


  const {
    user,
  } = useUser();



  const {
    plan,
    isPro,
    subscriptionStatus,
    refreshUsage,
  } = useUsage();


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


  const hasActiveProSubscription =

    isPro &&

    ACTIVE_SUBSCRIPTION_STATUSES.includes(
      subscriptionStatus
    );


  const handleProButtonClick =
    async () => {

      if (
        hasActiveProSubscription
      ) {

        alert(
          'You already have an active Tivion Pro subscription.'
        );

        return;

      }


      if (isPro) {

        alert(
          'You currently have a Tivion Pro subscription.'
        );

        return;

      }


      await handleUpgrade();

    };


  const handleUpgrade =
    async () => {

      try {

        setError('');

        setSuccess('');


        if (isPro) {

          alert(
            'You already have an active Tivion Pro subscription.'
          );

          return;

        }


        if (!isSignedIn) {

          setError(
            'Please sign in before upgrading to Tivion Pro.'
          );

          return;

        }

        setLoading(true);


        const token =
          await getToken();


        if (!token) {

          throw new Error(
            'Unable to verify your login session. Please sign in again.'
          );

        }


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


        console.log(
          '💳 Create subscription response:',
          createData
        );


        if (
          createResponse.status === 409 &&
          createData?.alreadyPro === true
        ) {

          console.log(
            'Backend confirmed existing Pro subscription'
          );


          if (refreshUsage) {

            await refreshUsage();

          }


          setSuccess(
            'Your Tivion Pro subscription is already active.'
          );


          alert(
            'You already have an active Tivion Pro subscription.'
          );


          setLoading(false);

          return;

        }

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

            'Unable to create Tivion Pro subscription.'

          );

        }

        if (
          createData?.alreadyPro === true ||
          createData?.plan === 'pro' ||
          createData?.synchronized === true
        ) {

          console.log(
            'Tivion Pro subscription synchronized:',
            createData
          );

          if (refreshUsage) {

            await refreshUsage();

          }


          setSuccess(
            'Your Tivion Pro subscription is active.'
          );


          alert(
            'You already have an active Tivion Pro subscription.'
          );


          setLoading(false);

          return;

        }


        const loaded =
          await loadRazorpayScript();


        if (!loaded) {

          throw new Error(
            'Unable to load Razorpay Checkout. Please check your internet connection.'
          );

        }


        const subscriptionId =

          createData?.subscription?.id ||

          createData?.subscriptionId ||

          createData?.id;


        const razorpayKey =

          createData?.keyId ||

          createData?.key ||

          createData?.razorpayKeyId;


        if (!subscriptionId) {

          console.error(
            'Full create response:',
            createData
          );

          throw new Error(
            'The backend did not return a Razorpay subscription ID.'
          );

        }

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
          'Razorpay Subscription ID:',
          subscriptionId
        );

        const options = {

          key:
            razorpayKey,


          subscription_id:
            subscriptionId,


          name:
            'Tivion',


          description:
            'Tivion Pro - ₹49/month',

          handler:
            async (response) => {

              try {


                console.log(
                  'Razorpay checkout response:',
                  response
                );

                setLoading(true);

                setError('');


                setSuccess(
                  'Payment successful. Verifying your Tivion Pro subscription...'
                );

                const verifyToken =
                  await getToken();


                if (!verifyToken) {

                  throw new Error(
                    'Unable to verify your login session.'
                  );

                }

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

                const verifyData =
                  await verifyResponse.json();


                console.log(
                  'Subscription verification response:',
                  verifyData
                );


                if (!verifyResponse.ok) {

                  throw new Error(

                    verifyData?.message ||

                    `Verification failed with status ${verifyResponse.status}.`

                  );

                }

                if (
                  verifyData?.success === false
                ) {

                  throw new Error(

                    verifyData?.message ||

                    'Razorpay subscription verification failed.'

                  );

                }

                console.log(
                  'Tivion Pro successfully activated'
                );


                setSuccess(
                  'Welcome to Tivion Pro! Your subscription has been activated.'
                );

                if (refreshUsage) {

                  await refreshUsage();

                }

                setTimeout(() => {

                  window.location.reload();

                }, 1200);


              } catch (
                verificationError
              ) {


                console.error(
                  'Payment verification error:',
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

          notes: {


            product:
              'Tivion Pro',


            plan:
              'Monthly',

          },

          theme: {


            color:
              '#F59E0B',

          },

          modal: {


            ondismiss: () => {


              console.log(
                'Razorpay Checkout closed'
              );


              setLoading(false);


            },


          },


        };

        const razorpay =
          new window.Razorpay(
            options
          );

        razorpay.on(

          'payment.failed',

          (response) => {


            console.error(
              'Razorpay payment failed:',
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

        razorpay.open();

        setLoading(false);


      } catch (
        upgradeError
      ) {

        console.error(
          'Tivion Pro upgrade error:',
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

            Explore Tivion and try every AI tool.

          </p>


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

                  Tivion Pro

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

                    ? 'Your Tivion Pro subscription is currently active.'

                    : 'Unlock unlimited access and get the most out of every Tivion AI tool.'
                }

              </p>

            </div>

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
                'Priority access to future Tivion tools',
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

                  <>

                    <Zap

                      className="
                        w-4
                        h-4
                      "

                    />

                    Upgrade to Tivion Pro

                  </>

                )
              }


            </button>

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

                  Current Tivion account plan

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
                        ? 'Tivion Pro'
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

    </div>

  );

};

export default Plans;
