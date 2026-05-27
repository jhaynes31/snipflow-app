"use client";

import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";

export function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();

  return (
    <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border bg-background">
      <Link className="flex items-center justify-center" href="/">
        <span className="text-2xl font-bold text-primary">SnipFlow</span>
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
        <Link className="text-sm font-medium hover:text-primary transition-colors" href="/blog">
          Blog
        </Link>
        <Link className="text-sm font-medium hover:text-primary transition-colors" href="/dashboard">
          Dashboard
        </Link>
        {!isLoading && (
          isAuthenticated ? (
            <button 
              onClick={() => signOut()} 
              className="text-sm font-medium text-red-500 hover:text-red-400"
            >
              Logout
            </button>
          ) : (
            <Link className="text-sm font-medium hover:text-primary transition-colors" href="/login">
              Login
            </Link>
          )
        )}
      </nav>
    </header>
  );
}
