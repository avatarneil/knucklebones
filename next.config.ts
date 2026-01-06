import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Enable static export for Capacitor builds (native apps)
  ...(isCapacitorBuild && {
    output: "export",
    // Exclude dynamic routes that require server-side data
    // These features use the remote API anyway in native apps
    excludeDefaultMomentLocales: true,
  }),
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
