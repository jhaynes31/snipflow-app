import type { NextConfig } from "next";

/**
 * Browser-side locks for every response. The content policy allows only this
 * site, the Convex backend (database, live updates, sign-in), and data/blob
 * URLs for images the app makes itself. Inline scripts and styles stay allowed
 * because Next and the two embedded Vite apps rely on them; no other origin can
 * run code here, frame the site, or receive a referrer with a path in it.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.convex.cloud",
  "font-src 'self' data:",
  "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // Heartwood Fitness is a separate app (hub/heartwood, built by Vite) served
      // from public/fitness/app. Deep links like /fitness/app/library must land
      // on its index.html so its own router can take over. Real files under
      // public/ (its JS, CSS, media) are served before these run.
      afterFiles: [
        { source: "/fitness/app", destination: "/fitness/app/index.html" },
        { source: "/fitness/app/:path*", destination: "/fitness/app/index.html" },
        // Love & Release, the same way (hub/love-and-release → public/love-and-release/app).
        { source: "/love-and-release/app", destination: "/love-and-release/app/index.html" },
        { source: "/love-and-release/app/:path*", destination: "/love-and-release/app/index.html" },
      ],
    };
  },
  async redirects() {
    return [
      // The support app was renamed Tend (docs/spec-update-1.md).
      { source: "/support", destination: "/tend", permanent: true },
      { source: "/support/:path*", destination: "/tend/:path*", permanent: true },
      // Re-Centered moved inside Love & Release (docs/love-and-release-migration.md).
      { source: "/re-centered", destination: "/love-and-release/john", permanent: true },
      { source: "/re-centered/:path*", destination: "/love-and-release/john/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Every page and file: the browser-side locks (2026-09-25, docs/security.md).
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/love-and-release/app/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        // Heartwood's own service worker, same rule.
        source: "/fitness/app/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        // The service worker must never be served stale.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
