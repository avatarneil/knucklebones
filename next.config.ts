import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Explicitly use webpack for WASM support (Turbopack doesn't fully support WASM yet)
  webpack: (config, { isServer }) => {
    // Enable WASM support (client-side only)
    if (!isServer) {
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };

      // Handle WASM files (client-side only)
      config.module.rules.push({
        test: /\.wasm$/,
        type: "asset/resource",
      });
    }

    return config;
  },
  // Add empty turbopack config to silence warning (we're using webpack)
  turbopack: {},
};

export default nextConfig;
