
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/ollama-api/:path*',
        destination: 'http://localhost:11434/api/:path*',
      },
    ];
  },
};

export default nextConfig;
