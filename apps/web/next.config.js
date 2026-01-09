/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  trailingSlash: true,
  poweredByHeader: false,

  // Performance: Optimize images (using unoptimized for static export)
  images: {
    unoptimized: true,
  },

  // Performance: Enable experimental features
  experimental: {
    optimizePackageImports: ["clsx", "lucide-react"],
    serverComponentsExternalPackages: ["drizzle-kit", "esbuild", "pg-native"],
  },

  // Performance: Configure module resolution
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },
};

module.exports = nextConfig;
