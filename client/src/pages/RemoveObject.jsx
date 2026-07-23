import React, {
  useState,
} from 'react';

import {
  Scissors,
  Sparkles,
  Crown,
  Download,
  CheckCircle,
  Eye,
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
   REMOVE OBJECT
===================================================== */

const RemoveObject = () => {


  /* =================================================
     STATE
  ================================================= */

  const [
    input,
    setInput,
  ] = useState(null);


  const [
    object,
    setObject,
  ] = useState('');


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
     - User authentication
     - JWT/Auth token

     Clerk Billing is NOT used.
  ================================================= */

  const {
    getToken,
  } = useAuth();


  /* =================================================
     GENVIQ PLAN + OBJECT REMOVAL USAGE

     Source:

     Neon Database
          ↓
     GET /api/user/usage
          ↓
     UsageContext
          ↓
     RemoveObject.jsx

     FREE:
     5 successful object removals

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
     OBJECT REMOVAL USAGE

     New FREE user:

     used      = 0
     remaining = 5
     limit     = 5

     UI:

     5/5
       ↓ successful removal
     4/5
       ↓
     3/5
       ↓
     2/5
       ↓
     1/5
       ↓
     0/5
  ================================================= */

  const objectUsage =
    usage?.objectRemoval || {

      used: 0,

      remaining: 5,

      limit: 5,

    };


  const objectRemaining =
    Number(
      objectUsage.remaining ?? 5
    );


  const objectLimit =
    Number(
      objectUsage.limit ?? 5
    );


  const objectUsed =
    Number(
      objectUsage.used ?? 0
    );


  /* =================================================
     USAGE PERCENTAGE

     Used for progress UI:

     5/5 = 100%
     4/5 = 80%
     3/5 = 60%
     2/5 = 40%
     1/5 = 20%
     0/5 = 0%
  ================================================= */

  const objectUsagePercentage =
    objectLimit > 0

      ? Math.max(

          0,

          Math.min(

            100,

            (
              objectRemaining /
              objectLimit
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
         CLEAN OLD PREVIEW URL
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
      =============================================== */

      setContent('');


      setDownloaded(
        false
      );

    };


  /* =================================================
     REMOVE OBJECT
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
         OBJECT VALIDATION
      =============================================== */

      if (
        !object.trim()
      ) {

        toast.error(
          'Please enter the object you want to remove.'
        );

        return;

      }


      /* ===============================================
         ONE OBJECT NAME VALIDATION

         Existing behavior preserved.

         Examples:

         watch       ✅
         spoon       ✅
         car         ✅

         red car     ❌
         wrist watch ❌
      =============================================== */

      if (
        object
          .trim()
          .split(/\s+/)
          .length > 1
      ) {

        toast.error(
          'Please enter only one object name'
        );

        return;

      }


      /* ===============================================
         FRONTEND FREE QUOTA CHECK

         This improves UX.

         Backend MUST still perform the actual
         secure quota check.

         FREE:

         5/5 → allowed
         ...
         1/5 → allowed
         0/5 → blocked

         PRO:

         Always allowed.
      =============================================== */

      if (
        !isPro &&
        !hasCredits(
          'objectRemoval'
        )
      ) {

        toast.error(
          'You have used all 5 free Object Removal credits. Upgrade to Genviq Pro to continue.'
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


        formData.append(
          'object',
          object.trim()
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

           /api/ai/remove-image-object

           Backend should:

           1. Authenticate user
           2. Read plan from Neon
           3. Check object_removal_used
           4. Block FREE user at 5/5 used
           5. Process image
           6. Upload result
           7. Save creation
           8. Increment usage ONLY after success
           9. Return updated usage
        ============================================= */

        const {
          data,
        } = await axios.post(

          '/api/ai/remove-image-object',

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
             UPDATE OBJECT REMOVAL COUNTER

             Expected FREE backend response:

             usage: {
               used: 1,
               remaining: 4,
               limit: 5
             }

             UsageContext:

             objectRemoval
                  ↓
             5/5 → 4/5

             Shared state means Sidebar/Dashboard
             can update immediately too.
          =========================================== */

          if (
            data.usage &&
            !data.usage.unlimited
          ) {

            updateFeatureUsage(

              'objectRemoval',

              data.usage

            );

          }


          /* ===========================================
             SUCCESS TOAST
          =========================================== */

          if (isPro) {

            toast.success(
              'Object removed successfully!'
            );

          } else {

            const newRemaining =
              data?.usage?.remaining ??

              Math.max(
                objectRemaining - 1,
                0
              );


            toast.success(
              `Object removed! ${newRemaining}/${objectLimit} free uses remaining.`
            );

          }

        } else {

          toast.error(

            data.message ||

            'Failed to remove object.'

          );

        }

      } catch (error) {

        /* =============================================
           ERROR
        ============================================= */

        console.error(

          '❌ Object Removal Error:',

          error

        );


        const status =
          error?.response?.status;


        const message =

          error?.response?.data
            ?.message ||

          error?.message ||

          'Object removal failed.';


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
          `object-removed-${Date.now()}.png`;


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
              PLAN + OBJECT REMOVAL USAGE BADGE
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
                  objectRemaining > 0

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
                    objectRemaining > 0

                      ? 'text-gray-400'

                      : 'text-red-400'
                  }
                `}
              />


              <span
                className={`
                  font-medium

                  ${
                    objectRemaining > 0

                      ? 'text-gray-300'

                      : 'text-red-300'
                  }
                `}
              >

                FREE · {objectRemaining}/{objectLimit} LEFT

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

            Object Removal

          </h1>


          <p
            className="
              text-sm
              text-gray-400
            "
          >

            Remove objects from images with AI

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

                  Object removal credits

                </span>


                <span
                  className="
                    text-gray-300
                    font-medium
                  "
                >

                  {objectRemaining}/{objectLimit}

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
                      `${objectUsagePercentage}%`,

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

                {objectRemaining > 0

                  ? `${objectUsed} used · ${objectRemaining} remaining`

                  : 'Free object removal limit reached'}

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
                  IMAGE INPUT
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
                        max-h-32
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
                  IMAGE FORMAT + CREDIT INFO
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
                        objectRemaining > 0

                          ? 'text-gray-400'

                          : 'text-red-400'
                      }
                    `}
                  >

                    {objectRemaining}/{objectLimit} uses left

                  </span>

                )}

              </div>

            </div>


            {/* =========================================
                OBJECT DESCRIPTION
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
                  OBJECT HEADER
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
                    from-purple-500
                    to-pink-500
                    flex
                    items-center
                    justify-center
                  "
                >

                  <Scissors
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

                    Object to Remove

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    Describe what to remove

                  </p>

                </div>

              </div>


              {/* =======================================
                  OBJECT INPUT

                  Existing behavior preserved:

                  One object name only.
              ======================================= */}

              <textarea

                onChange={
                  (e) =>
                    setObject(
                      e.target.value
                    )
                }

                value={
                  object
                }

                rows={
                  3
                }

                className="
                  w-full
                  p-3
                  text-sm
                  bg-gray-700/50
                  border
                  border-gray-600
                  rounded-lg
                  text-white
                  placeholder-gray-400

                  focus:border-yellow-500
                  focus:ring-1
                  focus:ring-yellow-500/20

                  transition-all
                  resize-none
                "

                placeholder="e.g., watch or spoon (single object name only)"

                required

              />


              <p
                className="
                  text-xs
                  text-yellow-400
                  mt-2
                "
              >

                ⓘ Enter only one object name (no spaces)

              </p>

            </div>


            {/* =========================================
                FREE LIMIT REACHED WARNING

                Visible only:

                FREE
                +
                0/5 remaining
            ========================================= */}

            {!isPro &&
              objectRemaining <= 0 && (

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

                        Free object removal limit reached

                      </p>


                      <p
                        className="
                          text-xs
                          text-gray-400
                          mt-1
                          leading-relaxed
                        "
                      >

                        You've used all {objectLimit} free
                        Object Removal credits. Upgrade to
                        Genviq Pro to continue removing
                        objects from images.

                      </p>

                    </div>

                  </div>

                </div>

              )}


            {/* =========================================
                REMOVE OBJECT BUTTON

                FREE:

                Remove Object (5/5)

                successful request
                     ↓
                Remove Object (4/5)

                ...

                0/5
                     ↓
                Free Limit Reached

                PRO:

                Remove Object
            ========================================= */}

            <button

              type="button"

              onClick={
                onSubmitHandler
              }

              disabled={

                loading ||

                !input ||

                !object.trim() ||

                (
                  !isPro &&
                  objectRemaining <= 0
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

                  Removing Object...

                </>

              ) : (

                /* =====================================
                   FREE LIMIT EXHAUSTED
                ===================================== */

                !isPro &&
                objectRemaining <= 0

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

                  <Scissors
                    className="
                      w-4
                      h-4
                    "
                  />

                  Remove Object


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

                      ({objectRemaining}/{objectLimit})

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

                Selecting image:
                NO CREDIT

                Typing object:
                NO CREDIT

                Failed operation:
                NO CREDIT

                Successful object removal:
                1 CREDIT
            ========================================= */}

            {!isPro &&
              objectRemaining > 0 && (

                <p
                  className="
                    text-center
                    text-[10px]
                    text-gray-500
                  "
                >

                  1 credit is used only after an object
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

                  <Scissors
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

                    Object removed result

                  </p>

                </div>

              </div>


              {/* =======================================
                  DOWNLOAD BUTTON

                  Existing download functionality
                  preserved.
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

                - Removing Object loading state
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

                {/* =====================================
                    LOADING ICON
                ===================================== */}

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

                  <div
                    className="
                      w-6
                      h-6
                      rounded-full
                      border-2
                      border-t-transparent
                      border-black
                      animate-spin
                    "
                  />

                </div>


                {/* =====================================
                    LOADING TITLE
                ===================================== */}

                <h3
                  className="
                    text-lg
                    font-semibold
                    text-white
                    mb-2
                  "
                >

                  Removing Object

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

                  {/* ANALYZING */}

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


                  {/* PROCESSING */}

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
                        delay-100
                      "
                    />

                    <span>

                      Processing

                    </span>

                  </div>


                  {/* FINALIZING */}

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
                        delay-200
                      "
                    />

                    <span>

                      Finalizing

                    </span>

                  </div>

                </div>


                {/* =====================================
                    CREDIT MESSAGE

                    Do NOT decrement here.

                    Usage changes only after the backend
                    successfully processes the image.
                ===================================== */}

                {!isPro && (

                  <p
                    className="
                      text-[10px]
                      text-gray-500
                      mt-5
                    "
                  >

                    Your credit will be counted only after
                    successful object removal.

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

                  <Scissors
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

                  Upload an image and describe the object to remove

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

                        Unlimited object removal

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

                        {objectRemaining}/{objectLimit}
                        {' '}free object removals left

                      </span>

                    </>

                  )}

                </div>


                {/* =====================================
                    ZERO CREDIT MESSAGE
                ===================================== */}

                {!isPro &&
                  objectRemaining <= 0 && (

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
                 SUCCESSFUL RESULT
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

                        Object removed successfully

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
                      UPDATED USAGE
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

                      {objectRemaining}/{objectLimit} left

                    </div>

                  )}

                </div>


                {/* =====================================
                    BEFORE / AFTER COMPARISON

                    Original UI functionality preserved.
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
                        PROCESSED IMAGE
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

                        <Scissors
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

                          Processed

                        </span>

                      </div>


                      <div
                        className="
                          bg-gray-700/30
                          rounded-lg
                          p-2
                          border
                          border-green-500/30
                        "
                      >

                        <img

                          src={
                            content
                          }

                          alt="Object removed"

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

                )}


                {/* =====================================
                    FULL SIZE PROCESSED IMAGE
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

                  <img

                    src={
                      content
                    }

                    alt="Object removed"

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


                {/* =====================================
                    IMAGE INFO

                    Existing two cards preserved.
                ===================================== */}

                <div
                  className="
                    grid
                    grid-cols-2
                    gap-2
                  "
                >

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

                      Object Removed

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
                    REMOVED OBJECT INFO
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

                  <span
                    className="
                      text-xs
                      text-gray-500
                    "
                  >

                    Removed object

                  </span>


                  <span
                    className="
                      text-xs
                      font-medium
                      text-white
                    "
                  >

                    {object}

                  </span>

                </div>

              </div>

            )}

          </div>

        </div>


        {/* =============================================
            MAIN GRID ENDS ABOVE

            PART 4 CONTINUES HERE WITH:

            - Current Plan card
            - Object Removal Usage card
            - Processing Status card
            - Free plan information
            - Pro plan information
            - Final closing tags
            - export default RemoveObject
        ============================================= */}        {/* =============================================
            OBJECT REMOVAL TOOL INFORMATION
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
              OBJECT REMOVAL USAGE
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

                <Scissors
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

                  Object Removal Usage

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

                    {objectRemaining}/{objectLimit} Remaining

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

            Only shown when Neon says:

            plan = "free"
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

                    Free Object Removal

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
                    {objectLimit} Object Removal uses.

                    {' '}

                    A credit is counted only after an
                    object is removed successfully.

                  </p>

                </div>

              </div>


              {/* =======================================
                  REMAINING CREDIT DISPLAY
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
                        objectRemaining > 0
                          ? 'text-white'
                          : 'text-red-400'
                      }
                    `}
                  >

                    {objectRemaining}/{objectLimit}

                  </span>

                </div>


                {/* =====================================
                    CREDIT PROGRESS BAR

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

                      width:
                        `${objectUsagePercentage}%`,

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

                  {objectUsed} of {objectLimit} used

                </p>

              </div>

            </div>

          </div>

        )}


        {/* =============================================
            FREE LIMIT EXHAUSTED INFO

            This appears after:

            5/5
             ↓
            4/5
             ↓
            3/5
             ↓
            2/5
             ↓
            1/5
             ↓
            0/5
        ============================================= */}

        {!isPro &&
          objectRemaining <= 0 && (

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

                    You've used all free Object Removal credits

                  </p>


                  <p
                    className="
                      text-xs
                      text-gray-400
                      mt-1
                      leading-relaxed
                    "
                  >

                    Your {objectLimit} free Object Removal
                    uses have been consumed. Upgrade to
                    Genviq Pro for continued access.

                  </p>

                </div>

              </div>

            </div>

          )}


        {/* =============================================
            PRO PLAN INFORMATION

            IMPORTANT:

            This depends on:

            Neon users.plan = "pro"

            NOT:

            Clerk Protect
            Clerk Billing
            Clerk plan="pro_user"
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
                  Object Removal without the free
                  5-use limit.

                </p>

              </div>

            </div>

          </div>

        )}


        {/* =============================================
            FINAL OBJECT REMOVAL QUOTA FLOW


            NEW FREE USER

            Neon:

            object_removal_used = 0

                    ↓

            UsageContext:

            objectRemoval: {

              used: 0,

              remaining: 5,

              limit: 5

            }

                    ↓

            UI:

            FREE · 5/5 LEFT


            =============================================

            USER CLICKS REMOVE OBJECT

                    ↓

            POST /api/ai/remove-image-object

                    ↓

            auth middleware

                    ↓

            Neon plan check

                    ↓

            FREE USER?

            Check:

            object_removal_used < 5

                    ↓ YES

            Process image

                    ↓

            Object removed successfully

                    ↓

            Upload processed result

                    ↓

            Save creation

                    ↓

            Increment:

            object_removal_used

            0 → 1

                    ↓

            Backend returns:

            usage: {

              used: 1,

              remaining: 4,

              limit: 5

            }

                    ↓

            updateFeatureUsage(

              "objectRemoval",

              data.usage

            )

                    ↓

            UI immediately becomes:

            FREE · 4/5 LEFT


            =============================================

            AFTER FIVE SUCCESSFUL OPERATIONS:

            used      = 5

            remaining = 0

            UI:

            FREE · 0/5 LEFT

                    ↓

            Remove Object button disabled

                    ↓

            FREE LIMIT REACHED


            =============================================

            IMPORTANT:

            Selecting an image:

            ❌ DO NOT increment


            Entering an object:

            ❌ DO NOT increment


            Backend processing fails:

            ❌ DO NOT increment


            Cloudinary/upload fails:

            ❌ DO NOT increment


            Successful object removal:

            ✅ increment exactly ONCE


            =============================================

            PRO USER:

            users.plan = "pro"

                    ↓

            isPro = true

                    ↓

            Quota bypassed

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

export default RemoveObject;