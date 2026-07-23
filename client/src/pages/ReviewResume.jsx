import React, {
  useState,
} from 'react';

import {
  FileText,
  Sparkles,
  Crown,
  Eye,
  Zap,
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
   REVIEW RESUME
===================================================== */

const ReviewResume = () => {


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
    resumePreview,
    setResumePreview,
  ] = useState('');


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
     GENVIQ PLAN + RESUME REVIEW USAGE

     Source of truth:

     Neon
       ↓
     GET /api/user/usage
       ↓
     UsageContext
       ↓
     ReviewResume

     FREE:
     5 successful resume analyses

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
     RESUME REVIEW USAGE

     New FREE account:

     used      = 0
     remaining = 5
     limit     = 5
  ================================================= */

  const resumeUsage =
    usage?.resumeReview || {

      used: 0,

      remaining: 5,

      limit: 5,

    };


  const resumeRemaining =
    Number(
      resumeUsage.remaining ?? 5
    );


  const resumeLimit =
    Number(
      resumeUsage.limit ?? 5
    );


  const resumeUsed =
    Number(
      resumeUsage.used ?? 0
    );


  /* =================================================
     RESUME USAGE PERCENTAGE

     5/5 → 100%
     4/5 → 80%
     3/5 → 60%
     2/5 → 40%
     1/5 → 20%
     0/5 → 0%
  ================================================= */

  const resumeUsagePercentage =
    resumeLimit > 0

      ? Math.max(
          0,

          Math.min(
            100,

            (
              resumeRemaining /
              resumeLimit
            ) * 100
          )
        )

      : 0;


  /* =================================================
     HANDLE RESUME FILE
  ================================================= */

  const handleFileChange =
    (e) => {

      const file =
        e.target.files?.[0];


      if (!file) {

        return;

      }


      /* ===============================================
         PDF VALIDATION
      =============================================== */

      if (
        file.type !==
        'application/pdf'
      ) {

        toast.error(
          'Please upload a PDF resume.'
        );

        e.target.value = '';

        return;

      }


      /* ===============================================
         CLEAN PREVIOUS PREVIEW
      =============================================== */

      if (resumePreview) {

        URL.revokeObjectURL(
          resumePreview
        );

      }


      /* ===============================================
         SAVE FILE
      =============================================== */

      setInput(
        file
      );


      /* ===============================================
         CREATE PDF PREVIEW URL
      =============================================== */

      const previewUrl =
        URL.createObjectURL(
          file
        );


      setResumePreview(
        previewUrl
      );


      /* ===============================================
         CLEAR PREVIOUS ANALYSIS

         When a new resume is selected,
         old analysis should disappear.
      =============================================== */

      setContent('');

    };


  /* =================================================
     REVIEW / ANALYZE RESUME
  ================================================= */

  const onSubmitHandler =
    async (e) => {

      e.preventDefault();


      /* ===============================================
         FILE VALIDATION
      =============================================== */

      if (!input) {

        toast.error(
          'Please select a resume file first.'
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
        !hasCredits(
          'resumeReview'
        )
      ) {

        toast.error(
          'You have used all 5 free Resume Review credits. Upgrade to Genviq Pro to continue.'
        );

        return;

      }


      try {

        /* =============================================
           START LOADING
        ============================================= */

        setLoading(true);


        /*
          Clear previous analysis before
          analyzing another resume.
        */

        setContent('');


        /* =============================================
           CREATE FORM DATA
        ============================================= */

        const formData =
          new FormData();


        formData.append(
          'resume',
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

           Backend:

           POST /api/ai/resume-review

           Backend performs:

           1. Authentication
           2. Neon plan check
           3. Resume quota check
           4. PDF extraction
           5. AI resume analysis
           6. Save creation
           7. Increment resume_analysis_used
           8. Return updated usage
        ============================================= */

        const {
          data,
        } = await axios.post(

          '/api/ai/resume-review',

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
             SET RESUME ANALYSIS
          =========================================== */

          setContent(
            data.content
          );


          /* ===========================================
             UPDATE ONLY RESUME REVIEW USAGE

             Backend FREE response example:

             usage: {
               used: 1,
               remaining: 4,
               limit: 5
             }

             UsageContext immediately changes:

             Resume Review:
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

              'resumeReview',

              data.usage

            );

          }


          /* ===========================================
             SUCCESS MESSAGE
          =========================================== */

          if (isPro) {

            toast.success(
              'Resume analyzed successfully!'
            );

          } else {

            /*
              Prefer the exact value returned
              by the backend.
            */

            const newRemaining =
              data?.usage?.remaining ??
              Math.max(
                resumeRemaining - 1,
                0
              );


            toast.success(
              `Resume analyzed! ${newRemaining}/${resumeLimit} free uses remaining.`
            );

          }

        } else {

          /* ===========================================
             BACKEND RETURNED success:false
          =========================================== */

          toast.error(

            data.message ||

            'Failed to analyze resume.'

          );

        }

      } catch (error) {

        /* =============================================
           ERROR LOG
        ============================================= */

        console.error(

          '❌ Resume review error:',

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

          'Resume analysis failed.';


        /* =============================================
           QUOTA EXHAUSTED
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
              NEON PLAN + RESUME USAGE BADGE

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
                  resumeRemaining > 0

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
                    resumeRemaining > 0

                      ? 'text-gray-400'

                      : 'text-red-400'
                  }
                `}
              />


              <span
                className={`
                  font-medium

                  ${
                    resumeRemaining > 0

                      ? 'text-gray-300'

                      : 'text-red-300'
                  }
                `}
              >

                FREE · {resumeRemaining}/{resumeLimit} LEFT

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

            AI Resume Review

          </h1>


          <p
            className="
              text-sm
              text-gray-400
            "
          >

            Get professional resume analysis and feedback

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

                  Resume review credits

                </span>


                <span
                  className="
                    text-gray-300
                    font-medium
                  "
                >

                  {resumeRemaining}/{resumeLimit}

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
                      `${resumeUsagePercentage}%`,

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

                {resumeRemaining > 0

                  ? `${resumeUsed} used · ${resumeRemaining} remaining`

                  : 'Free resume review limit reached'}

              </p>

            </div>

          )}

        </div>


        {/* =============================================
            MAIN GRID START

            PART 2 CONTINUES DIRECTLY FROM HERE
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
                UPLOAD RESUME CARD
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

                    Upload Resume

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    Upload your PDF resume

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

                accept="application/pdf"

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
                  PDF PREVIEW

                  Same preview concept:
                  - Filename
                  - File size
                  - View Original PDF
              ======================================= */}

              {resumePreview && (

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

                      Resume Preview

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

                    <div
                      className="
                        flex
                        items-center
                        justify-center
                        gap-2
                        p-4
                      "
                    >

                      <FileText
                        className="
                          w-8
                          h-8
                          text-yellow-400
                          shrink-0
                        "
                      />


                      <div
                        className="
                          text-center
                          min-w-0
                        "
                      >

                        <p
                          className="
                            text-sm
                            text-white
                            font-medium
                            truncate
                          "
                        >

                          {input?.name}

                        </p>


                        <p
                          className="
                            text-xs
                            text-gray-400
                          "
                        >

                          {input?.size
                            ? (
                                input.size /
                                1024 /
                                1024
                              ).toFixed(2)
                            : '0.00'} MB • PDF Document

                        </p>

                      </div>

                    </div>


                    {/* =================================
                        VIEW ORIGINAL PDF
                    ================================= */}

                    <a

                      href={
                        resumePreview
                      }

                      target="_blank"

                      rel="noopener noreferrer"

                      className="
                        w-full
                        flex
                        items-center
                        justify-center
                        gap-2

                        bg-yellow-500/10
                        border
                        border-yellow-500/30
                        text-yellow-400

                        py-2
                        rounded-lg

                        hover:bg-yellow-500/20

                        transition-all
                        text-xs
                        mt-2
                      "
                    >

                      <Eye
                        className="
                          w-3
                          h-3
                        "
                      />

                      View Original PDF

                    </a>

                  </div>

                </div>

              )}


              {/* =======================================
                  FILE FORMAT INFO
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

                  Supports PDF format only

                </p>


                {/* =====================================
                    CREDIT INFO
                ===================================== */}

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
                        resumeRemaining > 0

                          ? 'text-gray-400'

                          : 'text-red-400'
                      }
                    `}
                  >

                    {resumeRemaining}/{resumeLimit} uses left

                  </span>

                )}

              </div>

            </div>


            {/* =========================================
                FREE LIMIT REACHED WARNING

                Only visible when:

                plan = FREE
                AND
                resumeRemaining = 0
            ========================================= */}

            {!isPro &&
              resumeRemaining <= 0 && (

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

                        Free resume review limit reached

                      </p>


                      <p
                        className="
                          text-xs
                          text-gray-400
                          mt-1
                          leading-relaxed
                        "
                      >

                        You've used all {resumeLimit} free
                        Resume Review credits. Upgrade to
                        Genviq Pro to continue analyzing
                        resumes.

                      </p>

                    </div>

                  </div>

                </div>

              )}


            {/* =========================================
                ANALYZE RESUME BUTTON

                FREE WITH CREDITS:

                Analyze Resume (5/5)

                After successful analysis:

                Analyze Resume (4/5)

                FREE AT ZERO:

                Free Limit Reached

                PRO:

                Analyze Resume
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
                  resumeRemaining <= 0
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

                  Analyzing Resume...

                </>

              ) : (

                /* =====================================
                   FREE LIMIT EXHAUSTED
                ===================================== */

                !isPro &&
                resumeRemaining <= 0

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
                   NORMAL ANALYZE BUTTON
                ===================================== */

                <>

                  <FileText
                    className="
                      w-4
                      h-4
                    "
                  />

                  Analyze Resume


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

                      ({resumeRemaining}/{resumeLimit})

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

                This is important:

                Selecting/uploading a PDF does NOT
                consume a credit.

                Failed analysis does NOT consume one.

                Only a successful backend operation
                should increment:

                resume_analysis_used
            ========================================= */}

            {!isPro &&
              resumeRemaining > 0 && (

                <p
                  className="
                    text-center
                    text-[10px]
                    text-gray-500
                  "
                >

                  1 credit is used only after a resume
                  is analyzed successfully.

                </p>

              )}

          </div>


          {/* ===========================================
              RIGHT PANEL
              ANALYSIS RESULTS
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
                RESULTS HEADER
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
                    from-blue-400
                    to-cyan-500
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

                    Analysis Results

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    Detailed resume feedback

                  </p>

                </div>

              </div>


              {/* =======================================
                  CURRENT STATUS

                  Appears after successful analysis.
              ======================================= */}

              {content &&
                !loading && (

                  <div
                    className="
                      hidden
                      sm:flex
                      items-center
                      gap-1.5
                      px-2.5
                      py-1.5
                      rounded-full
                      bg-green-500/10
                      border
                      border-green-500/20
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

                    Analyzed

                  </div>

                )}

            </div>


            {/* =========================================
                PART 3 CONTINUES HERE

                NEXT:

                - Loading animation
                - Empty "No Analysis Yet" state
                - Markdown analysis result
                - Current 4/5 usage display
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

                  {/* ===================================
                      LOADING ICON
                  =================================== */}

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

                      <FileText
                        className="
                          w-6
                          h-6
                          text-yellow-400
                          animate-pulse
                        "
                      />

                    </div>

                  </div>


                  {/* ===================================
                      LOADING TEXT
                  =================================== */}

                  <h3
                    className="
                      text-lg
                      font-semibold
                      text-white
                      mb-2
                    "
                  >

                    Analyzing Your Resume

                  </h3>


                  <p
                    className="
                      text-sm
                      text-gray-400
                      mb-5
                      max-w-sm
                      leading-relaxed
                    "
                  >

                    We are reviewing your resume,
                    identifying strengths, weaknesses,
                    and opportunities for improvement.

                  </p>


                  {/* ===================================
                      PROGRESS BAR
                  =================================== */}

                  <div
                    className="
                      w-48
                      bg-gray-700
                      rounded-full
                      h-1.5
                      mb-4
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


                  {/* ===================================
                      ANALYSIS STEPS
                  =================================== */}

                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      justify-center
                      gap-3
                      text-xs
                      text-gray-400
                    "
                  >

                    {/* READING */}

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

                        Reading

                      </span>

                    </div>


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
                          bg-amber-400
                          rounded-full
                          animate-bounce
                          mx-auto
                          mb-1
                          delay-100
                        "
                      />

                      <span>

                        Analyzing

                      </span>

                    </div>


                    {/* GENERATING */}

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

                        Generating

                      </span>

                    </div>

                  </div>


                  {/* ===================================
                      CREDIT INFORMATION WHILE LOADING

                      We do NOT reduce the frontend
                      counter here.

                      Counter changes only after
                      successful backend response.
                  =================================== */}

                  {!isPro && (

                    <p
                      className="
                        text-[10px]
                        text-gray-500
                        mt-6
                      "
                    >

                      Your credit will be counted only
                      after successful analysis.

                    </p>

                  )}

                </div>

              ) : content ? (

                /* =====================================
                   SUCCESSFUL ANALYSIS RESULT
                ===================================== */

                <div
                  className="
                    p-4
                  "
                >

                  {/* ===================================
                      SUCCESS HEADER
                  =================================== */}

                  <div
                    className="
                      flex
                      flex-col
                      sm:flex-row
                      sm:items-center
                      justify-between
                      gap-3
                      mb-4
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

                          Resume analyzed successfully

                        </p>


                        <p
                          className="
                            text-[10px]
                            text-gray-500
                            mt-0.5
                          "
                        >

                          AI-powered professional feedback

                        </p>

                      </div>

                    </div>


                    {/* =================================
                        CURRENT PLAN / REMAINING CREDITS
                    ================================= */}

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

                        {resumeRemaining}/{resumeLimit} left

                      </div>

                    )}

                  </div>


                  {/* ===================================
                      ANALYSIS CONTENT
                  =================================== */}

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
                        text-white
                      "
                    >

                      <Markdown

                        components={{

                          /* ===========================
                             H1
                          =========================== */

                          h1: ({
                            node,
                            ...props
                          }) => (

                            <h1
                              className="
                                text-white
                                text-lg
                                font-bold
                                mb-3
                              "
                              {...props}
                            />

                          ),


                          /* ===========================
                             H2
                          =========================== */

                          h2: ({
                            node,
                            ...props
                          }) => (

                            <h2
                              className="
                                text-white
                                text-base
                                font-bold
                                mb-2
                                mt-5
                              "
                              {...props}
                            />

                          ),


                          /* ===========================
                             H3
                          =========================== */

                          h3: ({
                            node,
                            ...props
                          }) => (

                            <h3
                              className="
                                text-white
                                text-sm
                                font-bold
                                mb-2
                                mt-4
                              "
                              {...props}
                            />

                          ),


                          /* ===========================
                             PARAGRAPH
                          =========================== */

                          p: ({
                            node,
                            ...props
                          }) => (

                            <p
                              className="
                                text-white
                                mb-3
                                leading-relaxed
                                text-sm
                              "
                              {...props}
                            />

                          ),


                          /* ===========================
                             LIST ITEM
                          =========================== */

                          li: ({
                            node,
                            ...props
                          }) => (

                            <li
                              className="
                                text-white
                                mb-2
                                text-sm
                                leading-relaxed
                              "
                              {...props}
                            />

                          ),


                          /* ===========================
                             STRONG
                          =========================== */

                          strong: ({
                            node,
                            ...props
                          }) => (

                            <strong
                              className="
                                text-yellow-300
                                font-bold
                              "
                              {...props}
                            />

                          ),


                          /* ===========================
                             ITALIC
                          =========================== */

                          em: ({
                            node,
                            ...props
                          }) => (

                            <em
                              className="
                                text-amber-300
                                italic
                              "
                              {...props}
                            />

                          ),


                          /* ===========================
                             UNORDERED LIST
                          =========================== */

                          ul: ({
                            node,
                            ...props
                          }) => (

                            <ul
                              className="
                                list-disc
                                list-inside
                                space-y-1
                                mb-4
                              "
                              {...props}
                            />

                          ),


                          /* ===========================
                             ORDERED LIST
                          =========================== */

                          ol: ({
                            node,
                            ...props
                          }) => (

                            <ol
                              className="
                                list-decimal
                                list-inside
                                space-y-1
                                mb-4
                              "
                              {...props}
                            />

                          ),


                          /* ===========================
                             BLOCKQUOTE
                          =========================== */

                          blockquote: ({
                            node,
                            ...props
                          }) => (

                            <blockquote
                              className="
                                border-l-4
                                border-yellow-500
                                bg-yellow-500/5
                                px-4
                                py-3
                                my-4
                                text-gray-300
                                italic
                                rounded-r-lg
                              "
                              {...props}
                            />

                          ),

                        }}

                      >

                        {content}

                      </Markdown>

                    </div>

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
                    py-12
                    px-6
                    text-center
                  "
                >

                  {/* ===================================
                      EMPTY ICON
                  =================================== */}

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

                    <FileText
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

                    No Analysis Yet

                  </h3>


                  <p
                    className="
                      text-xs
                      text-gray-400
                      text-center
                      max-w-xs
                      leading-relaxed
                    "
                  >

                    Upload your resume and click
                    "Analyze Resume" to get detailed
                    feedback.

                  </p>


                  {/* ===================================
                      PLAN / USAGE INFO
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

                          Unlimited resume reviews

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

                          {resumeRemaining}/{resumeLimit}
                          {' '}free resume reviews left

                        </span>

                      </>

                    )}

                  </div>


                  {/* ===================================
                      ZERO CREDIT MESSAGE
                  =================================== */}

                  {!isPro &&
                    resumeRemaining <= 0 && (

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

                AI-generated feedback should be reviewed
                before making final resume changes.

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

                    Analysis complete

                  </div>

                )}

            </div>

          </div>

        </div>


        {/* =============================================
            MAIN GRID ENDS ABOVE

            PART 4 CONTINUES HERE WITH:

            - Current Plan card
            - Resume Usage card
            - File Status card
            - Free plan information
            - Pro plan information
            - Final closing tags
            - export default ReviewResume
        ============================================= */}
                {/* =============================================
            RESUME TOOL INFORMATION
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
              RESUME REVIEW USAGE
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

                  Resume Usage

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

                    {resumeRemaining}/{resumeLimit} Remaining

                  </p>

                )}

              </div>

            </div>

          </div>


          {/* ===========================================
              FILE STATUS
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

                {input ? (

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

                  Resume Status

                </p>


                <p
                  className="
                    text-sm
                    font-semibold
                    text-white
                    mt-0.5
                    truncate
                  "
                >

                  {input
                    ? 'PDF Ready'
                    : 'No File Selected'}

                </p>


                {input && (

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

            Only visible for FREE users.
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

                    Free Resume Review

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
                    {resumeLimit} Resume Review analyses.

                    {' '}

                    A credit is counted only after a
                    resume is analyzed successfully.

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
                        resumeRemaining > 0
                          ? 'text-white'
                          : 'text-red-400'
                      }
                    `}
                  >

                    {resumeRemaining}/{resumeLimit}

                  </span>

                </div>


                {/* =====================================
                    USAGE PROGRESS BAR

                    5/5 = 100%
                    4/5 = 80%
                    ...
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
                        `${resumeUsagePercentage}%`,

                    }}
                  />

                </div>

              </div>

            </div>

          </div>

        )}


        {/* =============================================
            PRO PLAN INFORMATION

            Visible when Neon says:

            plan = "pro"

            Clerk Billing is NOT involved.
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
                  Resume Review without the free
                  5-analysis limit.

                </p>

              </div>

            </div>

          </div>

        )}


        {/* =============================================
            QUOTA ARCHITECTURE

            FRONTEND:

            UsageContext
                  ↓
            usage.resumeReview
                  ↓
            5/5 → 4/5 → 3/5 → 2/5 → 1/5 → 0/5


            BACKEND:

            POST /api/ai/resume-review
                  ↓
            Check authentication
                  ↓
            Read plan from Neon
                  ↓
            If FREE:
            Check resume_analysis_used < 5
                  ↓
            Analyze resume successfully
                  ↓
            Increment resume_analysis_used
                  ↓
            Return:

            usage: {
              used: 1,
              remaining: 4,
              limit: 5
            }


            IMPORTANT:

            Uploading/selecting a PDF:
            NO CREDIT USED

            Failed PDF extraction:
            NO CREDIT USED

            Failed AI analysis:
            NO CREDIT USED

            Successful analysis:
            1 CREDIT USED


            PRO:

            Quota bypassed.
        ============================================= */}

      </div>

    </div>

  );

};


/* =====================================================
   EXPORT
===================================================== */

export default ReviewResume;