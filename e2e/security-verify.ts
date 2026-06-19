// Verify the security fixes at the data/service layer against local Mongo.
import mongoose from "mongoose";
import { User, Relationship, MessageEmbedding } from "@couple-chat/database";
import * as keysService from "../apps/api/src/domains/keys/services/keysService";

const MONGO = "mongodb://127.0.0.1:27017/couple-chat-sec-verify";
let pass = 0, fail = 0;
const chk = (c: boolean, m: string) => { c ? (console.log("  ✓ " + m), pass++) : (console.log("  ✗ " + m), fail++); };

async function main() {
  await mongoose.connect(MONGO);
  await Promise.all([User.deleteMany({}), Relationship.deleteMany({}), MessageEmbedding.deleteMany({})]);

  // --- HIGH-2: setCKShares ownership / key-poisoning defense ---
  const creator = await User.create({ email: "c@x.com", passwordHash: "h", name: "C", devices: [{ deviceId: "creatordev1", devicePub: "CP" }] });
  const joiner = await User.create({ email: "j@x.com", passwordHash: "h", name: "J", devices: [{ deviceId: "joinerdev01", devicePub: "JP" }] });
  const rel = await Relationship.create({ user1Id: creator._id, user2Id: joiner._id, status: "active" });

  let threw = false;
  try {
    await keysService.setCKShares(rel._id.toString(), joiner._id.toString(), [{ deviceId: "creatordev1", sealedCK: { v: 1, ct: "POISON" } }]);
  } catch { threw = true; }
  chk(threw, "joiner CANNOT overwrite creator's device share (poisoning rejected)");

  const own = await keysService.setCKShares(rel._id.toString(), joiner._id.toString(), [{ deviceId: "joinerdev01", sealedCK: { v: 1, ct: "ok" } }]);
  chk(own.includes("joinerdev01"), "joiner CAN set a share for their own device");

  const dist = await keysService.setCKShares(rel._id.toString(), creator._id.toString(), [{ deviceId: "joinerdev01", sealedCK: { v: 1, ct: "from-creator" } }]);
  chk(dist.includes("joinerdev01"), "creator MAY distribute CK to the joiner's device");

  let threwUnknown = false;
  try {
    await keysService.setCKShares(rel._id.toString(), creator._id.toString(), [{ deviceId: "totally-unknown-device", sealedCK: { v: 1, ct: "x" } }]);
  } catch { threwUnknown = true; }
  chk(threwUnknown, "shares for an unknown deviceId are rejected");

  // --- MEDIUM-1: disabling AI grant purges embeddings ---
  await keysService.enableAIGrant(rel._id.toString(), { v: 1, ct: "ck-for-ai" });
  await MessageEmbedding.create({ messageId: new mongoose.Types.ObjectId(), relationshipId: rel._id, embedding: [0.1, 0.2] });
  chk((await MessageEmbedding.countDocuments({ relationshipId: rel._id })) === 1, "embedding exists while AI is on");
  await keysService.disableAIGrant(rel._id.toString());
  chk((await MessageEmbedding.countDocuments({ relationshipId: rel._id })) === 0, "embeddings purged when AI grant revoked");
  const after: any = await Relationship.findById(rel._id).select("wrappedCKForAI");
  chk(!after?.wrappedCKForAI, "wrappedCKForAI removed on revoke");

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(1); });
