import React from 'react';

import {
  useClerk,
  useUser,
} from '@clerk/clerk-react';

import {
  LogOut,
  Crown,
  Zap,
  LayoutDashboard,
  Edit3,
  Heading,
  Image,
  Scan,
  Eraser,
  FileText,
  Users,
} from 'lucide-react';

import {
  NavLink,
} from 'react-router-dom';

import {
  useUsage,
} from '../context/UsageContext.jsx';

/* =====================================================
   SIDEBAR NAVIGATION
===================================================== */

const navItems = [
  {
    to: '/ai',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },

  {
    to: '/ai/write-article',
    label: 'Write Article',
    icon: Edit3,
  },

  {
    to: '/ai/blog-titles',
    label: 'Blog Titles',
    icon: Heading,
  },

  {
    to: '/ai/generate-images',
    label: 'Generate Images',
    icon: Image,
  },

  {
    to: '/ai/remove-background',
    label: 'Remove Background',
    icon: Scan,
  },

  {
    to: '/ai/remove-object',
    label: 'Remove Object',
    icon: Eraser,
  },

  {
    to: '/ai/review-resume',
    label: 'Review Resume',
    icon: FileText,
  },

  {
    to: '/ai/community',
    label: 'Community',
    icon: Users,
  },
];

/* =====================================================
   SIDEBAR
===================================================== */

