import React, {
  useEffect,
  useState,
} from "react";

import {
  Gem,
  Sparkles,
  Crown,
  MessageSquare,
  Edit3,
  Heading,
  Image,
  Scan,
  Eraser,
  FileText,
} from "lucide-react";

import {
  useUser,
  useAuth,
} from "@clerk/clerk-react";

import CreationItem from "../components/CreationItem";

import {
  useUsage,
} from "../context/UsageContext.jsx";

import axios from "axios";
import toast from "react-hot-toast";

import {
  useNavigate,
} from "react-router-dom";

axios.defaults.baseURL =
  import.meta.env.VITE_BASE_URL;

/* =====================================================
   AI TOOL USAGE CONFIG

   Context keys must match UsageContext.jsx exactly.
===================================================== */

const usageTools = [
  {
    key: "article",
    label: "Article Writing",
    icon: Edit3,
    route: "/ai/write-article",
  },

  {
    key: "blogTitle",
    label: "Blog Titles",
    icon: Heading,
    route: "/ai/blog-titles",
  },

  {
    key: "image",
    label: "Image Generation",
    icon: Image,
    route: "/ai/generate-images",
  },

  {
    key: "backgroundRemoval",
    label: "Background Removal",
    icon: Scan,
    route: "/ai/remove-background",
  },

  {
    key: "objectRemoval",
    label: "Object Removal",
    icon: Eraser,
    route: "/ai/remove-object",
  },

  {
    key: "resumeReview",
    label: "Resume Analyzer",
    icon: FileText,
    route: "/ai/review-resume",
  },
];

