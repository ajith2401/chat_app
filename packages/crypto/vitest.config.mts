import { defineConfig } from "vitest/config";
import { createRequire } from "node:module";

// libsodium-wrappers-sumo ships a broken ESM build (its .mjs imports a sibling that
// isn't published). Force resolution to the working CommonJS build.
const require = createRequire(import.meta.url);
// require.resolve uses the "require" export condition -> the working CJS build.
const libsodiumCjs = require.resolve("libsodium-wrappers-sumo");

export default defineConfig({
  resolve: {
    alias: { "libsodium-wrappers-sumo": libsodiumCjs },
  },
  test: {
    globals: true,
    environment: "node",
    server: { deps: { inline: ["libsodium-wrappers-sumo"] } },
  },
});
