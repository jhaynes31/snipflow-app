'use client'

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ReferralTracker() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useConvexAuth();
  const initUser = useMutation(api.users.initUser);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('snipflow_ref', ref);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      const referredByCode = localStorage.getItem('snipflow_ref') || undefined;
      initUser({ referredByCode }).then(() => {
        // Once initialized/applied, we can clear it if we want, 
        // but keeping it doesn't hurt as initUser handles the "already linked" case.
        if (referredByCode) {
           // localStorage.removeItem('snipflow_ref');
        }
      });
    }
  }, [isAuthenticated, initUser]);

  return null;
}
