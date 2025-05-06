/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable Cloudflare integration for Vercel deployment
  experimental: {
    esmExternals: true,
  },
}

export default nextConfig
