/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  productionBrowserSourceMaps: true,
  serverExternalPackages: ["pino", "pino-pretty"],
  experimental: {
    serverSourceMaps: true,
  }
};
export default nextConfig;
