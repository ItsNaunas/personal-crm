'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { fetchDefaultOrg } from './api';

interface OrgContextValue {
  orgId: string;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDefaultOrg()
      .then((data) => {
        setOrgId(data.orgId);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : 'Failed to connect to the API. Is the backend running?';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm text-gray-400">Connecting to CRM…</p>
        </div>
      </div>
    );
  }

  if (error || !orgId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="max-w-md rounded-xl border border-red-800 bg-red-950 p-8 text-center shadow-xl">
          <div className="mb-4 text-4xl">⚠️</div>
          <h1 className="mb-2 text-xl font-semibold text-red-300">
            Cannot connect to CRM
          </h1>
          <p className="mb-4 text-sm text-red-400">
            {error ?? 'Unknown error loading organization.'}
          </p>
          <div className="rounded-md bg-red-900/40 p-3 text-left text-xs text-red-300">
            <p className="font-mono">1. Make sure the API is running on port 3000</p>
            <p className="font-mono">2. Set DEFAULT_ORG_ID in your .env file</p>
            <p className="font-mono">3. Restart both servers</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-red-700 px-5 py-2 text-sm text-white hover:bg-red-600 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <OrgContext.Provider value={{ orgId }}>{children}</OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrg must be used inside <OrgProvider>');
  }
  return ctx;
}
