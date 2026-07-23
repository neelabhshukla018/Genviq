import React, {
  useState,
} from 'react';

import {
  Eraser,
  Sparkles,
  Crown,
  Download,
  CheckCircle,
  Eye,
  EyeOff,
  Zap,
  Loader,
} from 'lucide-react';

import axios from 'axios';

import {
  useAuth,
} from '@clerk/clerk-react';

import toast from 'react-hot-toast';

import {
  useUsage,
} from '../context/UsageContext.jsx';


/* =====================================================
   AXIOS BASE URL
===================================================== */

axios.defaults.baseURL =
  import.meta.env.VITE_BASE_URL;


/* =====================================================
   REMOVE BACKGROUND
===================================================== */

const RemoveBackground = () => {


  /* =================================================
     STATE
  ================================================= */

  const [
    input,
    setInput,
  ] = useState(null);


  const [
    content,
    setContent,
  ] = useState('');


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    downloaded,
    setDownloaded,
  ] = useState(false);


  const [
    imagePreview,
    setImagePreview,
  ] = useState('');


  /* =================================================
     CLERK AUTHENTICATION ONLY

     Clerk handles:

     - Sign in
     - Authentication
     - Auth token

     Clerk Billing is NOT used.
  ================================================= */

  const {
    getToken,
  } = useAuth();


  /* =================================================
     GENVIQ PLAN + BACKGROUND REMOVAL USAGE

     Source of truth:

     Neon
       ↓
     GET /api/user/usage
       ↓
     UsageContext
       ↓
     RemoveBackground

     FREE:
     5 successful background removals

     PRO:
     Unlimited / quota bypass
  ================================================= */

  const {
    isPro,

    usage,

    updateFeatureUsage,

    hasCredits,
  } = useUsage();


  /* =================================================
     BACKGROUND REMOVAL USAGE

     New FREE user:

     used      = 0
     remaining = 5
     limit     = 5

     Therefore UI initially shows:

     FREE · 5/5 LEFT
  ================================================= */

  const backgroundUsage =
    usage?.backgroundRemoval || {

      used: 0,

      remaining: 5,

      limit: 5,

    };


  const backgroundRemaining =
    Number(
      backgroundUsage.remaining ?? 5
    );


  const backgroundLimit =
    Number(
      backgroundUsage.limit ?? 5
    );


  const backgroundUsed =
    Number(
      backgroundUsage.used ?? 0
    );


  /* =================================================
     USAGE PERCENTAGE

     5/5 = 100%
     4/5 = 80%
     3/5 = 60%
     2/5 = 40%
     1/5 = 20%
     0/5 = 0%
  ================================================= */

  const backgroundUsagePercentage =
    backgroundLimit > 0

      ? Math.max(

          0,

          Math.min(

            100,

            (
              backgroundRemaining /
              backgroundLimit
            ) * 100

          )

        )

      : 0;


  /* =================================================
     HANDLE IMAGE FILE
  ================================================= */

  const handleFileChange =
    (e) => {

      const file =
        e.target.files?.[0];


      if (!file) {

        return;

      }


      /* ===============================================
         IMAGE VALIDATION
      =============================================== */

      if (
        !file.type.startsWith(
          'image/'
        )
      ) {

        toast.error(
          'Please select a valid image.'
        );


        e.target.value = '';


        return;

      }


      /* ===============================================
         REMOVE PREVIOUS PREVIEW URL
      =============================================== */

      if (imagePreview) {

        URL.revokeObjectURL(
          imagePreview
        );

      }


      /* ===============================================
         SAVE IMAGE
      =============================================== */

      setInput(
        file
      );


      /* ===============================================
         CREATE LOCAL PREVIEW
      =============================================== */

      const previewUrl =
        URL.createObjectURL(
          file
        );


      setImagePreview(
        previewUrl
      );


      /* ===============================================
         CLEAR PREVIOUS RESULT

         When user chooses another image,
         old processed result should disappear.
      =============================================== */

      setContent('');


      setDownloaded(
        false
      );

    };


  /* =================================================
     REMOVE IMAGE BACKGROUND
  ================================================= */

  const onSubmitHandler =
    async (e) => {

      e.preventDefault();


      /* ===============================================
         IMAGE VALIDATION
      =============================================== */

      if (!input) {

        toast.error(
          'Please select an image first'
        );


        return;

      }


      /* ===============================================
         FRONTEND FREE QUOTA CHECK

         IMPORTANT:

         This check is for UX only.

         Backend must still perform the REAL
         secure quota validation.

         FREE:

         5/5 → allowed
         4/5 → allowed
         3/5 → allowed
         2/5 → allowed
         1/5 → allowed
         0/5 → blocked

         PRO:

         Always allowed.
      =============================================== */

      if (
        !isPro &&
        !hasCredits(
          'backgroundRemoval'
        )
      ) {

        toast.error(
          'You have used all 5 free Background Removal credits. Upgrade to Genviq Pro to continue.'
        );


        return;

      }


      try {

        /* =============================================
           START LOADING
        ============================================= */

        setLoading(
          true
        );


        setDownloaded(
          false
        );


        /* =============================================
           CREATE FORM DATA
        ============================================= */

        const formData =
          new FormData();


        formData.append(
          'image',
          input
        );


        /* =============================================
           GET CLERK AUTH TOKEN
        ============================================= */

        const token =
          await getToken();


        if (!token) {

          throw new Error(
            'Unable to get authentication token. Please sign in again.'
          );

        }


        /* =============================================
           CALL GENVIQ BACKEND

           POST:

           /api/ai/remove-image-background

           Backend should:

           1. Authenticate user

           2. Read plan from Neon

           3. For FREE user check:
              background_removal_used < 5

           4. Remove background

           5. Upload processed image

           6. Save creation

           7. Increment background_removal_used
              ONLY after successful operation

           8. Return updated usage
        ============================================= */

        const {
          data,
        } = await axios.post(

          '/api/ai/remove-image-background',

          formData,

          {

            headers: {

              Authorization:
                `Bearer ${token}`,

            },

          }

        );


        /* =============================================
           SUCCESS
        ============================================= */

        if (
          data.success
        ) {

          /* ===========================================
             SET PROCESSED IMAGE
          =========================================== */

          setContent(
            data.content
          );


          setDownloaded(
            false
          );


          /* ===========================================
             UPDATE ONLY BACKGROUND REMOVAL USAGE

             Expected backend FREE response:

             usage: {

               used: 1,

               remaining: 4,

               limit: 5

             }

             UsageContext immediately changes:

             backgroundRemoval:

             5/5
              ↓
             4/5

             Because UsageContext is shared,
             Sidebar/Dashboard can update too.
          =========================================== */

          if (
            data.usage &&
            !data.usage.unlimited
          ) {

            updateFeatureUsage(

              'backgroundRemoval',

              data.usage

            );

          }


          /* ===========================================
             SUCCESS MESSAGE
          =========================================== */

          if (isPro) {

            toast.success(
              'Background removed successfully!'
            );

          } else {

            const newRemaining =
              data?.usage?.remaining ??

              Math.max(
                backgroundRemaining - 1,
                0
              );


            toast.success(
              `Background removed! ${newRemaining}/${backgroundLimit} free uses remaining.`
            );

          }

        } else {

          /* ===========================================
             BACKEND RETURNED success:false
          =========================================== */

          toast.error(

            data.message ||

            'Failed to remove background.'

          );

        }

      } catch (error) {

        /* =============================================
           ERROR
        ============================================= */

        console.error(

          '❌ Background Removal Error:',

          error

        );


        const status =
          error?.response?.status;


        const message =

          error?.response?.data
            ?.message ||

          error?.message ||

          'Background removal failed.';


        /* =============================================
           QUOTA / ACCESS ERROR
        ============================================= */

        if (
          status === 403
        ) {

          toast.error(
            message
          );


          return;

        }


        /* =============================================
           GENERAL ERROR
        ============================================= */

        toast.error(
          message
        );

      } finally {

        setLoading(
          false
        );

      }

    };


  /* =================================================
     DOWNLOAD PROCESSED IMAGE

     Existing functionality preserved.

     Downloading the already-generated image
     does NOT consume another credit.
  ================================================= */

  const downloadImage =
    async () => {

      if (!content) {

        toast.error(
          'No processed image available.'
        );


        return;

      }


      try {

        const response =
          await fetch(
            content
          );


        if (!response.ok) {

          throw new Error(
            'Unable to download image.'
          );

        }


        const blob =
          await response.blob();


        const url =
          window.URL.createObjectURL(
            blob
          );


        const link =
          document.createElement(
            'a'
          );


        link.href =
          url;


        link.download =
          `background-removed-${Date.now()}.png`;


        document.body.appendChild(
          link
        );


        link.click();


        document.body.removeChild(
          link
        );


        window.URL.revokeObjectURL(
          url
        );


        setDownloaded(
          true
        );


        toast.success(
          'Image downloaded successfully!'
        );


        setTimeout(

          () =>
            setDownloaded(
              false
            ),

          2000

        );

      } catch (error) {

        console.error(

          'Download Error:',

          error

        );


        toast.error(
          'Failed to download image'
        );

      }

    };


  /* =================================================
     UI
  ================================================= */

  return (

    <div
      className="
        h-full
        overflow-y-scroll
        p-6
        bg-gradient-to-br
        from-gray-900
        to-black
      "
    >

      <div
        className="
          max-w-7xl
          mx-auto
        "
      >

        {/* =============================================
            HEADER
        ============================================= */}

        <div
          className="
            text-center
            mb-6
          "
        >

          {/* ===========================================
              PLAN + BACKGROUND REMOVAL BADGE

              NO:

              <Protect plan="pro_user">

              NO Clerk Billing.

              FREE:

              FREE · 5/5 LEFT

              PRO:

              GENVIQ PRO · UNLIMITED
          =========================================== */}

          {isPro ? (

            <div
              className="
                inline-flex
                items-center
                gap-2
                px-4
                py-2
                rounded-full
                border
                border-yellow-500/20
                bg-yellow-500/10
                text-xs
                mb-3
              "
            >

              <Crown
                className="
                  w-3
                  h-3
                  text-yellow-400
                  fill-yellow-400
                "
              />


              <span
                className="
                  text-yellow-400
                  font-medium
                "
              >

                GENVIQ PRO · UNLIMITED

              </span>

            </div>

          ) : (

            <div
              className={`
                inline-flex
                items-center
                gap-2
                px-4
                py-2
                rounded-full
                border
                text-xs
                mb-3

                ${
                  backgroundRemaining > 0

                    ? `
                      border-gray-500/20
                      bg-gray-500/10
                    `

                    : `
                      border-red-500/30
                      bg-red-500/10
                    `
                }
              `}
            >

              <Sparkles
                className={`
                  w-3
                  h-3

                  ${
                    backgroundRemaining > 0

                      ? 'text-gray-400'

                      : 'text-red-400'
                  }
                `}
              />


              <span
                className={`
                  font-medium

                  ${
                    backgroundRemaining > 0

                      ? 'text-gray-300'

                      : 'text-red-300'
                  }
                `}
              >

                FREE · {backgroundRemaining}/{backgroundLimit} LEFT

              </span>

            </div>

          )}


          {/* ===========================================
              TITLE
          =========================================== */}

          <h1
            className="
              text-2xl
              font-bold
              mb-2
              bg-gradient-to-r
              from-white
              to-gray-300
              bg-clip-text
              text-transparent
            "
          >

            Background Removal

          </h1>


          <p
            className="
              text-sm
              text-gray-400
            "
          >

            Remove backgrounds from images with AI

          </p>


          {/* ===========================================
              FREE USAGE PROGRESS
          =========================================== */}

          {!isPro && (

            <div
              className="
                max-w-xs
                mx-auto
                mt-4
              "
            >

              <div
                className="
                  flex
                  items-center
                  justify-between
                  text-xs
                  mb-1.5
                "
              >

                <span
                  className="
                    text-gray-500
                  "
                >

                  Background removal credits

                </span>


                <span
                  className="
                    text-gray-300
                    font-medium
                  "
                >

                  {backgroundRemaining}/{backgroundLimit}

                </span>

              </div>


              <div
                className="
                  w-full
                  h-1.5
                  bg-gray-700
                  rounded-full
                  overflow-hidden
                "
              >

                <div
                  className="
                    h-full
                    bg-gradient-to-r
                    from-yellow-400
                    to-amber-500
                    rounded-full
                    transition-all
                    duration-500
                  "

                  style={{

                    width:
                      `${backgroundUsagePercentage}%`,

                  }}
                />

              </div>


              <p
                className="
                  text-[10px]
                  text-gray-500
                  mt-1.5
                "
              >

                {backgroundRemaining > 0

                  ? `${backgroundUsed} used · ${backgroundRemaining} remaining`

                  : 'Free background removal limit reached'}

              </p>

            </div>

          )}

        </div>


        {/* =============================================
            MAIN GRID START

            PART 2 CONTINUES DIRECTLY HERE
        ============================================= */}

        <div
          className="
            grid
            grid-cols-1
            xl:grid-cols-2
            gap-4
          "
        >          {/* ===========================================
              LEFT PANEL
          =========================================== */}

          <div
            className="
              space-y-4
            "
          >

            {/* =========================================
                UPLOAD IMAGE CARD
            ========================================= */}

            <div
              className="
                bg-gradient-to-br
                from-gray-800
                to-gray-900
                rounded-xl
                border
                border-yellow-500/20
                p-4
              "
            >

              {/* =======================================
                  UPLOAD HEADER
              ======================================= */}

              <div
                className="
                  flex
                  items-center
                  gap-3
                  mb-4
                "
              >

                <div
                  className="
                    w-10
                    h-10
                    rounded-lg
                    bg-gradient-to-br
                    from-yellow-400
                    to-amber-500
                    flex
                    items-center
                    justify-center
                  "
                >

                  <Sparkles
                    className="
                      w-5
                      h-5
                      text-black
                    "
                  />

                </div>


                <div>

                  <h2
                    className="
                      text-sm
                      font-semibold
                      text-white
                    "
                  >

                    Upload Image

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    Select image to process

                  </p>

                </div>

              </div>


              {/* =======================================
                  FILE INPUT
              ======================================= */}

              <input

                onChange={
                  handleFileChange
                }

                accept="image/*"

                type="file"

                className="
                  w-full
                  p-3
                  text-sm
                  bg-gray-700/50
                  border
                  border-gray-600
                  rounded-lg
                  text-white

                  file:mr-4
                  file:py-2
                  file:px-4
                  file:rounded-lg
                  file:border-0
                  file:text-sm
                  file:font-semibold
                  file:bg-yellow-500
                  file:text-black

                  hover:file:bg-yellow-600

                  transition-all
                  mb-3
                "

                required

              />


              {/* =======================================
                  UPLOADED IMAGE PREVIEW
              ======================================= */}

              {imagePreview && (

                <div
                  className="
                    mt-4
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      mb-2
                    "
                  >

                    <Eye
                      className="
                        w-4
                        h-4
                        text-yellow-400
                      "
                    />


                    <h3
                      className="
                        text-sm
                        font-medium
                        text-white
                      "
                    >

                      Uploaded Image Preview

                    </h3>

                  </div>


                  <div
                    className="
                      bg-gray-700/30
                      rounded-lg
                      p-3
                      border
                      border-gray-600/30
                    "
                  >

                    <img

                      src={
                        imagePreview
                      }

                      alt="Uploaded preview"

                      className="
                        w-full
                        h-auto
                        rounded-lg
                        max-h-40
                        object-contain
                        mx-auto
                      "

                    />


                    <p
                      className="
                        text-xs
                        text-gray-400
                        text-center
                        mt-2
                        break-all
                      "
                    >

                      {input?.name}

                      {' '}

                      (

                      {input?.size
                        ? (
                            input.size /
                            1024 /
                            1024
                          ).toFixed(2)
                        : '0.00'}

                      {' '}MB)

                    </p>

                  </div>

                </div>

              )}


              {/* =======================================
                  FORMAT + CREDIT INFO
              ======================================= */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  mt-3
                "
              >

                <p
                  className="
                    text-xs
                    text-gray-400
                  "
                >

                  Supports JPG, PNG and other image formats

                </p>


                {isPro ? (

                  <span
                    className="
                      text-[10px]
                      text-yellow-400
                      flex
                      items-center
                      gap-1
                      shrink-0
                    "
                  >

                    <Crown
                      className="
                        w-2.5
                        h-2.5
                      "
                    />

                    Unlimited

                  </span>

                ) : (

                  <span
                    className={`
                      text-[10px]
                      shrink-0

                      ${
                        backgroundRemaining > 0

                          ? 'text-gray-400'

                          : 'text-red-400'
                      }
                    `}
                  >

                    {backgroundRemaining}/{backgroundLimit} uses left

                  </span>

                )}

              </div>

            </div>


            {/* =========================================
                FREE LIMIT REACHED WARNING

                Only visible when:

                plan = FREE

                AND

                backgroundRemaining = 0
            ========================================= */}

            {!isPro &&
              backgroundRemaining <= 0 && (

                <div
                  className="
                    p-4
                    rounded-xl
                    border
                    border-red-500/20
                    bg-red-500/5
                  "
                >

                  <div
                    className="
                      flex
                      items-start
                      gap-3
                    "
                  >

                    <div
                      className="
                        w-9
                        h-9
                        shrink-0
                        rounded-lg
                        bg-red-500/10
                        border
                        border-red-500/20
                        flex
                        items-center
                        justify-center
                      "
                    >

                      <Zap
                        className="
                          w-4
                          h-4
                          text-red-400
                        "
                      />

                    </div>


                    <div>

                      <p
                        className="
                          text-sm
                          font-semibold
                          text-red-300
                        "
                      >

                        Free background removal limit reached

                      </p>


                      <p
                        className="
                          text-xs
                          text-gray-400
                          mt-1
                          leading-relaxed
                        "
                      >

                        You've used all {backgroundLimit} free
                        Background Removal credits. Upgrade to
                        Genviq Pro to continue removing
                        backgrounds from images.

                      </p>

                    </div>

                  </div>

                </div>

              )}


            {/* =========================================
                REMOVE BACKGROUND BUTTON

                FREE NEW USER:

                Remove Background (5/5)

                        ↓ success

                Remove Background (4/5)

                        ↓

                3/5 → 2/5 → 1/5 → 0/5

                AT ZERO:

                Free Limit Reached

                PRO:

                Remove Background
            ========================================= */}

            <button

              type="button"

              onClick={
                onSubmitHandler
              }

              disabled={

                loading ||

                !input ||

                (
                  !isPro &&
                  backgroundRemaining <= 0
                )

              }

              className="
                w-full

                bg-gradient-to-r
                from-yellow-400
                to-amber-500

                hover:from-yellow-500
                hover:to-amber-600

                text-black
                font-semibold

                py-3
                px-4

                rounded-lg

                transition-all

                disabled:opacity-50
                disabled:cursor-not-allowed

                flex
                items-center
                justify-center
                gap-2

                text-sm
              "
            >

              {/* =======================================
                  LOADING
              ======================================= */}

              {loading ? (

                <>

                  <Loader
                    className="
                      w-4
                      h-4
                      animate-spin
                    "
                  />

                  Removing Background...

                </>

              ) : (

                /* =====================================
                   FREE LIMIT EXHAUSTED
                ===================================== */

                !isPro &&
                backgroundRemaining <= 0

              ) ? (

                <>

                  <Crown
                    className="
                      w-4
                      h-4
                    "
                  />

                  Free Limit Reached

                </>

              ) : (

                /* =====================================
                   NORMAL BUTTON
                ===================================== */

                <>

                  <Eraser
                    className="
                      w-4
                      h-4
                    "
                  />

                  Remove Background


                  {/* ===================================
                      FREE COUNTER
                  =================================== */}

                  {!isPro && (

                    <span
                      className="
                        ml-1
                        text-black/60
                        font-medium
                      "
                    >

                      ({backgroundRemaining}/{backgroundLimit})

                    </span>

                  )}


                  {/* ===================================
                      PRO INDICATOR
                  =================================== */}

                  {isPro && (

                    <Crown
                      className="
                        w-3.5
                        h-3.5
                        ml-1
                      "
                    />

                  )}

                </>

              )}

            </button>


            {/* =========================================
                CREDIT EXPLANATION

                Selecting/uploading image:
                NO CREDIT

                Failed processing:
                NO CREDIT

                Successful background removal:
                1 CREDIT

                Downloading result:
                NO EXTRA CREDIT
            ========================================= */}

            {!isPro &&
              backgroundRemaining > 0 && (

                <p
                  className="
                    text-center
                    text-[10px]
                    text-gray-500
                  "
                >

                  1 credit is used only after a background
                  is removed successfully.

                </p>

              )}

          </div>


          {/* ===========================================
              RIGHT PANEL
              PROCESSED IMAGE
          =========================================== */}

          <div
            className="
              bg-gradient-to-br
              from-gray-800
              to-gray-900
              rounded-xl
              border
              border-yellow-500/20
              p-4
            "
          >

            {/* =========================================
                RESULT HEADER
            ========================================= */}

            <div
              className="
                flex
                items-center
                justify-between
                mb-4
                gap-3
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >

                <div
                  className="
                    w-10
                    h-10
                    rounded-lg
                    bg-gradient-to-br
                    from-green-400
                    to-emerald-500
                    flex
                    items-center
                    justify-center
                    shrink-0
                  "
                >

                  <Eraser
                    className="
                      w-5
                      h-5
                      text-black
                    "
                  />

                </div>


                <div>

                  <h2
                    className="
                      text-sm
                      font-semibold
                      text-white
                    "
                  >

                    Processed Image

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    Background removed result

                  </p>

                </div>

              </div>


              {/* =======================================
                  DOWNLOAD BUTTON

                  Only shown when processed image exists.

                  Download does NOT consume another
                  usage credit.
              ======================================= */}

              {content && (

                <button

                  type="button"

                  onClick={
                    downloadImage
                  }

                  className="
                    flex
                    items-center
                    gap-2

                    px-3
                    py-2

                    bg-yellow-500/10
                    border
                    border-yellow-500/30
                    text-yellow-400

                    rounded-lg

                    hover:bg-yellow-500/20

                    transition-all
                    text-xs
                    shrink-0
                  "
                >

                  {downloaded ? (

                    <CheckCircle
                      className="
                        w-3
                        h-3
                        text-green-400
                      "
                    />

                  ) : (

                    <Download
                      className="
                        w-3
                        h-3
                      "
                    />

                  )}


                  {downloaded
                    ? 'Downloaded!'
                    : 'Download'}

                </button>

              )}

            </div>


            {/* =========================================
                PART 3 CONTINUES DIRECTLY HERE

                NEXT:

                - Removing Background loading state
                - No Image Processed state
                - Before / After comparison
                - Full processed image
                - Result status
                - Updated 4/5 display
            ========================================= */}            {/* =========================================
                RESULT CONTENT
            ========================================= */}

            {loading ? (

              /* =======================================
                 LOADING STATE
              ======================================= */

              <div
                className="
                  flex
                  flex-col
                  items-center
                  justify-center
                  py-12
                "
              >

                <div
                  className="
                    w-12
                    h-12
                    rounded-lg
                    bg-gradient-to-br
                    from-yellow-400
                    to-amber-500
                    flex
                    items-center
                    justify-center
                    mb-4
                  "
                >

                  <Loader
                    className="
                      w-6
                      h-6
                      text-black
                      animate-spin
                    "
                  />

                </div>


                <h3
                  className="
                    text-lg
                    font-semibold
                    text-white
                    mb-2
                  "
                >

                  Removing Background

                </h3>


                <p
                  className="
                    text-sm
                    text-gray-400
                    mb-4
                    text-center
                  "
                >

                  We are processing your image, please wait...

                </p>


                {/* =====================================
                    LOADING PROGRESS
                ===================================== */}

                <div
                  className="
                    w-48
                    bg-gray-700
                    rounded-full
                    h-1.5
                    mb-2
                    overflow-hidden
                  "
                >

                  <div
                    className="
                      bg-gradient-to-r
                      from-yellow-400
                      to-amber-500
                      h-1.5
                      rounded-full
                      animate-pulse
                      w-2/3
                    "
                  />

                </div>


                {/* =====================================
                    PROCESSING STEPS
                ===================================== */}

                <div
                  className="
                    flex
                    gap-4
                    text-xs
                    text-gray-400
                  "
                >

                  <div
                    className="
                      text-center
                    "
                  >

                    <div
                      className="
                        w-1.5
                        h-1.5
                        bg-yellow-400
                        rounded-full
                        animate-bounce
                        mx-auto
                        mb-1
                      "
                    />

                    <span>
                      Analyzing
                    </span>

                  </div>


                  <div
                    className="
                      text-center
                    "
                  >

                    <div
                      className="
                        w-1.5
                        h-1.5
                        bg-amber-400
                        rounded-full
                        animate-bounce
                        mx-auto
                        mb-1
                      "
                    />

                    <span>
                      Removing
                    </span>

                  </div>


                  <div
                    className="
                      text-center
                    "
                  >

                    <div
                      className="
                        w-1.5
                        h-1.5
                        bg-orange-400
                        rounded-full
                        animate-bounce
                        mx-auto
                        mb-1
                      "
                    />

                    <span>
                      Finalizing
                    </span>

                  </div>

                </div>


                {/* =====================================
                    CREDIT MESSAGE

                    IMPORTANT:

                    Do NOT reduce usage here.

                    Credit changes only after the
                    backend successfully completes
                    background removal.
                ===================================== */}

                {!isPro && (

                  <p
                    className="
                      text-[10px]
                      text-gray-500
                      mt-5
                      text-center
                    "
                  >

                    Your credit will be counted only after
                    successful background removal.

                  </p>

                )}

              </div>

            ) : !content ? (

              /* =======================================
                 EMPTY STATE
              ======================================= */

              <div
                className="
                  flex
                  flex-col
                  items-center
                  justify-center
                  py-12
                "
              >

                <div
                  className="
                    w-16
                    h-16
                    rounded-lg
                    border
                    border-gray-600
                    flex
                    items-center
                    justify-center
                    mb-4
                  "
                >

                  <EyeOff
                    className="
                      w-8
                      h-8
                      text-gray-500
                    "
                  />

                </div>


                <h3
                  className="
                    text-sm
                    font-semibold
                    text-white
                    mb-2
                  "
                >

                  No Image Processed

                </h3>


                <p
                  className="
                    text-xs
                    text-gray-400
                    text-center
                    max-w-xs
                  "
                >

                  Upload an image to remove its background

                </p>


                {/* =====================================
                    CURRENT ACCESS
                ===================================== */}

                <div
                  className="
                    mt-5
                    inline-flex
                    items-center
                    gap-2
                    px-3
                    py-2
                    bg-gray-800/60
                    border
                    border-gray-700
                    rounded-lg
                  "
                >

                  {isPro ? (

                    <>

                      <Crown
                        className="
                          w-3.5
                          h-3.5
                          text-yellow-400
                        "
                      />

                      <span
                        className="
                          text-xs
                          text-yellow-300
                        "
                      >

                        Unlimited background removal

                      </span>

                    </>

                  ) : (

                    <>

                      <Sparkles
                        className="
                          w-3.5
                          h-3.5
                          text-yellow-400
                        "
                      />

                      <span
                        className="
                          text-xs
                          text-gray-300
                        "
                      >

                        {backgroundRemaining}/{backgroundLimit}
                        {' '}free background removals left

                      </span>

                    </>

                  )}

                </div>


                {/* =====================================
                    ZERO CREDIT MESSAGE
                ===================================== */}

                {!isPro &&
                  backgroundRemaining <= 0 && (

                    <p
                      className="
                        text-xs
                        text-red-400
                        mt-4
                      "
                    >

                      Upgrade to Genviq Pro to continue.

                    </p>

                  )}

              </div>

            ) : (

              /* =======================================
                 SUCCESS RESULT
              ======================================= */

              <div
                className="
                  space-y-4
                "
              >

                {/* =====================================
                    SUCCESS STATUS
                ===================================== */}

                <div
                  className="
                    flex
                    flex-col
                    sm:flex-row
                    sm:items-center
                    justify-between
                    gap-3
                    p-3
                    rounded-lg
                    bg-green-500/5
                    border
                    border-green-500/10
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >

                    <div
                      className="
                        w-8
                        h-8
                        rounded-full
                        bg-green-500/10
                        border
                        border-green-500/20
                        flex
                        items-center
                        justify-center
                        shrink-0
                      "
                    >

                      <CheckCircle
                        className="
                          w-4
                          h-4
                          text-green-400
                        "
                      />

                    </div>


                    <div>

                      <p
                        className="
                          text-xs
                          font-medium
                          text-green-400
                        "
                      >

                        Background removed successfully

                      </p>


                      <p
                        className="
                          text-[10px]
                          text-gray-500
                          mt-0.5
                        "
                      >

                        Your processed image is ready

                      </p>

                    </div>

                  </div>


                  {/* ===================================
                      UPDATED USAGE BADGE
                  =================================== */}

                  {isPro ? (

                    <div
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        self-start
                        sm:self-auto
                        px-2.5
                        py-1.5
                        rounded-full
                        bg-yellow-500/10
                        border
                        border-yellow-500/20
                        text-[10px]
                        text-yellow-300
                      "
                    >

                      <Crown
                        className="
                          w-3
                          h-3
                        "
                      />

                      Pro Access

                    </div>

                  ) : (

                    <div
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        self-start
                        sm:self-auto
                        px-2.5
                        py-1.5
                        rounded-full
                        bg-gray-800
                        border
                        border-gray-700
                        text-[10px]
                        text-gray-300
                      "
                    >

                      <Sparkles
                        className="
                          w-3
                          h-3
                          text-yellow-400
                        "
                      />

                      {backgroundRemaining}/{backgroundLimit} left

                    </div>

                  )}

                </div>


                {/* =====================================
                    BEFORE / AFTER COMPARISON
                ===================================== */}

                {imagePreview && (

                  <div
                    className="
                      grid
                      grid-cols-2
                      gap-3
                      mb-4
                    "
                  >

                    {/* =================================
                        ORIGINAL IMAGE
                    ================================= */}

                    <div
                      className="
                        text-center
                      "
                    >

                      <div
                        className="
                          flex
                          items-center
                          gap-1
                          justify-center
                          mb-2
                        "
                      >

                        <Eye
                          className="
                            w-3
                            h-3
                            text-gray-400
                          "
                        />

                        <span
                          className="
                            text-xs
                            text-gray-400
                          "
                        >

                          Original

                        </span>

                      </div>


                      <div
                        className="
                          bg-gray-700/30
                          rounded-lg
                          p-2
                          border
                          border-gray-600/30
                        "
                      >

                        <img

                          src={
                            imagePreview
                          }

                          alt="Original"

                          className="
                            w-full
                            h-auto
                            rounded
                            max-h-32
                            object-contain
                            mx-auto
                          "

                        />

                      </div>

                    </div>


                    {/* =================================
                        BACKGROUND REMOVED
                    ================================= */}

                    <div
                      className="
                        text-center
                      "
                    >

                      <div
                        className="
                          flex
                          items-center
                          gap-1
                          justify-center
                          mb-2
                        "
                      >

                        <Eraser
                          className="
                            w-3
                            h-3
                            text-green-400
                          "
                        />

                        <span
                          className="
                            text-xs
                            text-green-400
                          "
                        >

                          Background Removed

                        </span>

                      </div>


                      {/* =================================
                          CHECKERBOARD-LIKE BACKDROP

                          Helps transparent PNG result
                          remain visually understandable.
                      ================================= */}

                      <div
                        className="
                          bg-gray-700/30
                          rounded-lg
                          p-2
                          border
                          border-green-500/30
                        "
                      >

                        <div
                          className="
                            rounded
                            bg-white/5
                            overflow-hidden
                          "
                        >

                          <img

                            src={
                              content
                            }

                            alt="Background removed"

                            className="
                              w-full
                              h-auto
                              rounded
                              max-h-32
                              object-contain
                              mx-auto
                            "

                          />

                        </div>

                      </div>

                    </div>

                  </div>

                )}


                {/* =====================================
                    FULL PROCESSED IMAGE
                ===================================== */}

                <div
                  className="
                    bg-gray-700/30
                    rounded-lg
                    p-4
                    border
                    border-gray-600/30
                  "
                >

                  <div
                    className="
                      rounded-lg
                      bg-white/5
                      overflow-hidden
                    "
                  >

                    <img

                      src={
                        content
                      }

                      alt="Background removed"

                      className="
                        w-full
                        h-auto
                        rounded-lg
                        max-h-80
                        object-contain
                        mx-auto
                      "

                    />

                  </div>

                </div>


                {/* =====================================
                    RESULT INFORMATION
                ===================================== */}

                <div
                  className="
                    grid
                    grid-cols-2
                    gap-2
                  "
                >

                  {/* ===================================
                      STATUS
                  =================================== */}

                  <div
                    className="
                      text-center
                      p-2
                      bg-gray-700/30
                      rounded
                      border
                      border-gray-600/30
                    "
                  >

                    <div
                      className="
                        text-sm
                        font-bold
                        text-yellow-400
                      "
                    >

                      Background Removed

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                      "
                    >

                      Status

                    </div>

                  </div>


                  {/* ===================================
                      PROCESSING TYPE
                  =================================== */}

                  <div
                    className="
                      text-center
                      p-2
                      bg-gray-700/30
                      rounded
                      border
                      border-gray-600/30
                    "
                  >

                    <div
                      className="
                        text-sm
                        font-bold
                        text-yellow-400
                      "
                    >

                      AI

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                      "
                    >

                      Processed

                    </div>

                  </div>

                </div>


                {/* =====================================
                    RESULT READY INFO
                ===================================== */}

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                    px-3
                    py-2.5
                    bg-gray-700/20
                    border
                    border-gray-700/50
                    rounded-lg
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >

                    <CheckCircle
                      className="
                        w-3.5
                        h-3.5
                        text-green-400
                      "
                    />

                    <span
                      className="
                        text-xs
                        text-gray-400
                      "
                    >

                      Result ready

                    </span>

                  </div>


                  {isPro ? (

                    <span
                      className="
                        text-xs
                        font-medium
                        text-yellow-300
                      "
                    >

                      Unlimited

                    </span>

                  ) : (

                    <span
                      className="
                        text-xs
                        font-medium
                        text-white
                      "
                    >

                      {backgroundRemaining}/{backgroundLimit} remaining

                    </span>

                  )}

                </div>


                {/* =====================================
                    DOWNLOAD INFO

                    Downloading does not reduce usage.
                ===================================== */}

                <p
                  className="
                    text-center
                    text-[10px]
                    text-gray-500
                  "
                >

                  Downloading this result does not use
                  another AI credit.

                </p>

              </div>

            )}

          </div>

        </div>


        {/* =============================================
            MAIN TWO-COLUMN GRID CLOSED

            DO NOT CLOSE OUTER PAGE YET.

            PART 4 CONTINUES HERE WITH:

            - Current Plan
            - Background Removal Usage
            - Processing Status
            - Free plan information
            - 5/5 progress
            - 0/5 exhausted state
            - Genviq Pro state
            - Final closing tags
            - export default RemoveBackground
        ============================================= */}        {/* =============================================
            BACKGROUND REMOVAL TOOL INFORMATION
        ============================================= */}

        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            gap-3
            mt-5
          "
        >

          {/* ===========================================
              CURRENT PLAN
          =========================================== */}

          <div
            className="
              bg-gradient-to-br
              from-gray-800/70
              to-gray-900
              border
              border-gray-700/50
              rounded-xl
              p-4
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className={`
                  w-9
                  h-9
                  rounded-lg
                  flex
                  items-center
                  justify-center
                  shrink-0

                  ${
                    isPro
                      ? `
                        bg-yellow-500/10
                        border
                        border-yellow-500/20
                      `
                      : `
                        bg-gray-700/50
                        border
                        border-gray-600/50
                      `
                  }
                `}
              >

                {isPro ? (

                  <Crown
                    className="
                      w-4
                      h-4
                      text-yellow-400
                      fill-yellow-400
                    "
                  />

                ) : (

                  <Sparkles
                    className="
                      w-4
                      h-4
                      text-gray-300
                    "
                  />

                )}

              </div>


              <div>

                <p
                  className="
                    text-[10px]
                    text-gray-500
                    uppercase
                    tracking-wide
                  "
                >
                  Current Plan
                </p>


                <p
                  className={`
                    text-sm
                    font-semibold
                    mt-0.5

                    ${
                      isPro
                        ? 'text-yellow-300'
                        : 'text-white'
                    }
                  `}
                >

                  {isPro
                    ? 'Genviq Pro'
                    : 'Free Plan'}

                </p>

              </div>

            </div>

          </div>


          {/* ===========================================
              BACKGROUND REMOVAL USAGE
          =========================================== */}

          <div
            className="
              bg-gradient-to-br
              from-gray-800/70
              to-gray-900
              border
              border-gray-700/50
              rounded-xl
              p-4
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  w-9
                  h-9
                  rounded-lg
                  bg-green-500/10
                  border
                  border-green-500/20
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >

                <Eraser
                  className="
                    w-4
                    h-4
                    text-green-400
                  "
                />

              </div>


              <div
                className="
                  flex-1
                  min-w-0
                "
              >

                <p
                  className="
                    text-[10px]
                    text-gray-500
                    uppercase
                    tracking-wide
                  "
                >
                  Background Removal Usage
                </p>


                {isPro ? (

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-green-400
                      mt-0.5
                    "
                  >
                    Unlimited
                  </p>

                ) : (

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-white
                      mt-0.5
                    "
                  >

                    {backgroundRemaining}/{backgroundLimit} Remaining

                  </p>

                )}

              </div>

            </div>

          </div>


          {/* ===========================================
              PROCESSING STATUS
          =========================================== */}

          <div
            className="
              bg-gradient-to-br
              from-gray-800/70
              to-gray-900
              border
              border-gray-700/50
              rounded-xl
              p-4
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  w-9
                  h-9
                  rounded-lg
                  bg-blue-500/10
                  border
                  border-blue-500/20
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >

                {content ? (

                  <CheckCircle
                    className="
                      w-4
                      h-4
                      text-blue-400
                    "
                  />

                ) : (

                  <Eye
                    className="
                      w-4
                      h-4
                      text-blue-400
                    "
                  />

                )}

              </div>


              <div
                className="
                  min-w-0
                "
              >

                <p
                  className="
                    text-[10px]
                    text-gray-500
                    uppercase
                    tracking-wide
                  "
                >
                  Processing Status
                </p>


                <p
                  className="
                    text-sm
                    font-semibold
                    text-white
                    mt-0.5
                  "
                >

                  {loading
                    ? 'Processing...'
                    : content
                    ? 'Completed'
                    : input
                    ? 'Image Ready'
                    : 'Waiting for Image'}

                </p>


                {input && !content && !loading && (

                  <p
                    className="
                      text-[10px]
                      text-gray-500
                      mt-0.5
                      truncate
                    "
                  >
                    {input.name}
                  </p>

                )}

              </div>

            </div>

          </div>

        </div>


        {/* =============================================
            FREE PLAN INFORMATION
        ============================================= */}

        {!isPro && (

          <div
            className="
              mt-4
              p-4
              rounded-xl
              bg-gradient-to-r
              from-yellow-500/5
              via-gray-800/50
              to-amber-500/5
              border
              border-yellow-500/10
            "
          >

            <div
              className="
                flex
                flex-col
                sm:flex-row
                sm:items-center
                justify-between
                gap-4
              "
            >

              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >

                <div
                  className="
                    w-9
                    h-9
                    shrink-0
                    rounded-lg
                    bg-yellow-500/10
                    border
                    border-yellow-500/20
                    flex
                    items-center
                    justify-center
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


                <div>

                  <p
                    className="
                      text-sm
                      font-medium
                      text-white
                    "
                  >
                    Free Background Removal
                  </p>


                  <p
                    className="
                      text-xs
                      text-gray-400
                      mt-1
                      leading-relaxed
                    "
                  >

                    Your free Genviq account includes{' '}
                    {backgroundLimit} Background Removal uses.

                    {' '}

                    A credit is counted only after a
                    background is removed successfully.

                  </p>

                </div>

              </div>


              {/* =======================================
                  REMAINING CREDITS
              ======================================= */}

              <div
                className="
                  shrink-0
                  min-w-[130px]
                  bg-black/20
                  border
                  border-gray-700/60
                  rounded-lg
                  px-4
                  py-3
                "
              >

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    mb-2
                  "
                >

                  <span
                    className="
                      text-[10px]
                      text-gray-500
                    "
                  >
                    Remaining
                  </span>


                  <span
                    className={`
                      text-sm
                      font-bold

                      ${
                        backgroundRemaining > 0
                          ? 'text-white'
                          : 'text-red-400'
                      }
                    `}
                  >

                    {backgroundRemaining}/{backgroundLimit}

                  </span>

                </div>


                {/* =====================================
                    PROGRESS BAR

                    5/5 = 100%
                    4/5 = 80%
                    3/5 = 60%
                    2/5 = 40%
                    1/5 = 20%
                    0/5 = 0%
                ===================================== */}

                <div
                  className="
                    w-full
                    h-1.5
                    bg-gray-700
                    rounded-full
                    overflow-hidden
                  "
                >

                  <div
                    className="
                      h-full
                      bg-gradient-to-r
                      from-yellow-400
                      to-amber-500
                      rounded-full
                      transition-all
                      duration-500
                    "

                    style={{
                      width: `${backgroundUsagePercentage}%`,
                    }}
                  />

                </div>


                <p
                  className="
                    text-[9px]
                    text-gray-500
                    mt-2
                  "
                >

                  {backgroundUsed} of {backgroundLimit} used

                </p>

              </div>

            </div>

          </div>

        )}


        {/* =============================================
            FREE LIMIT EXHAUSTED
        ============================================= */}

        {!isPro &&
          backgroundRemaining <= 0 && (

            <div
              className="
                mt-4
                p-4
                rounded-xl
                bg-red-500/5
                border
                border-red-500/20
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >

                <div
                  className="
                    w-10
                    h-10
                    shrink-0
                    rounded-lg
                    bg-red-500/10
                    border
                    border-red-500/20
                    flex
                    items-center
                    justify-center
                  "
                >

                  <Crown
                    className="
                      w-5
                      h-5
                      text-red-400
                    "
                  />

                </div>


                <div>

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-red-300
                    "
                  >
                    You've used all free Background Removal credits
                  </p>


                  <p
                    className="
                      text-xs
                      text-gray-400
                      mt-1
                      leading-relaxed
                    "
                  >

                    Your {backgroundLimit} free Background Removal
                    uses have been consumed. Upgrade to Genviq Pro
                    for continued access.

                  </p>

                </div>

              </div>

            </div>

          )}


        {/* =============================================
            PRO PLAN INFORMATION

            IMPORTANT:

            Plan comes from Neon:

            users.plan = "pro"

            NOT Clerk Billing.
        ============================================= */}

        {isPro && (

          <div
            className="
              mt-4
              p-4
              rounded-xl
              bg-gradient-to-r
              from-yellow-500/10
              via-gray-800/50
              to-amber-500/10
              border
              border-yellow-500/20
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  w-10
                  h-10
                  rounded-lg
                  bg-gradient-to-br
                  from-yellow-400
                  to-amber-500
                  flex
                  items-center
                  justify-center
                  shrink-0
                  shadow-lg
                  shadow-yellow-500/20
                "
              >

                <Crown
                  className="
                    w-5
                    h-5
                    text-black
                  "
                />

              </div>


              <div>

                <p
                  className="
                    text-sm
                    font-semibold
                    text-yellow-300
                  "
                >
                  Genviq Pro Active
                </p>


                <p
                  className="
                    text-xs
                    text-gray-400
                    mt-1
                    leading-relaxed
                  "
                >

                  Your Pro plan has full access to
                  Background Removal without the free
                  5-use limit.

                </p>

              </div>

            </div>

          </div>

        )}


        {/* =============================================
            BACKGROUND REMOVAL QUOTA FLOW

            NEW FREE USER

            Neon:

            background_removal_used = 0

                    ↓

            UsageContext:

            backgroundRemoval: {
              used: 0,
              remaining: 5,
              limit: 5
            }

                    ↓

            UI:

            FREE · 5/5 LEFT


            =============================================

            SUCCESSFUL BACKGROUND REMOVAL

            POST /api/ai/remove-image-background

                    ↓

            Authenticate with Clerk

                    ↓

            Read plan + usage from Neon

                    ↓

            FREE USER:

            Check:

            background_removal_used < 5

                    ↓

            Remove background successfully

                    ↓

            Upload/save result successfully

                    ↓

            Increment exactly once:

            background_removal_used

            0 → 1

                    ↓

            Backend returns:

            usage: {
              used: 1,
              remaining: 4,
              limit: 5
            }

                    ↓

            Frontend:

            updateFeatureUsage(
              "backgroundRemoval",
              data.usage
            )

                    ↓

            UI:

            5/5 → 4/5


            =============================================

            FINAL FLOW:

            5/5
             ↓ success
            4/5
             ↓ success
            3/5
             ↓ success
            2/5
             ↓ success
            1/5
             ↓ success
            0/5

                    ↓

            Free Limit Reached

                    ↓

            Remove Background disabled


            =============================================

            CREDIT RULES:

            Select image
            ❌ no credit

            Preview image
            ❌ no credit

            Failed AI/API processing
            ❌ no credit

            Failed upload
            ❌ no credit

            Successful background removal
            ✅ exactly 1 credit

            Download existing result
            ❌ no extra credit


            =============================================

            PRO USER:

            Neon:

            users.plan = "pro"

                    ↓

            UsageContext:

            isPro = true

                    ↓

            Quota check bypassed

                    ↓

            GENVIQ PRO · UNLIMITED

        ============================================= */}

      </div>

    </div>

  );

};


/* =====================================================
   EXPORT
===================================================== */

export default RemoveBackground;