import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["music-metadata"],
  turbopack: {
    resolveAlias: {
      canvas: { browser: "" },
    },
  },
  serverBodyMaxSize: 100 * 1024 * 1024, // 100MB for audio uploads
};

export default nextConfig;
