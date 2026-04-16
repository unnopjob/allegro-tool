import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['bcryptjs', 'pdf-parse'],
};

export default nextConfig;
