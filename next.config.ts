import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static optimization where possible
  output: "standalone",

  // Optimize images
  images: {
    domains: ["localhost", "yourdomain.com"], // Add your domain here
    formats: ["image/webp", "image/avif"],
  },

  // Enable compression
  compress: true,

  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // TypeScript configuration
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: false,
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
