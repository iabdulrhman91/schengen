import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/cases',
        destination: '/requests',
        permanent: true,
      },
      {
        source: '/cases/:path*',
        destination: '/requests/:path*',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
