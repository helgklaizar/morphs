import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ['@borsch/ui', '@borsch/db-local', '@borsch/types', '@borsch/testing'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
