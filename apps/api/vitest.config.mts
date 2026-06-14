import { defineConfig } from "vitest/config";
import { createRequire } from "node:module";

// libsodium-wrappers-sumo ships a broken ESM build; force the working CJS build.
const require = createRequire(import.meta.url);
const libsodiumCjs = require.resolve("libsodium-wrappers-sumo");

export default defineConfig({
  resolve: {
    alias: { "libsodium-wrappers-sumo": libsodiumCjs },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    server: { deps: { inline: ["libsodium-wrappers-sumo", "@couple-chat/crypto"] } },
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
