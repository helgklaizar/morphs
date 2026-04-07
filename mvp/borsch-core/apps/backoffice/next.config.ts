import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@rms/ui', '@rms/types', '@rms/testing', '@rms/core'],
  images: {
    unoptimized: true,
  },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
