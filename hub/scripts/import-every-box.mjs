// One-time copy of the standalone Every Box's data into The Shire.
// Runs inside the Vercel production build when EVERY_BOX_SOURCE_DEPLOY_KEY
// is set and the copy hasn't happened yet (marked by EVERY_BOX_IMPORTED on
// the Shire deployment). Reads a snapshot of the old deployment, keeps only
// the eb* tables, renames the old `userId` link to `legacyUserId`, imports,
// then links partners to Shire profiles by email. Never writes to the old
// deployment.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";

const EB_TABLES = ["ebHouseholds", "ebPartners", "ebCategories", "ebTendingEvents", "ebCategoryNotes", "ebWeeklyReviews", "ebCommitments"];

function run(args, env = {}, capture = false) {
  return execFileSync("npx", ["convex", ...args], {
    stdio: capture ? ["ignore", "pipe", "inherit"] : ["ignore", "inherit", "inherit"],
    env: { ...process.env, ...env },
  });
}

function convexEnvGet(name) {
  try {
    return execFileSync("npx", ["convex", "env", "get", name], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

export async function importEveryBoxIfNeeded() {
  const source = process.env.EVERY_BOX_SOURCE_DEPLOY_KEY;
  if (!source) return;
  if (convexEnvGet("EVERY_BOX_IMPORTED")) {
    console.log("Every Box data was already copied in; skipping.");
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), "every-box-"));
  const snapshot = join(dir, "source.zip");
  console.log("Exporting a snapshot of the old Every Box deployment...");
  run(["export", "--path", snapshot], { CONVEX_DEPLOY_KEY: source });

  const zip = await JSZip.loadAsync(readFileSync(snapshot));
  const out = new JSZip();
  const counts = {};
  const legacyUsers = [];

  const usersFile = zip.file("users/documents.jsonl");
  if (usersFile) {
    for (const line of (await usersFile.async("string")).split("\n")) {
      if (!line.trim()) continue;
      const u = JSON.parse(line);
      if (u._id && u.email) legacyUsers.push({ legacyUserId: u._id, email: u.email });
    }
  }

  for (const table of EB_TABLES) {
    const file = zip.file(`${table}/documents.jsonl`);
    if (!file) {
      counts[table] = 0;
      continue;
    }
    const rows = (await file.async("string"))
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
    for (const row of rows) {
      if (table === "ebPartners" && row.userId !== undefined) {
        row.legacyUserId = String(row.userId);
        delete row.userId;
      }
      if (table === "ebHouseholds" && row.createdBy !== undefined) row.createdBy = String(row.createdBy);
    }
    counts[table] = rows.length;
    out.file(`${table}/documents.jsonl`, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  }
  const ebZip = join(dir, "every-box.zip");
  writeFileSync(ebZip, await out.generateAsync({ type: "nodebuffer" }));
  console.log("Rows found in the old deployment:", JSON.stringify(counts));

  console.log("Importing into The Shire (replacing any Every Box rows created before the copy)...");
  run(["import", ebZip, "--replace", "--yes"]);

  console.log("Linking partners to Shire profiles by email...");
  const linkResult = run(["run", "everyBox/importLegacy:link", JSON.stringify({ links: legacyUsers })], {}, true).toString();
  console.log(linkResult.trim());

  const after = run(["run", "everyBox/importLegacy:counts", "{}"], {}, true).toString();
  console.log("Rows now in The Shire:", after.trim());

  run(["env", "set", "--", "EVERY_BOX_IMPORTED", new Date().toISOString()]);
  console.log("Every Box data copied. Remove EVERY_BOX_SOURCE_DEPLOY_KEY from Vercel whenever you like; it is no longer needed.");
}