const Dashboard = () => {

  /* =================================================
     STATE
  ================================================= */

  const [
    creations,
    setCreations,
  ] = useState([]);

  const [
    loadingCreations,
    setLoadingCreations,
  ] = useState(false);

  /* =================================================
     CLERK

     Authentication + user identity ONLY.

     Clerk Billing is no longer used.
  ================================================= */

  const {
    getToken,
  } = useAuth();

  const {
    user,
  } = useUser();

  /* =================================================
     NEON PLAN + USAGE

     Source:

     Neon
       ↓
     GET /api/user/usage
       ↓
     UsageContext
       ↓
     Dashboard
  ================================================= */

  const {
    isPro,
    usage,
    loading: usageLoading,
  } = useUsage();

  /* =================================================
     ROUTER
  ================================================= */

  const navigate =
    useNavigate();

  /* =================================================
     GET DASHBOARD CREATIONS
  ================================================= */

  const getDashboardData =
    async () => {

      try {

        setLoadingCreations(
          true
        );

        const token =
          await getToken();

        const {
          data,
        } = await axios.get(
          "/api/user/get-user-creations",

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        if (data.success) {

          setCreations(
            data.creations
          );

        } else {

          toast.error(
            data.message
          );

        }

      } catch (error) {

        console.error(
          "Dashboard Error:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
          error.message ||
          "Failed to load dashboard."
        );

      } finally {

        setLoadingCreations(
          false
        );

      }
    };

  /* =================================================
     FEEDBACK
  ================================================= */

  const handleFeedbackClick =
    () => {

      navigate(
        "/feedback"
      );

    };

  /* =================================================
     LOAD DASHBOARD
  ================================================= */

  useEffect(() => {

    getDashboardData();

  }, []);

  /* =================================================
     TOTAL FREE CREDITS

     6 tools × 5 = 30 total initial credits.
  ================================================= */

  const totalLimit =
    usageTools.reduce(
      (
        total,
        tool
      ) => {

        return (
          total +
          Number(
            usage?.[
              tool.key
            ]?.limit ?? 5
          )
        );

      },
      0
    );

  const totalRemaining =
    usageTools.reduce(
      (
        total,
        tool
      ) => {

        return (
          total +
          Number(
            usage?.[
              tool.key
            ]?.remaining ?? 5
          )
        );

      },
      0
    );

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

      {/* =================================================
          HEADER
      ================================================= */}

      <div
        className="
          flex
          flex-col
          sm:flex-row
          justify-between
          items-start
          sm:items-center
          mb-6
          gap-4
        "
      >

        <div>

          <h1
            className="
              text-2xl
              font-bold
              bg-gradient-to-r
              from-white
              to-gray-300
              bg-clip-text
              text-transparent
            "
          >

            Welcome back
            {user?.firstName
              ? `, ${user.firstName}`
              : ""}
            !

          </h1>

          <p
            className="
              text-sm
              text-gray-400
              mt-1
            "
          >
            Here's your creative workspace
          </p>

        </div>

        {/* FEEDBACK */}

        <button
          onClick={
            handleFeedbackClick
          }

          className="
            flex
            items-center
            gap-2
            px-4
            py-2
            bg-gradient-to-r
            from-purple-500
            to-pink-500
            hover:from-purple-600
            hover:to-pink-600
            text-white
            font-semibold
            rounded-lg
            transition-all
            shadow-lg
            shadow-purple-500/20
            hover:shadow-purple-500/30
          "
        >

          <MessageSquare
            className="
              w-4
              h-4
            "
          />

          Send Feedback

        </button>

      </div>

      {/* =================================================
          TOP STATS
      ================================================= */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-3
          gap-4
          mb-6
        "
      >

        {/* =================================================
            TOTAL CREATIONS
        ================================================= */}

        <div
          className="
            flex
            justify-between
            items-center
            p-4
            px-6
            bg-gradient-to-br
            from-gray-800
            to-gray-900
            rounded-xl
            border
            border-yellow-500/20
            shadow-lg
            shadow-yellow-500/10
          "
        >

          <div
            className="
              text-gray-300
            "
          >

            <p
              className="
                text-sm
              "
            >
              Total Creations:
            </p>

            <h2
              className="
                text-xl
                font-semibold
                text-white
              "
            >
              {creations.length}
            </h2>

          </div>

          <div
            className="
              w-10
              h-10
              rounded-lg
              bg-gradient-to-br
              from-yellow-400
              to-amber-500
              text-white
              flex
              justify-center
              items-center
              shadow-lg
              shadow-yellow-500/30
            "
          >

            <Sparkles
              className="
                w-5
                text-white
                drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]
              "
            />

          </div>

        </div>

        {/* =================================================
            ACTIVE PLAN

            NOW FROM NEON — NOT CLERK BILLING
        ================================================= */}

        <div
          className="
            flex
            justify-between
            items-center
            p-4
            px-6
            bg-gradient-to-br
            from-gray-800
            to-gray-900
            rounded-xl
            border
            border-yellow-500/20
            shadow-lg
            shadow-yellow-500/10
          "
        >

          <div
            className="
              text-gray-300
            "
          >

            <p
              className="
                text-sm
              "
            >
              Active Plan:
            </p>

            <h2
              className="
                text-xl
                font-semibold
              "
            >

              {usageLoading ? (

                <span
                  className="
                    text-gray-500
                  "
                >
                  Loading...
                </span>

              ) : isPro ? (

                <span
                  className="
                    text-yellow-300
                  "
                >
                  Genviq Pro
                </span>

              ) : (

                <span
                  className="
                    text-gray-300
                  "
                >
                  Free
                </span>

              )}

            </h2>

          </div>

          <div
            className="
              w-10
              h-10
              rounded-lg
              bg-gradient-to-br
              from-yellow-500
              to-amber-600
              flex
              justify-center
              items-center
              shadow-lg
              shadow-yellow-500/30
            "
          >

            {isPro ? (

              <Crown
                className="
                  w-5
                  text-white
                  fill-yellow-300
                  drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]
                "
              />

            ) : (

              <Gem
                className="
                  w-5
                  text-gray-200
                "
              />

            )}

          </div>

        </div>

        {/* =================================================
            AVAILABLE AI CREDITS
        ================================================= */}

        <div
          className="
            flex
            justify-between
            items-center
            p-4
            px-6
            bg-gradient-to-br
            from-gray-800
            to-gray-900
            rounded-xl
            border
            border-purple-500/20
            shadow-lg
            shadow-purple-500/10
          "
        >

          <div>

            <p
              className="
                text-sm
                text-gray-300
              "
            >
              AI Credits:
            </p>

            <h2
              className="
                text-xl
                font-semibold
                text-white
              "
            >

              {usageLoading
                ? "..."
                : isPro
                  ? "Unlimited"
                  : `${totalRemaining}/${totalLimit}`}

            </h2>

          </div>

          <div
            className="
              w-10
              h-10
              rounded-lg
              bg-gradient-to-br
              from-purple-500
              to-pink-500
              flex
              justify-center
              items-center
              shadow-lg
              shadow-purple-500/30
            "
          >

            <Sparkles
              className="
                w-5
                text-white
              "
            />

          </div>

        </div>

      </div>

      {/* =================================================
          FREE USAGE / TOOL CREDITS
      ================================================= */}

      <div
        className="
          mb-8
          bg-gradient-to-br
          from-gray-800/80
          to-gray-900
          border
          border-gray-700/50
          rounded-2xl
          p-5
          shadow-xl
        "
      >

        <div
          className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
            justify-between
            gap-2
            mb-5
          "
        >

          <div>

            <h2
              className="
                text-lg
                font-semibold
                text-white
                flex
                items-center
                gap-2
              "
            >

              <Sparkles
                className="
                  w-5
                  h-5
                  text-purple-400
                "
              />

              AI Tool Usage

            </h2>

            <p
              className="
                text-xs
                text-gray-400
                mt-1
              "
            >

              {isPro
                ? "Your Genviq Pro plan includes full AI tool access."
                : "Each AI tool includes 5 free uses."}

            </p>

          </div>

          {!usageLoading &&
            !isPro && (

              <div
                className="
                  text-sm
                  text-gray-300
                  bg-black/30
                  border
                  border-gray-700
                  rounded-lg
                  px-3
                  py-2
                "
              >

                <span
                  className="
                    text-white
                    font-semibold
                  "
                >
                  {totalRemaining}
                </span>

                {" / "}

                {totalLimit}

                {" total remaining"}

              </div>

            )}

        </div>

        {/* =================================================
            SIX INDEPENDENT TOOL COUNTERS
        ================================================= */}

        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            xl:grid-cols-3
            gap-3
          "
        >

          {usageTools.map(
            ({
              key,
              label,
              icon: Icon,
              route,
            }) => {

              const featureUsage =
                usage?.[key];

              const remaining =
                Number(
                  featureUsage
                    ?.remaining ?? 5
                );

              const limit =
                Number(
                  featureUsage
                    ?.limit ?? 5
                );

              const percentage =
                limit > 0
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        (
                          remaining /
                          limit
                        ) * 100
                      )
                    )
                  : 0;

              const exhausted =
                !isPro &&
                remaining <= 0;

              return (

                <button
                  key={key}

                  onClick={() =>
                    navigate(route)
                  }

                  className="
                    text-left
                    bg-black/25
                    hover:bg-black/40
                    border
                    border-gray-700/60
                    hover:border-purple-500/40
                    rounded-xl
                    p-4
                    transition-all
                    group
                  "
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
                        min-w-0
                      "
                    >

                      <div
                        className="
                          w-9
                          h-9
                          shrink-0
                          rounded-lg
                          bg-gray-800
                          group-hover:bg-purple-500/20
                          flex
                          items-center
                          justify-center
                          transition-all
                        "
                      >

                        <Icon
                          className="
                            w-4
                            h-4
                            text-gray-300
                            group-hover:text-purple-300
                          "
                        />

                      </div>

                      <div
                        className="
                          min-w-0
                        "
                      >

                        <p
                          className="
                            text-sm
                            font-medium
                            text-gray-200
                            truncate
                          "
                        >
                          {label}
                        </p>

                        {!isPro &&
                          exhausted && (

                            <p
                              className="
                                text-[10px]
                                text-red-400
                                mt-0.5
                              "
                            >
                              Free limit reached
                            </p>

                          )}

                      </div>

                    </div>

                    <div
                      className="
                        shrink-0
                        text-right
                      "
                    >

                      {usageLoading ? (

                        <span
                          className="
                            text-sm
                            text-gray-500
                          "
                        >
                          ...
                        </span>

                      ) : isPro ? (

                        <span
                          className="
                            text-xs
                            font-semibold
                            text-yellow-300
                            flex
                            items-center
                            gap-1
                          "
                        >

                          <Crown
                            className="
                              w-3
                              h-3
                            "
                          />

                          Unlimited

                        </span>

                      ) : (

                        <span
                          className={`
                            text-base
                            font-bold

                            ${
                              exhausted
                                ? "text-red-400"
                                : "text-white"
                            }
                          `}
                        >
                          {remaining}/{limit}
                        </span>

                      )}

                    </div>

                  </div>

                  {/* USAGE BAR */}

                  {!isPro && (

                    <div
                      className="
                        mt-3
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
                          from-purple-500
                          to-pink-500
                          rounded-full
                          transition-all
                          duration-500
                        "

                        style={{
                          width:
                            usageLoading
                              ? "0%"
                              : `${percentage}%`,
                        }}
                      />

                    </div>

                  )}

                </button>

              );

            }
          )}

        </div>

      </div>

      {/* =================================================
          RECENT CREATIONS
      ================================================= */}

      {!loadingCreations ? (

        <div
          className="
            space-y-3
            mt-6
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
            "
          >

            <p
              className="
                text-xl
                font-semibold
                text-yellow-100
                mb-4
                flex
                items-center
                gap-2
              "
            >

              <Sparkles
                className="
                  w-5
                  h-5
                  text-yellow-400
                "
              />

              Recent Creations

            </p>

            {/* MOBILE FEEDBACK */}

            <button
              onClick={
                handleFeedbackClick
              }

              className="
                sm:hidden
                flex
                items-center
                gap-2
                px-3
                py-2
                bg-gradient-to-r
                from-purple-500
                to-pink-500
                hover:from-purple-600
                hover:to-pink-600
                text-white
                font-semibold
                rounded-lg
                transition-all
                text-sm
              "
            >

              <MessageSquare
                className="
                  w-4
                  h-4
                "
              />

              Feedback

            </button>

          </div>

          {/* =================================================
              CREATIONS LIST
          ================================================= */}

          {creations.length > 0 ? (

            creations.map(
              (item) => (

                <CreationItem
                  item={item}
                  key={item.id}
                />

              )
            )

          ) : (

            /* =================================================
               EMPTY STATE
            ================================================= */

            <div
              className="
                flex
                flex-col
                items-center
                justify-center
                py-12
                text-gray-400
              "
            >

              <Sparkles
                className="
                  w-16
                  h-16
                  mb-4
                  text-gray-600
                "
              />

              <p
                className="
                  text-lg
                "
              >
                No creations yet
              </p>

              <p
                className="
                  text-sm
                  mt-2
                  text-center
                  max-w-md
                "
              >

                Start creating amazing content
                with our AI tools! Your creations
                will appear here.

              </p>

              <button
                onClick={
                  handleFeedbackClick
                }

                className="
                  mt-4
                  flex
                  items-center
                  gap-2
                  px-4
                  py-2
                  bg-gradient-to-r
                  from-purple-500
                  to-pink-500
                  hover:from-purple-600
                  hover:to-pink-600
                  text-white
                  font-semibold
                  rounded-lg
                  transition-all
                "
              >

                <MessageSquare
                  className="
                    w-4
                    h-4
                  "
                />

                Share Your Thoughts

              </button>

            </div>

          )}

        </div>

      ) : (

        /* =================================================
           LOADING
        ================================================= */

        <div
          className="
            flex
            justify-center
            items-center
            h-48
          "
        >

          <div
            className="
              relative
            "
          >

            <div
              className="
                w-12
                h-12
                rounded-full
                border-2
                border-yellow-500/30
                animate-spin
              "
            />

            <div
              className="
                absolute
                inset-0
                w-12
                h-12
                rounded-full
                border-2
                border-t-yellow-400
                border-transparent
                animate-spin
              "
            />

          </div>

        </div>

      )}

    </div>

  );
};

export default Dashboard;