/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features for larger payloads
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
