import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
