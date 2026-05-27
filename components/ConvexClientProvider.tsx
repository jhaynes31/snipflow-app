"use client";
import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

const getConvexUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
  if (typeof window === "undefined") return envUrl;
  
  const hostname = window.location.hostname;
  if (hostname.includes(".e2b.dev")) {
    // If we're in a sandbox, the Convex backend is likely on port 3210
    return window.location.origin.replace(/^http(s?):\/\/3000-/, "http$1://3210-");
  }
  return envUrl;
};

const convex = new ConvexReactClient(getConvexUrl());

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
