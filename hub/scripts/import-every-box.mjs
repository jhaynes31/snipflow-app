// One-time copy of the standalone Every Box's data into The Shire.
// Runs inside the Vercel production build when EVERY_BOX_SOURCE_DEPLOY_KEY
// is set and the copy hasn't happened yet (marked by EVERY_BOX_IMPORTED on
// the Shire deployment). Reads a snapshot of the old deployment, keeps only
// the eb* tables, renames the old `userId` link to `legacyUserId`, imports,
// then links partners to Shire profiles by email. Never writes to the old
// deployment.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yauzl from "yauzl";

/**
 * Reads every file in a zip into memory as { path: string }. Uses yauzl
 * because Convex's snapshot zips use zip64 records that jszip can't read.
 */
function readZip(path) {
  return new Promise((resolve, reject) => {
    const files = new Map();
    yauzl.open(path, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      zip.on("error", reject);
      zip.on("end", () => resolve(files));
      zip.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName)) return zip.readEntry();
        zip.openReadStream(entry, (err2, stream) => {
          if (err2) return reject(err2);
          const chunks = [];
          stream.on("data", (c) => chunks.push(c));
          stream.on("error", reject);
          stream.on("end", () => {
            files.set(entry.fileName, Buffer.concat(chunks).toString("utf8"));
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });
}

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
  // Accept the variable name in any capitalization; it was typed as
  // Every_Box_Source_Deploy_Key once and names are case-sensitive.
  const sourceName = Object.keys(process.env).find((k) => k.toUpperCase() === "EVERY_BOX_SOURCE_DEPLOY_KEY");
  const source = sourceName ? process.env[sourceName] : undefined;
  if (!source) {
    console.log("No Every Box source key set; skipping the data copy.");
    return;
  }
  if (convexEnvGet("EVERY_BOX_IMPORTED")) {
    console.log("Every Box data was already copied in; skipping.");
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), "every-box-"));
  const snapshot = join(dir, "source.zip");
  console.log("Exporting a snapshot of the old Every Box deployment...");
  run(["export", "--path", snapshot], { CONVEX_DEPLOY_KEY: source });

  const zip = await readZip(snapshot);
  const rowsOf = (table) =>
    (zip.get(`${table}/documents.jsonl`) ?? "")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));

  const legacyUsers = rowsOf("users")
    .filter((u) => u._id && u.email)
    .map((u) => ({ legacyUserId: String(u._id), email: String(u.email) }));

  const payload = {
    households: rowsOf("ebHouseholds"),
    partners: rowsOf("ebPartners"),
    categories: rowsOf("ebCategories"),
    tendingEvents: rowsOf("ebTendingEvents"),
    categoryNotes: rowsOf("ebCategoryNotes"),
    weeklyReviews: rowsOf("ebWeeklyReviews"),
    commitments: rowsOf("ebCommitments"),
    legacyUsers,
  };
  const found = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, v.length]));
  console.log("Rows found in the old deployment:", JSON.stringify(found));

  console.log("Copying into The Shire in one transaction (old ids are replaced, links rebuilt)...");
  const result = run(["run", "everyBox/importLegacy:importAll", JSON.stringify(payload)], {}, true).toString();
  console.log(result.trim());

  const after = run(["run", "everyBox/importLegacy:counts", "{}"], {}, true).toString();
  console.log("Rows now in The Shire:", after.trim());

  run(["env", "set", "--", "EVERY_BOX_IMPORTED", new Date().toISOString()]);
  console.log("Every Box data copied. Remove EVERY_BOX_SOURCE_DEPLOY_KEY from Vercel whenever you like; it is no longer needed.");
}
