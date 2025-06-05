/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/ollama-api/:path*',
        destination: process.env.OLLAMA_API_URL || 'http://localhost:11434/api/:path*',
      },
    ];
  },
  // Server configuration - updated to use correct Next.js syntax
  experimental: {
    serverComponentsExternalPackages: [],
  },
  env: {
    PORT: '49494',
    FALLBACK_PORTS: '49049,49994,51951,54321,3006,6969'
  }
};

export default nextConfig;

