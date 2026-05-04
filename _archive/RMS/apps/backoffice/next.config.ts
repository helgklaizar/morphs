import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ['@rms/ui', '@rms/db-local', '@rms/types', '@rms/testing'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
