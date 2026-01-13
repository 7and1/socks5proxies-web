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

  // Performance: Configure module resolution for smaller bundles
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },

  // Performance: Webpack configuration for better code splitting
  webpack: (config, { isServer }) => {
    // Split chunks more aggressively for better caching
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for node_modules
          framework: {
            name: "framework",
            chunks: "all",
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const match = module.context?.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/,
              );
              const packageName = match?.[1] || "unknown";
              return `lib.${packageName.replace("@", "")}`;
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: "commons",
            chunks: "all",
            minChunks: 2,
            priority: 20,
          },
        },
      };
    }
    return config;
  },

  // Performance: Disable source maps in production for smaller builds
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
