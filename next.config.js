/** next.config.js */
const nextConfig = {
  reactStrictMode: true,
  // Vercel deployment optimizations
  // Ensure Prisma client is included in the build
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./node_modules/.prisma/client/**/*'],
    },
  },
};

module.exports = nextConfig;
  