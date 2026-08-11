/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  devIndicators: false,

  // Forward all /api/* and /socket.io/* requests to the Express backend
  // when NEXT_PUBLIC_API_URL is set (development proxy).
  // This is a fallback; the frontend already uses the full localhost:5000 URL.
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return [
      { source: '/api/:path*',    destination: `${backendUrl}/api/:path*` },
      { source: '/socket.io/:path*', destination: `${backendUrl}/socket.io/:path*` },
    ];
  },
};

export default nextConfig;
