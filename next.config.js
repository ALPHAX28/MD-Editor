/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['your-image-domain.com'], // Add your image domains here
  },
  eslint: {
    ignoreDuringBuilds: true, // Only if you want to ignore ESLint errors during build
  },
}

module.exports = nextConfig 