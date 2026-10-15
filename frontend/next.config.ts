import type { NextConfig } from "next";

// docs/02 §2: static export only — no SSR, no server actions, no image
// optimizer. One FastAPI container serves this out/ directory.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
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
