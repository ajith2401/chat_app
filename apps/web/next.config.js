const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace packages ship raw TS — Next must transpile them.
  transpilePackages: ["@couple-chat/validation", "@couple-chat/crypto"],
  webpack: (config) => {
    // libsodium-wrappers-sumo ships a broken ESM build (its .mjs imports a
    // sibling that isn't published). Force the working CJS build everywhere.
    config.resolve.alias["libsodium-wrappers-sumo"] = require.resolve(
      "libsodium-wrappers-sumo"
    );
    return config;
  },
};

module.exports = nextConfig;
