import {
  useState,
} from 'react';

import {
  Hash,
  Image,
  Sparkles,
  Crown,
  Download,
  CheckCircle,
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
   GENERATE IMAGES
===================================================== */

const GenerateImages = () => {


  /* =================================================
     IMAGE STYLES

     Existing styles preserved.
  ================================================= */

  const ImageStyle = [

    'Realistic',

    'Ghibli',

    'Anime',

    'Cartoon',

    'Fantasy',

    '3D',

    'Portrait',

  ];


  /* =================================================
     STATE
  ================================================= */

  const [
    selectedStyle,
    setSelectedStyle,
  ] = useState(
    'Realistic'
  );


  const [
    input,
    setInput,
  ] = useState('');


  const [
    publish,
    setPublish,
  ] = useState(false);


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


  /* =================================================
     CLERK AUTHENTICATION ONLY

     Clerk handles:

     - Sign in
     - Authentication
     - Auth token

     Clerk Billing is NOT used.

     NO:

     <Protect plan="pro_user">

     Plan information comes from Neon.
  ================================================= */

  const {
    getToken,
  } = useAuth();


  /* =================================================
     GENVIQ PLAN + IMAGE GENERATION USAGE

     Source:

     Neon Database
          ↓
     GET /api/user/usage
          ↓
     UsageContext
          ↓
     GenerateImages.jsx


     FREE USER:

     5 successful image generations


     PRO USER:

     Unlimited / quota bypass
  ================================================= */

  const {

    isPro,

    usage,

    updateFeatureUsage,

    hasCredits,

  } = useUsage();


  /* =================================================
     IMAGE GENERATION USAGE

     Neon column:

     image_generation_used


     UsageContext key:

     image


     New FREE user:

     used      = 0

     remaining = 5

     limit     = 5


     Therefore UI initially shows:

     5/5
  ================================================= */

  const imageUsage =
    usage?.image || {

      used: 0,

      remaining: 5,

      limit: 5,

    };


  const imageRemaining =
    Number(

      imageUsage.remaining ?? 5

    );


  const imageLimit =
    Number(

      imageUsage.limit ?? 5

    );


  const imageUsed =
    Number(

      imageUsage.used ?? 0

    );


  /* =================================================
     IMAGE CREDIT PERCENTAGE

     This represents REMAINING credits.

     5/5 = 100%

     4/5 = 80%

     3/5 = 60%

     2/5 = 40%

     1/5 = 20%

     0/5 = 0%
  ================================================= */

  const imageUsagePercentage =
    imageLimit > 0

      ? Math.max(

          0,

          Math.min(

            100,

            (
              imageRemaining /
              imageLimit
            ) * 100

          )

        )

      : 0;


  /* =================================================
     GENERATE IMAGE
  ================================================= */

  const onSubmitHandler =
    async (e) => {

      e.preventDefault();


      /* ===============================================
         PROMPT VALIDATION
      =============================================== */

      if (
        !input.trim()
      ) {

        toast.error(
          'Please enter an image description'
        );

        return;

      }


      /* ===============================================
         FRONTEND QUOTA CHECK

         This is for UX.

         Backend MUST perform the secure check too.


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
          'image'
        )
      ) {

        toast.error(
          'You have used all 5 free Image Generation credits. Upgrade to Genviq Pro to continue.'
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
           BUILD PROMPT

           Existing functionality preserved.

           Example:

           input:
           "a futuristic city"

           selectedStyle:
           "Anime"

           final prompt:

           Generate an image of a futuristic city
           in the style Anime
        ============================================= */

        const prompt =

          `Generate an image of ${input.trim()} in the style ${selectedStyle}`;


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

           Existing endpoint preserved:

           POST /api/ai/generate-image


           Backend should:

           1. Authenticate user

           2. Read plan from Neon

           3. If FREE:

              Check:

              image_generation_used < 5

           4. Generate image

           5. Upload generated image to Cloudinary

           6. Save creation in Neon

           7. ONLY AFTER SUCCESS:

              increment image_generation_used

           8. Return:

              {
                success: true,

                content: "...",

                usage: {

                  used: 1,

                  remaining: 4,

                  limit: 5

                }

              }
        ============================================= */

        const {
          data,
        } = await axios.post(

          '/api/ai/generate-image',

          {

            prompt,

            publish,

          },

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
             SET GENERATED IMAGE

             Existing behavior preserved.
          =========================================== */

          setContent(
            data.content
          );


          setDownloaded(
            false
          );


          /* ===========================================
             UPDATE ONLY IMAGE GENERATION USAGE

             FREE example:

             Before:

             image = {

               used: 0,

               remaining: 5,

               limit: 5

             }


             Backend success:

             image_generation_used:

             0 → 1


             Backend returns:

             usage = {

               used: 1,

               remaining: 4,

               limit: 5

             }


             Frontend:

             5/5 → 4/5
          =========================================== */

          if (
            data.usage &&
            !data.usage.unlimited
          ) {

            updateFeatureUsage(

              'image',

              data.usage

            );

          }


          /* ===========================================
             SUCCESS TOAST
          =========================================== */

          if (isPro) {

            toast.success(
              'Image generated successfully!'
            );

          } else {

            const newRemaining =

              data?.usage?.remaining ??

              Math.max(

                imageRemaining - 1,

                0

              );


            toast.success(

              `Image generated! ${newRemaining}/${imageLimit} free generations remaining.`

            );

          }

        } else {

          /* ===========================================
             BACKEND RETURNED success:false
          =========================================== */

          toast.error(

            data.message ||

            'Failed to generate image'

          );

        }

      } catch (error) {

        /* =============================================
           ERROR
        ============================================= */

        console.error(

          'Image generation error:',

          error

        );


        const status =
          error?.response?.status;


        const message =

          error?.response?.data
            ?.message ||

          error?.message ||

          'Failed to generate image. Please try again.';


        /* =============================================
           QUOTA / ACCESS ERROR

           Example backend response:

           HTTP 403

           {
             success: false,

             message:
             "Free image generation limit reached."
           }
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
     DOWNLOAD GENERATED IMAGE

     Existing functionality preserved.

     IMPORTANT:

     Downloading an already-generated image
     does NOT consume another image credit.
  ================================================= */

  const downloadImage =
    async () => {

      if (!content) {

        toast.error(
          'No generated image available.'
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
          `ai-generated-image-${Date.now()}.png`;


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

          'Image download error:',

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
              PLAN + IMAGE GENERATION BADGE

              FREE:

              FREE · 5/5 LEFT


              PRO:

              GENVIQ PRO · UNLIMITED


              Clerk Protect is completely removed.
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
                  imageRemaining > 0

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
                    imageRemaining > 0

                      ? 'text-gray-400'

                      : 'text-red-400'
                  }
                `}
              />


              <span
                className={`
                  font-medium

                  ${
                    imageRemaining > 0

                      ? 'text-gray-300'

                      : 'text-red-300'
                  }
                `}
              >

                FREE · {imageRemaining}/{imageLimit} LEFT

              </span>

            </div>

          )}


          {/* ===========================================
              TITLE

              Existing UI preserved.
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

            AI Image Generator

          </h1>


          <p
            className="
              text-sm
              text-gray-400
            "
          >

            Create stunning images with AI

          </p>


          {/* ===========================================
              FREE IMAGE GENERATION PROGRESS
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

                  Image generation credits

                </span>


                <span
                  className="
                    text-gray-300
                    font-medium
                  "
                >

                  {imageRemaining}/{imageLimit}

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
                      `${imageUsagePercentage}%`,

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

                {imageRemaining > 0

                  ? `${imageUsed} used · ${imageRemaining} remaining`

                  : 'Free image generation limit reached'}

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
                IMAGE DESCRIPTION INPUT
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

                    Describe Your Image

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    What do you want to see?

                  </p>

                </div>

              </div>


              {/* =======================================
                  PROMPT TEXTAREA
              ======================================= */}

              <textarea

                onChange={
                  (e) =>
                    setInput(
                      e.target.value
                    )
                }

                value={
                  input
                }

                rows={
                  4
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

                placeholder="Describe what you want to see in the image..."

                required

              />


              {/* =======================================
                  PROMPT INFO
              ======================================= */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  mt-2
                "
              >

                <p
                  className="
                    text-[10px]
                    text-gray-500
                  "
                >

                  Be descriptive for better AI-generated results

                </p>


                <span
                  className="
                    text-[10px]
                    text-gray-500
                    shrink-0
                  "
                >

                  {input.length} characters

                </span>

              </div>

            </div>


            {/* =========================================
                STYLE SELECTION

                Existing styles preserved:

                Realistic
                Ghibli
                Anime
                Cartoon
                Fantasy
                3D
                Portrait
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

                  <Image
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

                    Style

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    Choose image style

                  </p>

                </div>

              </div>


              {/* =======================================
                  STYLE BUTTONS
              ======================================= */}

              <div
                className="
                  flex
                  gap-2
                  flex-wrap
                "
              >

                {ImageStyle.map(
                  (item) => (

                    <span

                      onClick={
                        () =>
                          setSelectedStyle(
                            item
                          )
                      }

                      className={`
                        text-xs
                        px-3
                        py-2
                        rounded-lg
                        border
                        cursor-pointer
                        transition-all

                        ${
                          selectedStyle === item

                            ? `
                              bg-yellow-500/10
                              border-yellow-500/50
                              text-yellow-300
                            `

                            : `
                              bg-gray-700/30
                              border-gray-600
                              text-gray-400

                              hover:border-yellow-500/30
                              hover:text-yellow-200
                            `
                        }
                      `}

                      key={
                        item
                      }

                    >

                      {item}

                    </span>

                  )
                )}

              </div>


              {/* =======================================
                  CURRENT STYLE
              ======================================= */}

              <div
                className="
                  mt-3
                  pt-3
                  border-t
                  border-gray-700/50
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >

                <span
                  className="
                    text-[10px]
                    text-gray-500
                  "
                >

                  Selected style

                </span>


                <span
                  className="
                    text-xs
                    text-yellow-300
                    font-medium
                  "
                >

                  {selectedStyle}

                </span>

              </div>

            </div>


            {/* =========================================
                PUBLIC TOGGLE

                Existing functionality preserved.

                publish = false
                → Private

                publish = true
                → Public

                This does NOT affect image credits.
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

              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-3
                    flex-1
                  "
                >

                  <label
                    className="
                      relative
                      cursor-pointer
                    "
                  >

                    <input

                      className="
                        sr-only
                        peer
                      "

                      type="checkbox"

                      checked={
                        publish
                      }

                      onChange={
                        (e) =>
                          setPublish(
                            e.target.checked
                          )
                      }

                    />


                    <div
                      className="
                        w-9
                        h-5
                        bg-gray-600
                        rounded-full
                        peer-checked:bg-yellow-500
                        transition
                      "
                    />


                    <span
                      className="
                        absolute
                        left-1
                        top-1
                        w-3
                        h-3
                        bg-white
                        rounded-full
                        transition
                        peer-checked:translate-x-4
                      "
                    />

                  </label>


                  <div>

                    <p
                      className="
                        text-sm
                        font-medium
                        text-white
                      "
                    >

                      Make this image public

                    </p>


                    <p
                      className="
                        text-xs
                        text-gray-400
                      "
                    >

                      Share your creation with others

                    </p>

                  </div>

                </div>


                {/* =====================================
                    VISIBILITY STATUS
                ===================================== */}

                <span
                  className={`
                    text-[10px]
                    px-2
                    py-1
                    rounded-full
                    border
                    shrink-0

                    ${
                      publish

                        ? `
                          text-green-400
                          bg-green-500/10
                          border-green-500/20
                        `

                        : `
                          text-gray-400
                          bg-gray-700/30
                          border-gray-600/50
                        `
                    }
                  `}
                >

                  {publish
                    ? 'Public'
                    : 'Private'}

                </span>

              </div>

            </div>


            {/* =========================================
                FREE LIMIT WARNING

                Only shown when:

                FREE USER
                    +
                0/5 image credits
            ========================================= */}

            {!isPro &&
              imageRemaining <= 0 && (

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

                        Free image generation limit reached

                      </p>


                      <p
                        className="
                          text-xs
                          text-gray-400
                          mt-1
                          leading-relaxed
                        "
                      >

                        You've used all {imageLimit} free
                        Image Generation credits. Upgrade
                        to Genviq Pro to continue generating
                        AI images.

                      </p>

                    </div>

                  </div>

                </div>

              )}


            {/* =========================================
                GENERATE IMAGE BUTTON

                FREE:

                Generate Image (5/5)

                      ↓ success

                Generate Image (4/5)

                      ↓

                3/5
                2/5
                1/5
                0/5


                AT ZERO:

                Free Limit Reached


                PRO:

                Generate Image
            ========================================= */}

            <button

              type="button"

              onClick={
                onSubmitHandler
              }

              disabled={

                loading ||

                !input.trim() ||

                (
                  !isPro &&
                  imageRemaining <= 0
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

              {loading ? (

                /* =====================================
                   LOADING
                ===================================== */

                <>

                  <Loader
                    className="
                      w-4
                      h-4
                      animate-spin
                    "
                  />

                  Generating...

                </>

              ) : (

                !isPro &&
                imageRemaining <= 0

              ) ? (

                /* =====================================
                   FREE LIMIT EXHAUSTED
                ===================================== */

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
                   NORMAL GENERATE BUTTON
                ===================================== */

                <>

                  <Image
                    className="
                      w-4
                      h-4
                    "
                  />

                  Generate Image


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

                      ({imageRemaining}/{imageLimit})

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
                CREDIT RULE

                Typing prompt:
                NO CREDIT

                Changing style:
                NO CREDIT

                Changing Public/Private:
                NO CREDIT

                Failed generation:
                NO CREDIT

                Successful generation:
                EXACTLY 1 CREDIT

                Download:
                NO EXTRA CREDIT
            ========================================= */}

            {!isPro &&
              imageRemaining > 0 && (

                <p
                  className="
                    text-center
                    text-[10px]
                    text-gray-500
                  "
                >

                  1 credit is used only after an image
                  is generated successfully.

                </p>

              )}

          </div>


          {/* ===========================================
              RIGHT PANEL
              GENERATED IMAGE

              Your original right panel starts here.
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
                GENERATED IMAGE HEADER
            ========================================= */}

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
                mb-4
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

                  <Image
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

                    Generated Image

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    AI-powered creation

                  </p>

                </div>

              </div>


              {/* =======================================
                  DOWNLOAD BUTTON

                  Same functionality as your original.

                  Downloading does NOT consume
                  another generation credit.
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

                DO NOT CLOSE RIGHT PANEL YET.

                NEXT:

                - Creating Your Image loading state
                - No Image Generated state
                - Generated image
                - Style
                - Public / Private
                - AI Generated
                - Updated 5/5 → 4/5 badge
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

                  Creating Your Image

                </h3>


                <p
                  className="
                    text-sm
                    text-gray-400
                    mb-4
                    text-center
                  "
                >

                  AI is bringing your imagination to life...

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
                    GENERATION STEPS
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
                      Understanding
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
                      Generating
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
                    CREDIT INFO

                    Credit must NOT decrease while
                    generation is still processing.

                    It decreases only after backend
                    success.
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
                    the image is generated successfully.

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

                  <Image
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

                  No Image Generated

                </h3>


                <p
                  className="
                    text-xs
                    text-gray-400
                    text-center
                    max-w-xs
                  "
                >

                  Enter a prompt and choose a style to
                  generate your AI image

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

                        Unlimited image generation

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

                        {imageRemaining}/{imageLimit}
                        {' '}free generations left

                      </span>

                    </>

                  )}

                </div>


                {/* =====================================
                    LIMIT REACHED MESSAGE
                ===================================== */}

                {!isPro &&
                  imageRemaining <= 0 && (

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

                        Image generated successfully

                      </p>


                      <p
                        className="
                          text-[10px]
                          text-gray-500
                          mt-0.5
                        "
                      >

                        Your AI-generated image is ready

                      </p>

                    </div>

                  </div>


                  {/* ===================================
                      UPDATED IMAGE USAGE

                      Example:

                      Before generation:
                      5/5

                      After successful generation:
                      4/5
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

                      {imageRemaining}/{imageLimit} left

                    </div>

                  )}

                </div>


                {/* =====================================
                    GENERATED IMAGE

                    Existing main result functionality
                    preserved.
                ===================================== */}

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
                      content
                    }

                    alt="AI Generated"

                    className="
                      w-full
                      h-auto
                      rounded-lg
                      max-h-[420px]
                      object-contain
                      mx-auto
                    "

                  />

                </div>


                {/* =====================================
                    IMAGE INFORMATION

                    Existing information preserved:

                    - Style
                    - Visibility
                    - AI Generated
                ===================================== */}

                <div
                  className="
                    grid
                    grid-cols-1
                    sm:grid-cols-3
                    gap-2
                  "
                >

                  {/* ===================================
                      STYLE
                  =================================== */}

                  <div
                    className="
                      text-center
                      p-3
                      bg-gray-700/30
                      rounded-lg
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

                      {selectedStyle}

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                        mt-1
                      "
                    >

                      Style

                    </div>

                  </div>


                  {/* ===================================
                      VISIBILITY
                  =================================== */}

                  <div
                    className="
                      text-center
                      p-3
                      bg-gray-700/30
                      rounded-lg
                      border
                      border-gray-600/30
                    "
                  >

                    <div
                      className={`
                        text-sm
                        font-bold

                        ${
                          publish
                            ? 'text-green-400'
                            : 'text-yellow-400'
                        }
                      `}
                    >

                      {publish
                        ? 'Public'
                        : 'Private'}

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                        mt-1
                      "
                    >

                      Visibility

                    </div>

                  </div>


                  {/* ===================================
                      GENERATION TYPE
                  =================================== */}

                  <div
                    className="
                      text-center
                      p-3
                      bg-gray-700/30
                      rounded-lg
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
                        mt-1
                      "
                    >

                      Generated

                    </div>

                  </div>

                </div>


                {/* =====================================
                    PROMPT INFORMATION
                ===================================== */}

                <div
                  className="
                    px-3
                    py-3
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
                      mb-2
                    "
                  >

                    <Hash
                      className="
                        w-3.5
                        h-3.5
                        text-yellow-400
                      "
                    />


                    <span
                      className="
                        text-xs
                        font-medium
                        text-gray-300
                      "
                    >

                      Prompt

                    </span>

                  </div>


                  <p
                    className="
                      text-xs
                      text-gray-400
                      leading-relaxed
                      break-words
                    "
                  >

                    {input}

                  </p>

                </div>


                {/* =====================================
                    RESULT READY / USAGE
                ===================================== */}

                <div
                  className="
                    flex
                    flex-col
                    sm:flex-row
                    sm:items-center
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

                      Image ready to download

                    </span>

                  </div>


                  {isPro ? (

                    <div
                      className="
                        flex
                        items-center
                        gap-1.5
                      "
                    >

                      <Crown
                        className="
                          w-3
                          h-3
                          text-yellow-400
                        "
                      />


                      <span
                        className="
                          text-xs
                          font-medium
                          text-yellow-300
                        "
                      >

                        Unlimited

                      </span>

                    </div>

                  ) : (

                    <span
                      className="
                        text-xs
                        font-medium
                        text-white
                      "
                    >

                      {imageRemaining}/{imageLimit} remaining

                    </span>

                  )}

                </div>


                {/* =====================================
                    DOWNLOAD INFO

                    IMPORTANT:

                    User already spent the credit when
                    image generation succeeded.

                    Clicking Download:

                    ❌ must NOT decrement usage again.
                ===================================== */}

                <p
                  className="
                    text-center
                    text-[10px]
                    text-gray-500
                  "
                >

                  Downloading this image does not use
                  another AI generation credit.

                </p>

              </div>

            )}

          </div>

        </div>


        {/* =============================================
            MAIN TWO-COLUMN GRID CLOSED

            DO NOT CLOSE:

            max-w-7xl container
            outer page
            component

            PART 4 CONTINUES DIRECTLY HERE.

            PART 4 WILL CONTAIN:

            1. Current Plan card

               Free Plan
                  OR
               Genviq Pro


            2. Image Generation Usage card

               5/5 Remaining
                    ↓
               4/5 Remaining
                    ↓
               ...
                    ↓
               0/5 Remaining


            3. Generation Status card

               Waiting for Prompt
               Ready to Generate
               Generating...
               Completed


            4. Free plan information


            5. Credit progress bar


            6. 0/5 exhausted state


            7. Genviq Pro state


            8. Final closing tags


            9. export default GenerateImages
        ============================================= */}        {/* =============================================
            IMAGE GENERATION TOOL INFORMATION
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
              IMAGE GENERATION USAGE
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

                <Image
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

                  Image Generation Usage

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

                    {imageRemaining}/{imageLimit} Remaining

                  </p>

                )}

              </div>

            </div>

          </div>


          {/* ===========================================
              GENERATION STATUS
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

                  <Sparkles
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

                  Generation Status

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
                    ? 'Generating...'
                    : content
                    ? 'Completed'
                    : input.trim()
                    ? 'Ready to Generate'
                    : 'Waiting for Prompt'}

                </p>


                {input.trim() &&
                  !content &&
                  !loading && (

                    <p
                      className="
                        text-[10px]
                        text-gray-500
                        mt-0.5
                      "
                    >

                      Style: {selectedStyle}

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

                    Free AI Image Generation

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
                    {imageLimit} AI Image Generation uses.

                    {' '}

                    A credit is counted only after an
                    image is generated successfully.

                  </p>

                </div>

              </div>


              {/* =======================================
                  REMAINING IMAGE CREDITS
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
                        imageRemaining > 0
                          ? 'text-white'
                          : 'text-red-400'
                      }
                    `}
                  >

                    {imageRemaining}/{imageLimit}

                  </span>

                </div>


                {/* =====================================
                    CREDIT PROGRESS

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
                        `${imageUsagePercentage}%`,

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

                  {imageUsed} of {imageLimit} used

                </p>

              </div>

            </div>

          </div>

        )}


        {/* =============================================
            FREE LIMIT EXHAUSTED

            Appears only at:

            FREE + 0/5
        ============================================= */}

        {!isPro &&
          imageRemaining <= 0 && (

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

                    You've used all free Image Generation credits

                  </p>


                  <p
                    className="
                      text-xs
                      text-gray-400
                      mt-1
                      leading-relaxed
                    "
                  >

                    Your {imageLimit} free AI Image Generation
                    uses have been consumed. Upgrade to
                    Genviq Pro for continued image generation.

                  </p>

                </div>

              </div>

            </div>

          )}


        {/* =============================================
            PRO PLAN INFORMATION

            IMPORTANT:

            This is controlled by:

            Neon:
            users.plan = "pro"

            NOT:

            Clerk Protect
            Clerk Billing
            plan="pro_user"
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
                  AI Image Generation without the free
                  5-generation limit.

                </p>

              </div>

            </div>

          </div>

        )}


        {/* =============================================
            IMAGE GENERATION QUOTA FLOW


            NEW FREE USER

            Neon:

            image_generation_used = 0

                    ↓

            UsageContext:

            image: {

              used: 0,

              remaining: 5,

              limit: 5

            }

                    ↓

            UI:

            FREE · 5/5 LEFT


            =============================================

            USER GENERATES IMAGE

            POST:

            /api/ai/generate-image

                    ↓

            Clerk Authentication

                    ↓

            auth middleware

                    ↓

            Read plan from Neon

                    ↓

            FREE USER?

            Check:

            image_generation_used < 5

                    ↓ YES

            Generate image using AI

                    ↓

            Image generation succeeds

                    ↓

            Cloudinary upload succeeds

                    ↓

            Save creation succeeds

                    ↓

            Increment:

            image_generation_used

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

              "image",

              data.usage

            )

                    ↓

            UI immediately updates:

            5/5 → 4/5


            =============================================

            EACH TOOL IS INDEPENDENT

            Example after generating ONE image:

            Image Generation:

            4/5


            Write Article:

            5/5


            Blog Title:

            5/5


            Background Removal:

            5/5


            Object Removal:

            5/5


            Resume Review:

            5/5


            =============================================

            FINAL IMAGE FLOW:

            5/5

             ↓ successful generation

            4/5

             ↓ successful generation

            3/5

             ↓ successful generation

            2/5

             ↓ successful generation

            1/5

             ↓ successful generation

            0/5

                    ↓

            FREE LIMIT REACHED

                    ↓

            Generate Image button disabled


            =============================================

            CREDIT RULES


            Enter prompt:

            ❌ NO CREDIT


            Change style:

            ❌ NO CREDIT


            Change Public / Private:

            ❌ NO CREDIT


            AI generation fails:

            ❌ NO CREDIT


            Cloudinary upload fails:

            ❌ NO CREDIT


            Database save fails:

            ❌ NO CREDIT


            Successful complete generation:

            ✅ EXACTLY 1 CREDIT


            Download generated image:

            ❌ NO EXTRA CREDIT


            =============================================

            PRO USER

            Neon:

            users.plan = "pro"

                    ↓

            UsageContext:

            isPro = true

                    ↓

            FREE quota bypassed

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

export default GenerateImages;