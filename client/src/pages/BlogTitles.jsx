import {
  useState,
} from 'react';

import {
  Hash,
  Sparkles,
  Crown,
  Copy,
  CheckCircle,
  Zap,
  Loader,
} from 'lucide-react';

import axios from 'axios';

import {
  useAuth,
} from '@clerk/clerk-react';

import toast from 'react-hot-toast';

import Markdown from 'react-markdown';

import {
  useUsage,
} from '../context/UsageContext.jsx';


/* =====================================================
   AXIOS BASE URL
===================================================== */

axios.defaults.baseURL =
  import.meta.env.VITE_BASE_URL;


/* =====================================================
   BLOG TITLES
===================================================== */

const BlogTitles = () => {


  /* =================================================
     BLOG CATEGORIES

     Existing categories preserved.
  ================================================= */

  const blogCategories = [

    'General',

    'Technology',

    'Business',

    'Health',

    'Lifestyle',

    'Education',

    'Travel',

    'Food',

  ];


  /* =================================================
     STATE
  ================================================= */

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState(
    'General'
  );


  const [
    input,
    setInput,
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
    copied,
    setCopied,
  ] = useState(false);


  /* =================================================
     CLERK AUTHENTICATION ONLY

     Clerk is still used for:

     - Sign in
     - Authentication
     - Getting auth token

     Clerk Billing is NOT used.

     We no longer use:

     <Protect plan="pro_user">

     Plan information comes from Neon.
  ================================================= */

  const {
    getToken,
  } = useAuth();


  /* =================================================
     GENVIQ PLAN + BLOG TITLE USAGE

     Source:

     Neon Database
          ↓
     GET /api/user/usage
          ↓
     UsageContext
          ↓
     BlogTitles.jsx


     FREE USER:

     5 successful Blog Title generations


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
     BLOG TITLE USAGE

     UsageContext key:

     blogTitle


     Neon column:

     blog_title_used


     NEW FREE USER:

     blog_title_used = 0

     Therefore:

     used      = 0
     remaining = 5
     limit     = 5

     UI:

     5/5
  ================================================= */

  const blogTitleUsage =
    usage?.blogTitle || {

      used: 0,

      remaining: 5,

      limit: 5,

    };


  const blogTitleRemaining =
    Number(

      blogTitleUsage.remaining ?? 5

    );


  const blogTitleLimit =
    Number(

      blogTitleUsage.limit ?? 5

    );


  const blogTitleUsed =
    Number(

      blogTitleUsage.used ?? 0

    );


  /* =================================================
     REMAINING CREDIT PERCENTAGE

     5/5 = 100%

     4/5 = 80%

     3/5 = 60%

     2/5 = 40%

     1/5 = 20%

     0/5 = 0%
  ================================================= */

  const blogTitleUsagePercentage =
    blogTitleLimit > 0

      ? Math.max(

          0,

          Math.min(

            100,

            (
              blogTitleRemaining /
              blogTitleLimit
            ) * 100

          )

        )

      : 0;


  /* =================================================
     GENERATE BLOG TITLES
  ================================================= */

  const onSubmitHandler =
    async (e) => {

      e.preventDefault();


      /* ===============================================
         INPUT VALIDATION
      =============================================== */

      if (
        !input.trim()
      ) {

        toast.error(
          'Please enter a keyword or blog topic.'
        );

        return;

      }


      /* ===============================================
         FRONTEND FREE QUOTA CHECK

         This improves UX only.

         Backend must ALSO enforce the quota.


         FREE USER:

         5/5 → allowed

         4/5 → allowed

         3/5 → allowed

         2/5 → allowed

         1/5 → allowed

         0/5 → BLOCKED


         PRO USER:

         Always allowed.
      =============================================== */

      if (
        !isPro &&
        !hasCredits(
          'blogTitle'
        )
      ) {

        toast.error(
          'You have used all 5 free Blog Title credits. Upgrade to Genviq Pro to continue.'
        );

        return;

      }


      try {

        /* =============================================
           START LOADING

           Clear old content exactly when a new
           generation begins.
        ============================================= */

        setLoading(
          true
        );


        setContent(
          ''
        );


        setCopied(
          false
        );


        /* =============================================
           BUILD PROMPT

           Existing prompt behavior preserved.
        ============================================= */

        const prompt = `

Generate creative, engaging, and SEO-friendly blog titles.

Keyword/Topic: ${input.trim()}

Category: ${selectedCategory}

Generate multiple high-quality blog title ideas.

Keep the titles clear, compelling, and relevant to the topic.

`;


        /* =============================================
           GET CLERK TOKEN

           Clerk = authentication only.
        ============================================= */

        const token =
          await getToken();


        if (!token) {

          throw new Error(
            'Unable to get authentication token. Please sign in again.'
          );

        }


        /* =============================================
           CALL EXISTING GENVIQ API

           Existing endpoint preserved:

           POST /api/ai/generate-blog-title


           BACKEND FLOW SHOULD BE:

           Authenticate
                ↓
           Get Neon user
                ↓
           Check users.plan
                ↓

           FREE?

           Check:

           blog_title_used < 5

                ↓

           Generate titles successfully

                ↓

           Save creation successfully

                ↓

           Increment ONLY:

           blog_title_used

                ↓

           Return:

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

          '/api/ai/generate-blog-title',

          {

            prompt,

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
             SET GENERATED TITLES
          =========================================== */

          setContent(
            data.content
          );


          /* ===========================================
             UPDATE ONLY BLOG TITLE USAGE

             IMPORTANT:

             Feature key MUST be:

             "blogTitle"

             NOT:

             "blog"
             "title"
             "blogTitles"


             Example:

             BEFORE:

             blogTitle: {

               used: 0,

               remaining: 5,

               limit: 5

             }


             AFTER ONE SUCCESS:

             blogTitle: {

               used: 1,

               remaining: 4,

               limit: 5

             }


             Other tools remain unchanged.
          =========================================== */

          if (
            data.usage &&
            !data.usage.unlimited
          ) {

            updateFeatureUsage(

              'blogTitle',

              data.usage

            );

          }


          /* ===========================================
             SUCCESS MESSAGE
          =========================================== */

          if (isPro) {

            toast.success(
              'Blog titles generated successfully!'
            );

          } else {

            const newRemaining =

              data?.usage?.remaining ??

              Math.max(

                blogTitleRemaining - 1,

                0

              );


            toast.success(

              `Blog titles generated! ${newRemaining}/${blogTitleLimit} free generations remaining.`

            );

          }

        } else {

          /* ===========================================
             BACKEND success:false
          =========================================== */

          toast.error(

            data.message ||

            'Failed to generate blog titles.'

          );

        }

      } catch (error) {

        /* =============================================
           ERROR
        ============================================= */

        console.error(

          '❌ Blog title generation error:',

          error

        );


        const status =
          error?.response?.status;


        const message =

          error?.response?.data
            ?.message ||

          error?.message ||

          'Failed to generate blog titles.';


        /* =============================================
           FREE LIMIT ERROR

           Backend may return:

           HTTP 403

           {
             success: false,

             message:
             "Free blog title generation limit reached."
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
     COPY GENERATED TITLES

     IMPORTANT:

     Copying generated content does NOT consume
     another Blog Title credit.
  ================================================= */

  const copyToClipboard =
    async () => {

      if (!content) {

        return;

      }


      try {

        await navigator.clipboard.writeText(
          content
        );


        setCopied(
          true
        );


        toast.success(
          'Blog titles copied to clipboard!'
        );


        setTimeout(

          () => {

            setCopied(
              false
            );

          },

          2000

        );

      } catch (error) {

        console.error(

          '❌ Clipboard error:',

          error

        );


        toast.error(
          'Failed to copy titles.'
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
              PLAN + BLOG TITLE QUOTA BADGE

              OLD:

              <Protect plan="pro_user">


              NEW:

              Neon users.plan
                    ↓
              UsageContext
                    ↓
              isPro


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
                  blogTitleRemaining > 0

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
                    blogTitleRemaining > 0

                      ? 'text-gray-400'

                      : 'text-red-400'
                  }
                `}
              />


              <span
                className={`
                  font-medium

                  ${
                    blogTitleRemaining > 0

                      ? 'text-gray-300'

                      : 'text-red-300'
                  }
                `}
              >

                FREE · {blogTitleRemaining}/{blogTitleLimit} LEFT

              </span>

            </div>

          )}


          {/* ===========================================
              ORIGINAL TITLE
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

            AI Blog Title Generator

          </h1>


          <p
            className="
              text-sm
              text-gray-400
            "
          >

            Create compelling blog titles with AI

          </p>


          {/* ===========================================
              FREE BLOG TITLE CREDIT PROGRESS
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

                  Blog title credits

                </span>


                <span
                  className="
                    text-gray-300
                    font-medium
                  "
                >

                  {blogTitleRemaining}/{blogTitleLimit}

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
                      `${blogTitleUsagePercentage}%`,

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

                {blogTitleRemaining > 0

                  ? `${blogTitleUsed} used · ${blogTitleRemaining} remaining`

                  : 'Free blog title limit reached'}

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
                KEYWORD INPUT

                Existing UI + functionality preserved.
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

                    Keyword

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    Enter your blog topic

                  </p>

                </div>

              </div>


              {/* =======================================
                  KEYWORD FIELD
              ======================================= */}

              <input

                onChange={
                  (e) =>
                    setInput(
                      e.target.value
                    )
                }

                value={
                  input
                }

                type="text"

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

                  outline-none
                  transition-all
                "

                placeholder="Example: Future of backend development"

                required

              />


              {/* =======================================
                  KEYWORD INFO
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

                  Enter a clear topic for better title ideas

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
                CATEGORY SELECTION

                Existing categories preserved:

                General
                Technology
                Business
                Health
                Lifestyle
                Education
                Travel
                Food
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

                  <Hash
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

                    Category

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    Choose blog category

                  </p>

                </div>

              </div>


              {/* =======================================
                  CATEGORY BUTTONS
              ======================================= */}

              <div
                className="
                  flex
                  gap-2
                  flex-wrap
                "
              >

                {blogCategories.map(
                  (item) => (

                    <button

                      type="button"

                      onClick={
                        () =>
                          setSelectedCategory(
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
                          selectedCategory === item

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

                    </button>

                  )
                )}

              </div>


              {/* =======================================
                  SELECTED CATEGORY

                  This is display only.

                  Changing categories does NOT
                  consume a credit.
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

                  Selected category

                </span>


                <span
                  className="
                    text-xs
                    text-yellow-300
                    font-medium
                  "
                >

                  {selectedCategory}

                </span>

              </div>

            </div>


            {/* =========================================
                FREE LIMIT WARNING

                Only shown when:

                FREE USER
                    +
                blogTitleRemaining = 0
            ========================================= */}

            {!isPro &&
              blogTitleRemaining <= 0 && (

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

                        Free Blog Title limit reached

                      </p>


                      <p
                        className="
                          text-xs
                          text-gray-400
                          mt-1
                          leading-relaxed
                        "
                      >

                        You've used all {blogTitleLimit} free
                        Blog Title generations. Upgrade to
                        Genviq Pro to continue generating
                        AI blog titles.

                      </p>

                    </div>

                  </div>

                </div>

              )}


            {/* =========================================
                GENERATE TITLES BUTTON


                FREE:

                Generate Titles (5/5)

                      ↓ success

                Generate Titles (4/5)

                      ↓

                3/5
                2/5
                1/5
                0/5


                AT ZERO:

                Free Limit Reached


                PRO:

                Generate Titles
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
                  blogTitleRemaining <= 0
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
                blogTitleRemaining <= 0

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

                  <Hash
                    className="
                      w-4
                      h-4
                    "
                  />

                  Generate Titles


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

                      ({blogTitleRemaining}/{blogTitleLimit})

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

                Typing keyword:
                ❌ NO CREDIT

                Changing category:
                ❌ NO CREDIT

                Failed generation:
                ❌ NO CREDIT

                Successful generation:
                ✅ EXACTLY 1 CREDIT

                Copy generated titles:
                ❌ NO EXTRA CREDIT
            ========================================= */}

            {!isPro &&
              blogTitleRemaining > 0 && (

                <p
                  className="
                    text-center
                    text-[10px]
                    text-gray-500
                  "
                >

                  1 credit is used only after blog titles
                  are generated successfully.

                </p>

              )}

          </div>


          {/* ===========================================
              RIGHT PANEL

              GENERATED TITLES

              Existing UI preserved.
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

                  <Hash
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

                    Generated Titles

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    AI-powered blog titles

                  </p>

                </div>

              </div>


              {/* =======================================
                  COPY BUTTON

                  Existing functionality preserved.

                  Copying does NOT use another credit.
              ======================================= */}

              {content &&
                !loading && (

                  <button

                    type="button"

                    onClick={
                      copyToClipboard
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

                    {copied ? (

                      <CheckCircle
                        className="
                          w-3
                          h-3
                          text-green-400
                        "
                      />

                    ) : (

                      <Copy
                        className="
                          w-3
                          h-3
                        "
                      />

                    )}


                    {copied
                      ? 'Copied!'
                      : 'Copy'}

                  </button>

                )}

            </div>


            {/* =========================================
                PART 3 CONTINUES DIRECTLY HERE

                DO NOT CLOSE THE RIGHT PANEL.

                NEXT:

                - Creating Your Titles loading state

                - No Titles Generated state

                - Generated Markdown titles

                - Existing Markdown styling

                - Titles count

                - Words count

                - Category

                - Updated 5/5 → 4/5 status
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

                  Creating Your Titles

                </h3>


                <p
                  className="
                    text-sm
                    text-gray-400
                    mb-4
                    text-center
                  "
                >

                  AI is generating creative blog title ideas...

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
                      Creating
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
                      Refining
                    </span>

                  </div>

                </div>


                {/* =====================================
                    CREDIT MESSAGE

                    IMPORTANT:

                    Do not decrease the counter here.

                    Credit decreases only after the
                    backend successfully generates and
                    saves the titles.
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
                    the titles are generated successfully.

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

                  <Hash
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

                  No Titles Generated

                </h3>


                <p
                  className="
                    text-xs
                    text-gray-400
                    text-center
                    max-w-xs
                  "
                >

                  Enter a keyword and choose a category
                  to generate creative blog titles

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

                        Unlimited blog title generation

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

                        {blogTitleRemaining}/{blogTitleLimit}
                        {' '}free generations left

                      </span>

                    </>

                  )}

                </div>


                {/* =====================================
                    ZERO CREDIT MESSAGE
                ===================================== */}

                {!isPro &&
                  blogTitleRemaining <= 0 && (

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

                        Blog titles generated successfully

                      </p>


                      <p
                        className="
                          text-[10px]
                          text-gray-500
                          mt-0.5
                        "
                      >

                        Your AI-generated title ideas are ready

                      </p>

                    </div>

                  </div>


                  {/* ===================================
                      UPDATED QUOTA BADGE

                      Example:

                      Before:
                      5/5

                      Successful generation:
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

                      {blogTitleRemaining}/{blogTitleLimit} left

                    </div>

                  )}

                </div>


                {/* =====================================
                    GENERATED BLOG TITLES

                    Markdown rendering preserved.
                ===================================== */}

                <div
                  className="
                    bg-gray-700/30
                    rounded-lg
                    p-4
                    border
                    border-gray-600/30
                    max-h-[420px]
                    overflow-y-auto
                  "
                >

                  <div
                    className="
                      text-sm
                      text-gray-200
                      leading-relaxed

                      [&_h1]:text-xl
                      [&_h1]:font-bold
                      [&_h1]:text-white
                      [&_h1]:mb-3

                      [&_h2]:text-lg
                      [&_h2]:font-semibold
                      [&_h2]:text-white
                      [&_h2]:mb-2
                      [&_h2]:mt-3

                      [&_h3]:text-base
                      [&_h3]:font-semibold
                      [&_h3]:text-white
                      [&_h3]:mb-2

                      [&_p]:text-gray-300
                      [&_p]:mb-2

                      [&_ul]:space-y-2
                      [&_ul]:my-2

                      [&_ol]:space-y-2
                      [&_ol]:my-2

                      [&_li]:text-gray-200

                      [&_strong]:text-yellow-300
                      [&_strong]:font-semibold
                    "
                  >

                    <Markdown>

                      {content}

                    </Markdown>

                  </div>

                </div>


                {/* =====================================
                    RESULT STATISTICS

                    We calculate these only for display.

                    They do NOT affect quota.
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
                      TITLES / LINES
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

                      {
                        content

                          .split('\n')

                          .filter(
                            (line) =>
                              line.trim().length > 0
                          )

                          .length
                      }

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                        mt-1
                      "
                    >

                      Titles

                    </div>

                  </div>


                  {/* ===================================
                      WORD COUNT
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

                      {
                        content
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean)
                          .length
                      }

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                        mt-1
                      "
                    >

                      Words

                    </div>

                  </div>


                  {/* ===================================
                      CATEGORY
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
                        truncate
                      "
                    >

                      {selectedCategory}

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                        mt-1
                      "
                    >

                      Category

                    </div>

                  </div>

                </div>


                {/* =====================================
                    KEYWORD INFORMATION
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

                      Keyword / Topic

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
                    RESULT READY + CURRENT USAGE
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

                      Titles ready to use

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

                      {blogTitleRemaining}/{blogTitleLimit} remaining

                    </span>

                  )}

                </div>


                {/* =====================================
                    COPY CREDIT RULE

                    Generation already consumed exactly
                    one credit after backend success.

                    Copying these titles:

                    ❌ does NOT consume another credit.
                ===================================== */}

                <p
                  className="
                    text-center
                    text-[10px]
                    text-gray-500
                  "
                >

                  Copying these titles does not use
                  another AI credit.

                </p>

              </div>

            )}

          </div>

        </div>


        {/* =============================================
            MAIN TWO-COLUMN GRID CLOSED

            DO NOT CLOSE THE PAGE/COMPONENT YET.

            PART 4 CONTINUES DIRECTLY HERE WITH:

            - Current Plan card
            - Blog Title Usage card
            - Generation Status card

            - Free Plan information
            - 5/5 progress display

            - 0/5 exhausted state

            - Genviq Pro unlimited state

            - Final closing tags

            - export default BlogTitles
        ============================================= */}        {/* =============================================
            BLOG TITLE TOOL INFORMATION
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
              BLOG TITLE USAGE
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

                <Hash
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

                  Blog Title Usage

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

                    {blogTitleRemaining}/{blogTitleLimit} Remaining

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
                    : 'Waiting for Keyword'}

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

                      Category: {selectedCategory}

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

                    Free AI Blog Title Generation

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
                    {blogTitleLimit} Blog Title generations.

                    {' '}

                    One credit is counted only after
                    titles are generated successfully.

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
                        blogTitleRemaining > 0
                          ? 'text-white'
                          : 'text-red-400'
                      }
                    `}
                  >

                    {blogTitleRemaining}/{blogTitleLimit}

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
                        `${blogTitleUsagePercentage}%`,

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

                  {blogTitleUsed} of {blogTitleLimit} used

                </p>

              </div>

            </div>

          </div>

        )}


        {/* =============================================
            FREE LIMIT EXHAUSTED

            ONLY:

            FREE USER + 0/5
        ============================================= */}

        {!isPro &&
          blogTitleRemaining <= 0 && (

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

                    You've used all free Blog Title credits

                  </p>


                  <p
                    className="
                      text-xs
                      text-gray-400
                      mt-1
                      leading-relaxed
                    "
                  >

                    Your {blogTitleLimit} free Blog Title
                    generations have been consumed.

                    {' '}

                    Upgrade to Genviq Pro to continue
                    generating AI blog titles.

                  </p>

                </div>

              </div>

            </div>

          )}


        {/* =============================================
            PRO PLAN INFORMATION

            PLAN SOURCE:

            Neon:
            users.plan = "pro"

            NOT:

            Clerk Billing
            Clerk Protect
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
                  AI Blog Title generation without
                  the free 5-generation limit.

                </p>

              </div>

            </div>

          </div>

        )}


        {/* =============================================
            BLOG TITLE QUOTA FLOW


            NEW FREE USER

            Neon:

            blog_title_used = 0

                    ↓

            GET /api/user/usage

                    ↓

            UsageContext:

            blogTitle: {

              used: 0,

              remaining: 5,

              limit: 5

            }

                    ↓

            BlogTitles.jsx:

            FREE · 5/5 LEFT


            =============================================

            FIRST SUCCESSFUL GENERATION

            POST:

            /api/ai/generate-blog-title

                    ↓

            Clerk verifies authentication

                    ↓

            auth middleware reads Neon plan

                    ↓

            FREE USER:

            Check:

            blog_title_used < 5

                    ↓

            AI successfully generates titles

                    ↓

            Creation saved successfully

                    ↓

            Increment ONLY:

            blog_title_used

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

              "blogTitle",

              data.usage

            )

                    ↓

            UI updates instantly:

            5/5 → 4/5


            =============================================

            SECOND SUCCESS:

            4/5 → 3/5


            THIRD SUCCESS:

            3/5 → 2/5


            FOURTH SUCCESS:

            2/5 → 1/5


            FIFTH SUCCESS:

            1/5 → 0/5


            =============================================

            AT 0/5:

            Generate Titles button

                    ↓

            DISABLED


            Backend must ALSO reject attempts

                    ↓

            HTTP 403

            {
              success: false,

              message:
              "Free blog title generation limit reached."
            }


            =============================================

            IMPORTANT:

            EACH TOOL IS COMPLETELY INDEPENDENT


            Example:

            User generates ONE Blog Title request.


            BEFORE:

            Article             5/5
            Blog Title          5/5
            Image               5/5
            Background Removal  5/5
            Object Removal      5/5
            Resume Review       5/5


            AFTER:

            Article             5/5
            Blog Title          4/5  ← ONLY THIS
            Image               5/5
            Background Removal  5/5
            Object Removal      5/5
            Resume Review       5/5


            =============================================

            CREDIT RULES


            Enter keyword:

            ❌ NO CREDIT


            Change category:

            ❌ NO CREDIT


            Failed AI generation:

            ❌ NO CREDIT


            Database save failure:

            ❌ NO CREDIT


            Successful complete generation:

            ✅ EXACTLY 1 BLOG TITLE CREDIT


            Copy generated titles:

            ❌ NO EXTRA CREDIT


            =============================================

            PRO USER


            Neon:

            users.plan = "pro"

                    ↓

            UsageContext:

            isPro = true

                    ↓

            FREE blog title quota bypassed

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

export default BlogTitles;