import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.ngrok-free.app",
  ],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.ngrok-free.app",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "geolocation=(self), camera=(), microphone=(), publickey-credentials-get=(self), publickey-credentials-create=(self)",
          },
        ],
      },
    ];
  },
};
module.exports = {
  allowedDevOrigins: ['10.229.9.5'],
}

export default nextConfig;