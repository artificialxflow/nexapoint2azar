import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      { source: "/favicon.ico", destination: "/logo/nexa-logo03.png" },
    ];
  },
  experimental: {
    agentFeedback: true,
  },
  /* cacheComponents + partialPrefetching broke App Router client nav on prod (v12) */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
