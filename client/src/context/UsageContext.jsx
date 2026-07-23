import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';

/* =====================================================
   AXIOS BASE URL

   Uses the same backend URL as the rest of Genviq.

   Example:
   VITE_BASE_URL=http://localhost:3000
===================================================== */

axios.defaults.baseURL =
  import.meta.env.VITE_BASE_URL;

/* =====================================================
   DEFAULT FREE USAGE

   This is the initial UI shape.

   Actual values are fetched from Neon through:

   GET /api/user/usage
===================================================== */

const DEFAULT_USAGE = {
  article: {
    used: 0,
    remaining: 5,
    limit: 5,
  },

  blogTitle: {
    used: 0,
    remaining: 5,
    limit: 5,
  },

  image: {
    used: 0,
    remaining: 5,
    limit: 5,
  },

  backgroundRemoval: {
    used: 0,
    remaining: 5,
    limit: 5,
  },

  objectRemoval: {
    used: 0,
    remaining: 5,
    limit: 5,
  },

  resumeReview: {
    used: 0,
    remaining: 5,
    limit: 5,
  },
};

/* =====================================================
   CREATE CONTEXT
===================================================== */

const UsageContext =
  createContext(null);

/* =====================================================
   USAGE PROVIDER
===================================================== */

export const UsageProvider = ({
  children,
}) => {
  const {
    getToken,
    isLoaded,
    isSignedIn,
  } = useAuth();

  /* =================================================
     STATE
  ================================================= */

  const [plan, setPlan] =
    useState('free');

  const [
    subscriptionStatus,
    setSubscriptionStatus,
  ] = useState('inactive');

  const [usage, setUsage] =
    useState(DEFAULT_USAGE);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  /* =================================================
     RESET USAGE

     Used when:
     - User signs out
     - No authenticated user exists
  ================================================= */

  const resetUsage =
    useCallback(() => {
      setPlan('free');

      setSubscriptionStatus(
        'inactive'
      );

      setUsage(DEFAULT_USAGE);

      setError(null);
    }, []);

  /* =================================================
     FETCH PLAN + USAGE FROM BACKEND

     Backend route:

     GET /api/user/usage

     Expected response:

     {
       success: true,

       plan: "free",

       subscriptionStatus: "inactive",

       usage: {
         article: {...},
         blogTitle: {...},
         image: {...},
         backgroundRemoval: {...},
         objectRemoval: {...},
         resumeReview: {...}
       }
     }
  ================================================= */

  const fetchUsage =
    useCallback(async () => {
      /*
        Wait until Clerk has finished loading.
      */

      if (!isLoaded) {
        return;
      }

      /*
        If user is logged out,
        reset everything.
      */

      if (!isSignedIn) {
        resetUsage();

        setLoading(false);

        return;
      }

      try {
        setLoading(true);

        setError(null);

        /* ===========================================
           GET CLERK AUTH TOKEN
        =========================================== */

        const token =
          await getToken();

        if (!token) {
          throw new Error(
            'Unable to get authentication token.'
          );
        }

        /* ===========================================
           CALL GENVIQ BACKEND
        =========================================== */

        const { data } =
          await axios.get(
            '/api/user/usage',

            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        /* ===========================================
           VALIDATE RESPONSE
        =========================================== */

        if (!data?.success) {
          throw new Error(
            data?.message ||
              'Unable to load usage information.'
          );
        }

        /* ===========================================
           UPDATE PLAN

           Neon is now the source of truth.

           NOT Clerk Billing.
        =========================================== */

        setPlan(
          data.plan === 'pro'
            ? 'pro'
            : 'free'
        );

        /* ===========================================
           UPDATE SUBSCRIPTION STATUS
        =========================================== */

        setSubscriptionStatus(
          data.subscriptionStatus ||
            'inactive'
        );

        /* ===========================================
           UPDATE ALL SIX COUNTERS
        =========================================== */

        if (data.usage) {
          setUsage((previous) => ({
            ...previous,

            ...data.usage,
          }));
        }

        console.log(
          '📊 Genviq usage loaded:',
          data
        );

      } catch (error) {
        console.error(
          '❌ Failed to load Genviq usage:',
          error
        );

        const message =
          error?.response?.data
            ?.message ||
          error?.message ||
          'Unable to load usage information.';

        setError(message);

      } finally {
        setLoading(false);
      }
    }, [
      getToken,
      isLoaded,
      isSignedIn,
      resetUsage,
    ]);

  /* =================================================
     LOAD USAGE AFTER LOGIN

     When Clerk finishes loading and user is signed in:

     Clerk
       ↓
     getToken()
       ↓
     GET /api/user/usage
       ↓
     Neon
       ↓
     Context updated
  ================================================= */

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  /* =================================================
     UPDATE ONE FEATURE LOCALLY

     After a successful AI request, the backend returns:

     usage: {
       used: 1,
       remaining: 4,
       limit: 5
     }

     Instead of fetching everything again, the tool page
     can immediately update only its own counter.

     Example:

     updateFeatureUsage(
       'blogTitle',
       data.usage
     );

     5/5 → 4/5 instantly.
  ================================================= */

  const updateFeatureUsage =
    useCallback(
      (
        feature,
        newUsage
      ) => {
        if (
          !feature ||
          !newUsage
        ) {
          return;
        }

        /*
          Pro responses may contain:

          {
            unlimited: true
          }

          In that case there is no free counter
          to update.
        */

        if (
          newUsage.unlimited
        ) {
          return;
        }

        setUsage(
          (previous) => ({
            ...previous,

            [feature]: {
              ...previous[
                feature
              ],

              ...newUsage,
            },
          })
        );
      },
      []
    );

  /* =================================================
     CHECK WHETHER USER IS PRO

     Usage:

     if (isPro) {
       // unlimited
     }
  ================================================= */

  const isPro =
    plan === 'pro';

  /* =================================================
     CHECK IF A FEATURE HAS CREDITS

     Example:

     hasCredits('blogTitle')

     FREE:
       remaining > 0 → true
       remaining = 0 → false

     PRO:
       always true
  ================================================= */

  const hasCredits =
    useCallback(
      (feature) => {
        if (isPro) {
          return true;
        }

        const featureUsage =
          usage?.[feature];

        if (!featureUsage) {
          return false;
        }

        return (
          Number(
            featureUsage.remaining
          ) > 0
        );
      },
      [
        isPro,
        usage,
      ]
    );

  /* =================================================
     GET REMAINING CREDITS

     Example:

     getRemaining('blogTitle')

     returns:

     5
     4
     3
     ...
  ================================================= */

  const getRemaining =
    useCallback(
      (feature) => {
        if (isPro) {
          return Infinity;
        }

        return Number(
          usage?.[feature]
            ?.remaining ?? 0
        );
      },
      [
        isPro,
        usage,
      ]
    );

  /* =================================================
     GET FEATURE LIMIT

     Currently all FREE tools = 5.
  ================================================= */

  const getLimit =
    useCallback(
      (feature) => {
        return Number(
          usage?.[feature]
            ?.limit ?? 5
        );
      },
      [usage]
    );

  /* =================================================
     CONTEXT VALUE
  ================================================= */

  const value =
    useMemo(
      () => ({
        /* PLAN */

        plan,

        isPro,

        subscriptionStatus,

        /* USAGE */

        usage,

        /* STATUS */

        loading,

        error,

        /* ACTIONS */

        fetchUsage,

        refreshUsage:
          fetchUsage,

        updateFeatureUsage,

        resetUsage,

        /* HELPERS */

        hasCredits,

        getRemaining,

        getLimit,
      }),

      [
        plan,
        isPro,
        subscriptionStatus,
        usage,
        loading,
        error,
        fetchUsage,
        updateFeatureUsage,
        resetUsage,
        hasCredits,
        getRemaining,
        getLimit,
      ]
    );

  /* =================================================
     PROVIDER
  ================================================= */

  return (
    <UsageContext.Provider
      value={value}
    >
      {children}
    </UsageContext.Provider>
  );
};

/* =====================================================
   CUSTOM HOOK

   Any Genviq component can now do:

   const {
     plan,
     isPro,
     usage
   } = useUsage();

   Example:

   usage.blogTitle.remaining
===================================================== */

export const useUsage = () => {
  const context =
    useContext(
      UsageContext
    );

  if (!context) {
    throw new Error(
      'useUsage must be used inside UsageProvider.'
    );
  }

  return context;
};

export default UsageContext;