import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["music-metadata"],
  turbopack: {
    resolveAlias: {
      canvas: { browser: "" },
    },
  },
};

export default nextConfig;
