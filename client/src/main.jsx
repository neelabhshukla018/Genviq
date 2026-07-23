import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';

import './index.css';
import App from './App.jsx';

/* =====================================================
   GENVIQ USAGE PROVIDER

   Handles:
   - Neon Free / Pro plan
   - 5/5 usage counters
   - Shared usage across all AI tools
===================================================== */

import {
  UsageProvider
} from './context/UsageContext.jsx';

/* =====================================================
   CLERK CONFIGURATION

   Clerk is now used ONLY for:

   - Authentication
   - Login / Signup
   - User identity
   - User profile
   - Auth tokens

   Clerk Billing is NOT used.
===================================================== */

const PUBLISHABLE_KEY =
  import.meta.env
    .VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Clerk Publishable Key'
  );
}

/* =====================================================
   RENDER GENVIQ
===================================================== */

createRoot(
  document.getElementById('root')
).render(

  <StrictMode>

    <ClerkProvider
      publishableKey={
        PUBLISHABLE_KEY
      }

      afterSignOutUrl="/"
    >

      <BrowserRouter>

        {/* ============================================
            SHARED GENVIQ PLAN + USAGE STATE

            ClerkProvider MUST stay outside because
            UsageProvider uses Clerk's useAuth().
        ============================================ */}

        <UsageProvider>

          <App />

        </UsageProvider>

      </BrowserRouter>

    </ClerkProvider>

  </StrictMode>
);