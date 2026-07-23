import React, {
  useState,
} from 'react';

import {
  Edit,
  Sparkles,
  Crown,
  Copy,
  Zap,
  Clock,
  FileText,
  Loader,
  CheckCircle,
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
   WRITE ARTICLE
===================================================== */

const WriteArticle = () => {

  /* =================================================
     ARTICLE LENGTH OPTIONS
  ================================================= */

  const articleLength = [

    {
      length: 800,

      text: 'Short',

      description:
        '500-800 words',
    },

    {
      length: 1200,

      text: 'Medium',

      description:
        '800-1200 words',
    },

    {
      length: 1600,

      text: 'Long',

      description:
        '1200+ words',
    },

  ];


  /* =================================================
     STATE
  ================================================= */

  const [
    selectedLength,
    setSelectedLength,
  ] = useState(
    articleLength[0]
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
     CLERK AUTHENTICATION

     Clerk is ONLY responsible for:

     - Authentication
     - Auth token

     Clerk Billing is NOT used.
  ================================================= */

  const {
    getToken,
  } = useAuth();


  /* =================================================
     GENVIQ PLAN + ARTICLE USAGE

     Source of truth:

     Neon
       ↓
     GET /api/user/usage
       ↓
     UsageContext
       ↓
     WriteArticle

     FREE:
     5 successful article generations

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
     ARTICLE USAGE

     New FREE account:

     used      = 0
     remaining = 5
     limit     = 5
  ================================================= */

  const articleUsage =
    usage?.article || {

      used: 0,

      remaining: 5,

      limit: 5,

    };


  const articleRemaining =
    Number(
      articleUsage.remaining ?? 5
    );


  const articleLimit =
    Number(
      articleUsage.limit ?? 5
    );


  const articleUsed =
    Number(
      articleUsage.used ?? 0
    );


  /* =================================================
     ARTICLE USAGE PERCENTAGE

     5/5 → 100%
     4/5 → 80%
     3/5 → 60%
     2/5 → 40%
     1/5 → 20%
     0/5 → 0%
  ================================================= */

  const articleUsagePercentage =
    articleLimit > 0

      ? Math.max(
          0,

          Math.min(
            100,

            (
              articleRemaining /
              articleLimit
            ) * 100
          )
        )

      : 0;


  /* =================================================
     GENERATE ARTICLE
  ================================================= */

  const onSubmitHandler =
    async (e) => {

      e.preventDefault();


      /* ===============================================
         TOPIC VALIDATION
      =============================================== */

      if (
        !input.trim()
      ) {

        toast.error(
          'Please enter an article topic.'
        );

        return;

      }


      /* ===============================================
         FRONTEND FREE QUOTA CHECK

         IMPORTANT:

         This is only for better UX.

         The backend still performs the REAL
         security/quota validation.

         FREE:

         5/5 → allowed
         4/5 → allowed
         ...
         1/5 → allowed
         0/5 → blocked

         PRO:

         Always allowed.
      =============================================== */

      if (
        !isPro &&
        !hasCredits('article')
      ) {

        toast.error(
          'You have used all 5 free Article Writing credits. Upgrade to Genviq Pro to continue.'
        );

        return;

      }


      try {

        /* =============================================
           START LOADING
        ============================================= */

        setLoading(true);


        /*
          Clear previous article before
          generating a new one.
        */

        setContent('');


        /* =============================================
           BUILD ARTICLE PROMPT
        ============================================= */

        const prompt = `
Write a professional, engaging and well-structured article.

Topic:
${input.trim()}

Target length:
${selectedLength.description}

Requirements:
- Use a clear title
- Use meaningful headings and subheadings
- Write naturally and professionally
- Make the article informative
- Avoid unnecessary repetition
- Use readable paragraphs
- Use bullet points where appropriate
`;


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

           Backend:

           POST /api/ai/generate-article

           Backend performs:

           1. Authentication
           2. Neon plan check
           3. Article quota check
           4. AI generation
           5. Save creation
           6. Increment article_generation_used
           7. Return updated usage
        ============================================= */

        const {
          data,
        } = await axios.post(

          '/api/ai/generate-article',

          {

            prompt,

            length:
              selectedLength.length,

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
             SET GENERATED ARTICLE
          =========================================== */

          setContent(
            data.content
          );


          /* ===========================================
             UPDATE ONLY ARTICLE USAGE

             Backend FREE response example:

             usage: {
               used: 1,
               remaining: 4,
               limit: 5
             }

             UsageContext immediately changes:

             Article:
             5/5
              ↓
             4/5

             Dashboard + Sidebar also receive
             the same shared state instantly.
          =========================================== */

          if (
            data.usage &&
            !data.usage.unlimited
          ) {

            updateFeatureUsage(

              'article',

              data.usage

            );

          }


          /* ===========================================
             SUCCESS MESSAGE
          =========================================== */

          if (isPro) {

            toast.success(
              'Article generated successfully!'
            );

          } else {

            /*
              Calculate the expected new remaining
              value for the toast.

              Prefer backend value whenever available.
            */

            const newRemaining =
              data?.usage?.remaining ??
              Math.max(
                articleRemaining - 1,
                0
              );


            toast.success(
              `Article generated! ${newRemaining}/${articleLimit} free uses remaining.`
            );

          }

        } else {

          /* ===========================================
             BACKEND RETURNED success:false
          =========================================== */

          toast.error(

            data.message ||

            'Failed to generate article.'

          );

        }

      } catch (error) {

        /* =============================================
           ERROR LOG
        ============================================= */

        console.error(

          '❌ Article generation error:',

          error

        );


        /* =============================================
           EXTRACT BACKEND ERROR
        ============================================= */

        const status =
          error?.response?.status;


        const message =

          error?.response?.data
            ?.message ||

          error?.message ||

          'Failed to generate article.';


        /* =============================================
           QUOTA EXHAUSTED

           Backend should return 403 when free
           quota is exhausted.

           We show the backend message directly.
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

        /* =============================================
           STOP LOADING
        ============================================= */

        setLoading(false);

      }

    };


  /* =================================================
     COPY ARTICLE
  ================================================= */

  const copyToClipboard =
    async () => {

      if (!content) {

        return;

      }


      try {

        await navigator.clipboard
          .writeText(
            content
          );


        setCopied(true);


        toast.success(
          'Article copied to clipboard!'
        );


        setTimeout(
          () => {

            setCopied(false);

          },

          2000
        );

      } catch (error) {

        console.error(

          '❌ Clipboard error:',

          error

        );


        toast.error(
          'Failed to copy article.'
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
        p-4
        sm:p-6
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
              NEON PLAN + ARTICLE USAGE BADGE

              NO CLERK BILLING
              NO <Protect plan="pro_user">

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
                  articleRemaining > 0

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
                    articleRemaining > 0

                      ? 'text-gray-400'

                      : 'text-red-400'
                  }
                `}
              />


              <span
                className={`
                  font-medium

                  ${
                    articleRemaining > 0

                      ? 'text-gray-300'

                      : 'text-red-300'
                  }
                `}
              >

                FREE · {articleRemaining}/{articleLimit} LEFT

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

            AI Article Writer

          </h1>


          <p
            className="
              text-sm
              text-gray-400
            "
          >

            Create professional articles with AI

          </p>


          {/* ===========================================
              FREE USAGE INDICATOR
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

                  Article credits

                </span>


                <span
                  className="
                    text-gray-300
                    font-medium
                  "
                >

                  {articleRemaining}/{articleLimit}

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
                      `${articleUsagePercentage}%`,

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

                {articleRemaining > 0

                  ? `${articleUsed} used · ${articleRemaining} remaining`

                  : 'Free article limit reached'}

              </p>

            </div>

          )}

        </div>


        {/* =============================================
            MAIN GRID START
        ============================================= */}

        <div
          className="
            grid
            grid-cols-1
            xl:grid-cols-2
            gap-4
          "
        >

                    {/* ===========================================
              LEFT PANEL
          =========================================== */}

          <div
            className="
              space-y-4
            "
          >

            {/* =========================================
                ARTICLE TOPIC
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

              {/* TOPIC HEADER */}

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

                  <Edit
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

                    Article Topic

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    What would you like to write about?

                  </p>

                </div>

              </div>


              {/* =========================================
                  TOPIC INPUT
              ========================================= */}

              <input

                onChange={(e) =>
                  setInput(
                    e.target.value
                  )
                }

                value={input}

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

                placeholder="Example: The future of artificial intelligence"

                required

              />


              {/* =========================================
                  SMALL CREDIT INFO

                  FREE:
                  Shows remaining article credits.

                  PRO:
                  Shows unlimited.
              ========================================= */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  mt-2
                  px-1
                "
              >

                <p
                  className="
                    text-[10px]
                    text-gray-500
                  "
                >

                  Be specific for better results

                </p>


                {isPro ? (

                  <span
                    className="
                      text-[10px]
                      text-yellow-400
                      flex
                      items-center
                      gap-1
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

                      ${
                        articleRemaining > 0

                          ? 'text-gray-400'

                          : 'text-red-400'
                      }
                    `}
                  >

                    {articleRemaining}/{articleLimit} uses left

                  </span>

                )}

              </div>

            </div>


            {/* =========================================
                ARTICLE LENGTH
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

              {/* LENGTH HEADER */}

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
                    from-amber-400
                    to-orange-500
                    flex
                    items-center
                    justify-center
                  "
                >

                  <Clock
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

                    Article Length

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    Choose your preferred length

                  </p>

                </div>

              </div>


              {/* =========================================
                  LENGTH OPTIONS
              ========================================= */}

              <div
                className="
                  space-y-2
                "
              >

                {articleLength.map(
                  (
                    item,
                    index
                  ) => (

                    <button

                      type="button"

                      onClick={() =>
                        setSelectedLength(
                          item
                        )
                      }

                      className={`
                        w-full
                        text-left
                        p-3
                        rounded-lg
                        border
                        cursor-pointer
                        transition-all

                        ${
                          selectedLength.text ===
                          item.text

                            ? `
                              bg-yellow-500/10
                              border-yellow-500/50
                            `

                            : `
                              bg-gray-700/30
                              border-gray-600
                              hover:border-yellow-500/30
                            `
                        }
                      `}

                      key={index}

                    >

                      <div
                        className="
                          flex
                          items-center
                          justify-between
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

                          {/* SELECTED DOT */}

                          <div
                            className={`
                              w-2
                              h-2
                              rounded-full
                              shrink-0

                              ${
                                selectedLength.text ===
                                item.text

                                  ? `
                                    bg-yellow-400
                                    shadow-lg
                                    shadow-yellow-400/40
                                  `

                                  : `
                                    bg-gray-400
                                  `
                              }
                            `}
                          />


                          {/* LENGTH INFO */}

                          <div>

                            <h3
                              className={`
                                text-sm
                                font-medium

                                ${
                                  selectedLength.text ===
                                  item.text

                                    ? 'text-yellow-300'

                                    : 'text-white'
                                }
                              `}
                            >

                              {item.text}

                            </h3>


                            <p
                              className="
                                text-xs
                                text-gray-400
                              "
                            >

                              {item.description}

                            </p>

                          </div>

                        </div>


                        {/* SELECTED LABEL */}

                        {selectedLength.text ===
                          item.text && (

                          <div
                            className="
                              flex
                              items-center
                              gap-1
                              text-[10px]
                              text-yellow-400
                              bg-yellow-500/10
                              border
                              border-yellow-500/20
                              rounded-full
                              px-2
                              py-1
                            "
                          >

                            <CheckCircle
                              className="
                                w-2.5
                                h-2.5
                              "
                            />

                            Selected

                          </div>

                        )}

                      </div>

                    </button>

                  )
                )}

              </div>

            </div>


            {/* =========================================
                FREE LIMIT REACHED WARNING

                Only visible when:

                plan = FREE
                AND
                articleRemaining = 0
            ========================================= */}

            {!isPro &&
              articleRemaining <= 0 && (

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

                        Free article limit reached

                      </p>


                      <p
                        className="
                          text-xs
                          text-gray-400
                          mt-1
                          leading-relaxed
                        "
                      >

                        You've used all {articleLimit} free
                        Article Writing credits. Upgrade to
                        Genviq Pro to continue generating
                        articles.

                      </p>

                    </div>

                  </div>

                </div>

              )}


            {/* =========================================
                GENERATE BUTTON

                FREE WITH CREDITS:
                Generate Article (5/5)

                FREE AT ZERO:
                Free Limit Reached

                PRO:
                Generate Article
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
                  articleRemaining <= 0
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

                  Generating...

                </>

              ) : (

                /* =====================================
                   FREE LIMIT EXHAUSTED
                ===================================== */

                !isPro &&
                articleRemaining <= 0

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
                   NORMAL GENERATE BUTTON
                ===================================== */

                <>

                  <Zap
                    className="
                      w-4
                      h-4
                    "
                  />

                  Generate Article


                  {/* FREE COUNTER */}

                  {!isPro && (

                    <span
                      className="
                        ml-1
                        text-black/60
                        font-medium
                      "
                    >

                      ({articleRemaining}/{articleLimit})

                    </span>

                  )}


                  {/* PRO INDICATOR */}

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
                GENERATION CREDIT EXPLANATION
            ========================================= */}

            {!isPro &&
              articleRemaining > 0 && (

                <p
                  className="
                    text-center
                    text-[10px]
                    text-gray-500
                  "
                >

                  1 credit is used only after an article
                  is generated successfully.

                </p>

              )}

          </div>


          {/* ===========================================
              RIGHT PANEL
              GENERATED ARTICLE RESULT
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

                  <FileText
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

                    Generated Article

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    AI-powered content

                  </p>

                </div>

              </div>


              {/* =========================================
                  COPY BUTTON
              ========================================= */}

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
                LOADING / EMPTY / RESULT STARTS NEXT
            ========================================= */}
                        {/* =========================================
                RESULT CONTENT AREA
            ========================================= */}

            <div
              className="
                min-h-[500px]
                max-h-[700px]
                overflow-y-auto
                rounded-lg
                bg-gray-900/40
                border
                border-gray-700/50
              "
            >

              {/* =======================================
                  LOADING STATE
              ======================================= */}

              {loading ? (

                <div
                  className="
                    min-h-[500px]
                    flex
                    flex-col
                    items-center
                    justify-center
                    px-6
                    text-center
                  "
                >

                  {/* ANIMATED LOADER */}

                  <div
                    className="
                      relative
                      mb-5
                    "
                  >

                    <div
                      className="
                        w-16
                        h-16
                        rounded-full
                        border-2
                        border-yellow-500/20
                        animate-spin
                      "
                    />


                    <div
                      className="
                        absolute
                        inset-0
                        w-16
                        h-16
                        rounded-full
                        border-2
                        border-transparent
                        border-t-yellow-400
                        animate-spin
                      "
                    />


                    <div
                      className="
                        absolute
                        inset-0
                        flex
                        items-center
                        justify-center
                      "
                    >

                      <Sparkles
                        className="
                          w-6
                          h-6
                          text-yellow-400
                          animate-pulse
                        "
                      />

                    </div>

                  </div>


                  <h3
                    className="
                      text-base
                      font-semibold
                      text-white
                      mb-2
                    "
                  >

                    Writing your article...

                  </h3>


                  <p
                    className="
                      text-sm
                      text-gray-400
                      max-w-sm
                      leading-relaxed
                    "
                  >

                    Genviq is creating a structured,
                    professional article based on your
                    topic and selected length.

                  </p>


                  {/* LOADING STEPS */}

                  <div
                    className="
                      mt-6
                      flex
                      flex-wrap
                      items-center
                      justify-center
                      gap-2
                    "
                  >

                    <span
                      className="
                        px-3
                        py-1.5
                        rounded-full
                        bg-yellow-500/10
                        border
                        border-yellow-500/20
                        text-[10px]
                        text-yellow-300
                      "
                    >

                      Understanding topic

                    </span>


                    <span
                      className="
                        px-3
                        py-1.5
                        rounded-full
                        bg-gray-800
                        border
                        border-gray-700
                        text-[10px]
                        text-gray-400
                      "
                    >

                      Structuring content

                    </span>


                    <span
                      className="
                        px-3
                        py-1.5
                        rounded-full
                        bg-gray-800
                        border
                        border-gray-700
                        text-[10px]
                        text-gray-400
                      "
                    >

                      Writing article

                    </span>

                  </div>

                </div>

              ) : content ? (

                /* =====================================
                   GENERATED ARTICLE
                ===================================== */

                <div
                  className="
                    p-5
                    sm:p-6
                  "
                >

                  {/* ===================================
                      SUCCESS INDICATOR
                  =================================== */}

                  <div
                    className="
                      flex
                      flex-col
                      sm:flex-row
                      sm:items-center
                      justify-between
                      gap-3
                      mb-5
                      pb-4
                      border-b
                      border-gray-700/50
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
                          w-7
                          h-7
                          rounded-full
                          bg-green-500/10
                          border
                          border-green-500/20
                          flex
                          items-center
                          justify-center
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

                          Article generated successfully

                        </p>


                        <p
                          className="
                            text-[10px]
                            text-gray-500
                            mt-0.5
                          "
                        >

                          {selectedLength.text} article ·{' '}
                          {selectedLength.description}

                        </p>

                      </div>

                    </div>


                    {/* CURRENT PLAN / CREDIT */}

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

                        {articleRemaining}/{articleLimit} left

                      </div>

                    )}

                  </div>


                  {/* ===================================
                      MARKDOWN ARTICLE

                      react-markdown renders:
                      # headings
                      ## headings
                      paragraphs
                      lists
                      bold text
                      etc.
                  =================================== */}

                  <div
                    className="
                      article-content
                      text-gray-300
                      leading-relaxed
                    "
                  >

                    <Markdown

                      components={{

                        /* =============================
                           H1
                        ============================= */

                        h1: ({
                          children,
                        }) => (

                          <h1
                            className="
                              text-2xl
                              sm:text-3xl
                              font-bold
                              text-white
                              mb-5
                              mt-2
                              leading-tight
                            "
                          >

                            {children}

                          </h1>

                        ),


                        /* =============================
                           H2
                        ============================= */

                        h2: ({
                          children,
                        }) => (

                          <h2
                            className="
                              text-xl
                              sm:text-2xl
                              font-semibold
                              text-yellow-100
                              mt-7
                              mb-3
                              leading-tight
                            "
                          >

                            {children}

                          </h2>

                        ),


                        /* =============================
                           H3
                        ============================= */

                        h3: ({
                          children,
                        }) => (

                          <h3
                            className="
                              text-lg
                              font-semibold
                              text-yellow-200
                              mt-6
                              mb-2
                            "
                          >

                            {children}

                          </h3>

                        ),


                        /* =============================
                           PARAGRAPH
                        ============================= */

                        p: ({
                          children,
                        }) => (

                          <p
                            className="
                              text-sm
                              sm:text-[15px]
                              text-gray-300
                              leading-7
                              mb-4
                            "
                          >

                            {children}

                          </p>

                        ),


                        /* =============================
                           UNORDERED LIST
                        ============================= */

                        ul: ({
                          children,
                        }) => (

                          <ul
                            className="
                              list-disc
                              pl-6
                              mb-5
                              space-y-2
                              text-gray-300
                            "
                          >

                            {children}

                          </ul>

                        ),


                        /* =============================
                           ORDERED LIST
                        ============================= */

                        ol: ({
                          children,
                        }) => (

                          <ol
                            className="
                              list-decimal
                              pl-6
                              mb-5
                              space-y-2
                              text-gray-300
                            "
                          >

                            {children}

                          </ol>

                        ),


                        /* =============================
                           LIST ITEM
                        ============================= */

                        li: ({
                          children,
                        }) => (

                          <li
                            className="
                              text-sm
                              sm:text-[15px]
                              leading-7
                              pl-1
                            "
                          >

                            {children}

                          </li>

                        ),


                        /* =============================
                           STRONG / BOLD
                        ============================= */

                        strong: ({
                          children,
                        }) => (

                          <strong
                            className="
                              font-semibold
                              text-white
                            "
                          >

                            {children}

                          </strong>

                        ),


                        /* =============================
                           BLOCKQUOTE
                        ============================= */

                        blockquote: ({
                          children,
                        }) => (

                          <blockquote
                            className="
                              my-5
                              border-l-4
                              border-yellow-500
                              bg-yellow-500/5
                              rounded-r-lg
                              px-4
                              py-3
                              text-gray-300
                              italic
                            "
                          >

                            {children}

                          </blockquote>

                        ),


                        /* =============================
                           HORIZONTAL RULE
                        ============================= */

                        hr: () => (

                          <hr
                            className="
                              my-6
                              border-gray-700
                            "
                          />

                        ),

                      }}

                    >

                      {content}

                    </Markdown>

                  </div>

                </div>

              ) : (

                /* =====================================
                   EMPTY STATE
                ===================================== */

                <div
                  className="
                    min-h-[500px]
                    flex
                    flex-col
                    items-center
                    justify-center
                    text-center
                    px-6
                  "
                >

                  {/* EMPTY ICON */}

                  <div
                    className="
                      w-16
                      h-16
                      rounded-2xl
                      bg-gradient-to-br
                      from-yellow-500/10
                      to-amber-500/5
                      border
                      border-yellow-500/20
                      flex
                      items-center
                      justify-center
                      mb-5
                    "
                  >

                    <Edit
                      className="
                        w-7
                        h-7
                        text-yellow-400
                      "
                    />

                  </div>


                  <h3
                    className="
                      text-base
                      font-semibold
                      text-white
                      mb-2
                    "
                  >

                    Ready to write

                  </h3>


                  <p
                    className="
                      text-sm
                      text-gray-400
                      max-w-sm
                      leading-relaxed
                    "
                  >

                    Enter an article topic, choose your
                    preferred length, and let Genviq
                    create your article.

                  </p>


                  {/* ===================================
                      EMPTY STATE PLAN INFO
                  =================================== */}

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

                          Unlimited article generation

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

                          {articleRemaining}/{articleLimit}
                          {' '}free article generations left

                        </span>

                      </>

                    )}

                  </div>


                  {/* ===================================
                      EXHAUSTED MESSAGE
                  =================================== */}

                  {!isPro &&
                    articleRemaining <= 0 && (

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

              )}

            </div>


            {/* =========================================
                RESULT FOOTER
            ========================================= */}

            <div
              className="
                flex
                flex-wrap
                items-center
                justify-between
                gap-2
                mt-3
                px-1
              "
            >

              <p
                className="
                  text-[10px]
                  text-gray-500
                "
              >

                AI-generated content may require fact-checking
                before publishing.

              </p>


              {content &&
                !loading && (

                  <div
                    className="
                      flex
                      items-center
                      gap-1.5
                      text-[10px]
                      text-green-400
                    "
                  >

                    <CheckCircle
                      className="
                        w-3
                        h-3
                      "
                    />

                    Generation complete

                  </div>

                )}

            </div>

          </div>

        </div>


        {/* =============================================
            MAIN GRID ENDS ABOVE

            PART 4 WILL CONTINUE HERE WITH:
            - Usage / feature stats section
            - Free vs Pro information
            - Final component closing tags
            - export default WriteArticle
        ============================================= */}
                {/* =============================================
            ARTICLE TOOL INFORMATION
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
              ARTICLE USAGE
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

                <FileText
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

                  Article Usage

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

                    {articleRemaining}/{articleLimit} Remaining

                  </p>

                )}

              </div>

            </div>

          </div>


          {/* ===========================================
              SELECTED LENGTH
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
                  bg-amber-500/10
                  border
                  border-amber-500/20
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >

                <Clock
                  className="
                    w-4
                    h-4
                    text-amber-400
                  "
                />

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

                  Selected Length

                </p>


                <p
                  className="
                    text-sm
                    font-semibold
                    text-white
                    mt-0.5
                  "
                >

                  {selectedLength.text}

                </p>


                <p
                  className="
                    text-[10px]
                    text-gray-500
                    mt-0.5
                  "
                >

                  {selectedLength.description}

                </p>

              </div>

            </div>

          </div>

        </div>


        {/* =============================================
            FREE PLAN INFORMATION

            This section disappears for Pro users.
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

                    Free Article Writing

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
                    {articleLimit} Article Writing
                    generations.

                    {' '}

                    A credit is counted only after a
                    successful generation.

                  </p>

                </div>

              </div>


              {/* =======================================
                  CREDIT DISPLAY
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
                        articleRemaining > 0
                          ? 'text-white'
                          : 'text-red-400'
                      }
                    `}
                  >

                    {articleRemaining}/{articleLimit}

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
                        `${articleUsagePercentage}%`,

                    }}
                  />

                </div>

              </div>

            </div>

          </div>

        )}


        {/* =============================================
            PRO PLAN INFORMATION

            Only visible when Neon says:

            plan = "pro"
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
                  "
                >

                  Your Pro plan has full access to
                  Article Writing without the free
                  5-generation limit.

                </p>

              </div>

            </div>

          </div>

        )}


        {/* =============================================
            IMPORTANT ARCHITECTURE NOTE

            Actual quota security happens on backend:

            POST /api/ai/generate-article

            Frontend:
            - Shows remaining quota
            - Disables button at 0/5
            - Updates UI after success

            Backend:
            - Checks Neon plan
            - Checks actual quota
            - Blocks requests at limit
            - Generates article
            - Increments usage after success

            This prevents users from bypassing the
            frontend by directly calling the API.
        ============================================= */}

      </div>

    </div>

  );

};


/* =====================================================
   EXPORT
===================================================== */

export default WriteArticle;