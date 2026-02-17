import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["music-metadata"],
  turbopack: {
    resolveAlias: {
      canvas: { browser: "" },
    },
  },
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
