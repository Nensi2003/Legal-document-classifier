import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["tesseract.js"],
  reactCompiler: true,
};

export default nextConfig;