const Sidebar = ({
  sidebar,
  setSidebar,
}) => {

  /* =================================================
     CLERK

     Clerk is ONLY used for:

     - User identity
     - Profile
     - Sign out

     NO Clerk Billing.
  ================================================= */

  const {
    user,
  } = useUser();

  const {
    signOut,
    openUserProfile,
  } = useClerk();

  /* =================================================
     GENVIQ PLAN + USAGE

     Comes from:

     Neon
       ↓
     GET /api/user/usage
       ↓
     UsageContext
  ================================================= */

  const {
    plan,
    isPro,
    usage,
    loading,
  } = useUsage();

  /* =================================================
     CALCULATE TOTAL FREE USAGE

     There are 6 tools.

     Each tool has 5 free uses.

     Total:
     6 × 5 = 30

     Example:

     Brand-new user:
     30 / 30 remaining

     After using one Blog Title:
     29 / 30 remaining
  ================================================= */

  const usageItems = [
    usage?.article,
    usage?.blogTitle,
    usage?.image,
    usage?.backgroundRemoval,
    usage?.objectRemoval,
    usage?.resumeReview,
  ];

  const totalLimit =
    usageItems.reduce(
      (total, item) =>
        total +
        Number(
          item?.limit ?? 5
        ),
      0
    );

  const totalRemaining =
    usageItems.reduce(
      (total, item) =>
        total +
        Number(
          item?.remaining ?? 5
        ),
      0
    );

  const usagePercentage =
    totalLimit > 0
      ? Math.max(
          0,
          Math.min(
            100,
            (
              totalRemaining /
              totalLimit
            ) * 100
          )
        )
      : 0;

  /* =================================================
     LOGOUT
  ================================================= */

  const handleSignOut =
    async () => {
      await signOut();
    };

  return (
    <div
      className={`
        w-60
        z-10
        bg-gradient-to-b
        from-gray-900
        via-black
        to-gray-900
        border-r
        border-purple-500/20
        flex
        flex-col
        max-sm:absolute
        top-0
        bottom-0

        ${
          sidebar
            ? 'translate-x-0'
            : 'max-sm:-translate-x-full'
        }

        transition-all
        duration-300
        shadow-2xl
        shadow-purple-500/10
      `}
    >

      {/* =================================================
          USER HEADER
      ================================================= */}

      <div
        className="
          p-4
          border-b
          border-purple-500/10
          bg-gradient-to-r
          from-gray-900
          to-black
        "
      >

        {user && (

          <div
            onClick={
              openUserProfile
            }

            className="
              group
              relative
              p-3
              rounded-xl
              bg-gray-800/30
              border
              border-gray-700/50
              cursor-pointer
              transition-all
              duration-300
              hover:border-purple-500/50
              hover:bg-gray-800/50
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              {/* USER AVATAR */}

              <div
                className="
                  relative
                "
              >

                <div
                  className="
                    absolute
                    -inset-1
                    bg-gradient-to-r
                    from-purple-600
                    to-pink-600
                    rounded-full
                    opacity-0
                    group-hover:opacity-30
                    blur
                    transition-opacity
                  "
                />

                <img
                  src={
                    user.imageUrl
                  }

                  alt="User"

                  className="
                    w-9
                    h-9
                    rounded-full
                    border-2
                    border-gray-600
                    group-hover:border-purple-400
                    transition-colors
                    relative
                  "
                />

              </div>

              {/* USER INFO */}

              <div
                className="
                  flex-1
                  min-w-0
                "
              >

                <p
                  className="
                    text-white
                    font-semibold
                    text-sm
                    truncate
                  "
                >
                  {user.fullName ||
                    user.firstName ||
                    'Genviq User'}
                </p>

                {/* =======================================
                    PLAN FROM NEON

                    NO <Protect plan="pro_user">
                ======================================= */}

                {loading ? (

                  <p
                    className="
                      text-gray-500
                      text-xs
                      mt-0.5
                    "
                  >
                    Loading plan...
                  </p>

                ) : isPro ? (

                  <p
                    className="
                      text-yellow-300
                      text-xs
                      flex
                      items-center
                      gap-1
                      mt-0.5
                    "
                  >

                    <Crown
                      className="
                        w-3
                        h-3
                        fill-yellow-300
                      "
                    />

                    Genviq Pro

                  </p>

                ) : (

                  <p
                    className="
                      text-gray-400
                      text-xs
                      flex
                      items-center
                      gap-1
                      mt-0.5
                    "
                  >

                    <Zap
                      className="
                        w-3
                        h-3
                      "
                    />

                    Free Plan

                  </p>

                )}

              </div>

            </div>

          </div>

        )}

      </div>

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <div
        className="
          flex-1
          py-4
          overflow-y-auto
        "
      >

        <div
          className="
            space-y-1
            px-3
          "
        >

          {navItems.map(
            ({
              to,
              label,
              icon: Icon,
            }) => (

              <NavLink
                key={to}

                to={to}

                end={
                  to === '/ai'
                }

                onClick={() =>
                  setSidebar(false)
                }

                className={({
                  isActive,
                }) =>

                  `
                    group
                    relative
                    flex
                    items-center
                    gap-3
                    px-3
                    py-2.5
                    rounded-lg
                    transition-all
                    duration-300
                    border

                    ${
                      isActive

                        ? `
                          bg-gradient-to-r
                          from-purple-500/20
                          to-blue-500/20
                          border-purple-500/40
                          shadow-lg
                          shadow-purple-500/20
                        `

                        : `
                          border-transparent
                          hover:border-purple-500/20
                          hover:bg-gray-800/30
                        `
                    }
                  `
                }
              >

                {({
                  isActive,
                }) => (

                  <>

                    {/* ICON */}

                    <div
                      className={`
                        w-8
                        h-8
                        flex
                        items-center
                        justify-center
                        rounded-lg
                        transition-all
                        duration-300

                        ${
                          isActive

                            ? `
                              bg-gradient-to-br
                              from-purple-500
                              to-blue-500
                              shadow-lg
                              shadow-purple-500/30
                            `

                            : `
                              bg-gray-800
                              group-hover:bg-gray-700
                            `
                        }
                      `}
                    >

                      <Icon
                        className={`
                          w-4
                          h-4
                          transition-all
                          duration-300

                          ${
                            isActive

                              ? 'text-white'

                              : `
                                text-gray-300
                                group-hover:text-white
                              `
                          }
                        `}
                      />

                    </div>

                    {/* LABEL */}

                    <span
                      className={`
                        font-medium
                        text-sm
                        transition-all
                        duration-300

                        ${
                          isActive

                            ? 'text-white'

                            : `
                              text-gray-300
                              group-hover:text-white
                            `
                        }
                      `}
                    >
                      {label}
                    </span>

                    {/* ACTIVE DOT */}

                    {isActive && (

                      <div
                        className="
                          ml-auto
                          w-1.5
                          h-1.5
                          bg-gradient-to-r
                          from-purple-400
                          to-blue-400
                          rounded-full
                          animate-pulse
                        "
                      />

                    )}

                  </>

                )}

              </NavLink>

            )
          )}

        </div>

      </div>

      {/* =================================================
          FOOTER
      ================================================= */}

      <div
        className="
          p-4
          border-t
          border-purple-500/10
          bg-gradient-to-r
          from-black
          to-gray-900
        "
      >

        <div
          className="
            bg-gray-800/20
            rounded-lg
            p-3
            border
            border-gray-700/30
          "
        >

          {/* =============================================
              STATUS + LOGOUT
          ============================================= */}

          <div
            className="
              flex
              items-center
              justify-between
              mb-2
            "
          >

            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              {user?.imageUrl && (

                <img
                  src={
                    user.imageUrl
                  }

                  alt="User"

                  className="
                    w-7
                    h-7
                    rounded-full
                    border
                    border-gray-600
                  "
                />

              )}

              <div>

                <p
                  className="
                    text-white
                    text-xs
                    font-medium
                  "
                >
                  Status
                </p>

                {loading ? (

                  <p
                    className="
                      text-gray-500
                      text-xs
                    "
                  >
                    Loading...
                  </p>

                ) : isPro ? (

                  <p
                    className="
                      text-green-400
                      text-xs
                    "
                  >
                    Full Access
                  </p>

                ) : (

                  <p
                    className="
                      text-gray-400
                      text-xs
                    "
                  >
                    Free Access
                  </p>

                )}

              </div>

            </div>

            {/* LOGOUT */}

            <button
              onClick={
                handleSignOut
              }

              title="Sign out"

              className="
                p-2
                text-gray-400
                hover:text-white
                hover:bg-red-500/10
                rounded-lg
                transition-all
                duration-300
                border
                border-gray-600
                hover:border-red-500/30
                group
              "
            >

              <LogOut
                className="
                  w-3.5
                  h-3.5
                  group-hover:scale-110
                  transition-transform
                "
              />

            </button>

          </div>

          {/* =============================================
              USAGE / AI POWER
          ============================================= */}

          <div
            className="
              space-y-1.5
            "
          >

            <div
              className="
                flex
                justify-between
                items-center
                text-xs
              "
            >

              <span
                className="
                  text-gray-400
                "
              >
                AI Power
              </span>

              {loading ? (

                <span
                  className="
                    text-gray-500
                  "
                >
                  ...
                </span>

              ) : isPro ? (

                <span
                  className="
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

                  MAX

                </span>

              ) : (

                <span
                  className="
                    text-gray-300
                  "
                >
                  {totalRemaining}/{totalLimit}
                </span>

              )}

            </div>

            {/* =============================================
                USAGE BAR

                FREE:
                Based on total remaining credits.

                New account:
                30/30 = 100%

                PRO:
                Always full.
            ============================================= */}

            <div
              className="
                w-full
                bg-gray-700
                rounded-full
                h-1
                overflow-hidden
              "
            >

              <div
                className={`
                  h-1
                  rounded-full
                  transition-all
                  duration-500

                  ${
                    isPro
                      ? `
                        bg-gradient-to-r
                        from-yellow-400
                        to-amber-500
                        shadow-lg
                        shadow-yellow-500/20
                      `
                      : `
                        bg-gradient-to-r
                        from-purple-500
                        to-blue-500
                      `
                  }
                `}

                style={{
                  width: loading
                    ? '0%'
                    : isPro
                      ? '100%'
                      : `${usagePercentage}%`,
                }}
              />

            </div>

            {/* FREE PLAN INFO */}

            {!loading &&
              !isPro && (

                <p
                  className="
                    text-[10px]
                    text-gray-500
                    leading-relaxed
                  "
                >
                  {totalRemaining}{' '}
                  free AI actions remaining
                </p>

              )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default Sidebar;