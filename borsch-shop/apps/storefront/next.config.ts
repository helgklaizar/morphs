import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'borsch.shop',
      },
    ],
  },
};

export default nextConfig;
