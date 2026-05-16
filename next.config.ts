import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compiler: {
    // Strip console.* in production builds but keep console.error so failure
    // logging in the API routes (generate/critique) stays observable.
    removeConsole: { exclude: ["error"] }
  },
  experimental: {
    // Tree-shake barrel imports from these heavy packages to shrink bundles.
    optimizePackageImports: ["reactflow", "firebase"]
  }
};

export default nextConfig;
