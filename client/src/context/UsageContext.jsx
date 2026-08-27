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


axios.defaults.baseURL =
  import.meta.env.VITE_BASE_URL;

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


const UsageContext =
  createContext(null);


export const UsageProvider = ({
  children,
}) => {
  const {
    getToken,
    isLoaded,
    isSignedIn,
  } = useAuth();


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


  const resetUsage =
    useCallback(() => {
      setPlan('free');

      setSubscriptionStatus(
        'inactive'
      );

      setUsage(DEFAULT_USAGE);

      setError(null);
    }, []);


  const fetchUsage =
    useCallback(async () => {
 

      if (!isLoaded) {
        return;
      }

 
      if (!isSignedIn) {
        resetUsage();

        setLoading(false);

        return;
      }

      try {
        setLoading(true);

        setError(null);

        const token =
          await getToken();

        if (!token) {
          throw new Error(
            'Unable to get authentication token.'
          );
        }


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


        if (!data?.success) {
          throw new Error(
            data?.message ||
              'Unable to load usage information.'
          );
        }

        setPlan(
          data.plan === 'pro'
            ? 'pro'
            : 'free'
        );

        setSubscriptionStatus(
          data.subscriptionStatus ||
            'inactive'
        );


        if (data.usage) {
          setUsage((previous) => ({
            ...previous,

            ...data.usage,
          }));
        }

        console.log(
          'Tivion usage loaded:',
          data
        );

      } catch (error) {
        console.error(
          'Failed to load Tivion usage:',
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


  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

 
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

 
  const isPro =
    plan === 'pro';


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


  const value =
    useMemo(
      () => ({

        plan,

        isPro,

        subscriptionStatus,

        usage,

        loading,

        error,

        fetchUsage,

        refreshUsage:
          fetchUsage,

        updateFeatureUsage,

        resetUsage,

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


  return (
    <UsageContext.Provider
      value={value}
    >
      {children}
    </UsageContext.Provider>
  );
};

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

//some changes here and there

//what is your response