import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const snapshotPath = "data/exports/classification-source-snapshot.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const snapshot = await readJson(snapshotPath);
  assert(snapshot.schema_version === 1, "snapshot schema_version must be 1");
  assert(Array.isArray(snapshot.files) && snapshot.files.length > 0, "snapshot files required");

  for (const file of snapshot.files) {
    assert(file.path && typeof file.content === "string" && file.sha256, `${file.role}: path/content/sha256 required`);
    const actual = sha256(file.content);
    assert(actual === file.sha256, `${file.path}: snapshot content sha256 mismatch`);
    if (apply) {
      await mkdir(dirname(file.path), { recursive: true });
      await writeFile(file.path, file.content);
    }
  }

  console.log(`restore audit snapshot files: ${snapshot.files.length}`);
  console.log(apply ? "Audit source restore applied" : "Audit source restore dry-run passed");
}

main().catch((error) => {
  console.error(`Audit source restore failed: ${error.message}`);
  process.exitCode = 1;
});
