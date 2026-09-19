import type { NextConfig } from "next";

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
      ],
    };
  },
  async redirects() {
    return [
      // The support app was renamed Tend (docs/spec-update-1.md).
      { source: "/support", destination: "/tend", permanent: true },
      { source: "/support/:path*", destination: "/tend/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
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
