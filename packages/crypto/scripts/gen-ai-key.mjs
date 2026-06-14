// Generate the server-side AI bridge keypair (X25519).
// Usage: node packages/crypto/scripts/gen-ai-key.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sodium = require("libsodium-wrappers-sumo");

await sodium.ready;
const kp = sodium.crypto_box_keypair();
const b64 = (u) => Buffer.from(u).toString("base64");

console.log("AI_PUBLIC_KEY=" + b64(kp.publicKey));
console.log("AI_PRIVATE_KEY=" + b64(kp.privateKey));
console.log("NEXT_PUBLIC_AI_PUBLIC_KEY=" + b64(kp.publicKey));
console.log("\n# Put AI_PUBLIC_KEY + AI_PRIVATE_KEY in the worker/api env.");
console.log("# Put NEXT_PUBLIC_AI_PUBLIC_KEY in the web env (public key only).");
