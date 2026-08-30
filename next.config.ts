import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pdfme/generator", "@pdfme/common", "@pdfme/schemas"],
};

export default nextConfig;
