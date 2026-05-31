import { readFile } from "node:fs/promises";

const schemaPath = "data/source-registry/schema.json";
const registryFiles = [
  { path: "data/source-registry/sources.official.json", kind: "official" },
  { path: "data/source-registry/sources.secondary.json", kind: "secondary" }
];

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`failed to read JSON ${path}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateArrayField(source, field, sourceId) {
  assert(Array.isArray(source[field]), `${sourceId}: ${field} must be an array`);
  assert(source[field].length > 0, `${sourceId}: ${field} must not be empty`);
}

function validateSource(source, context, ids) {
  const { requiredFields, enums, kind } = context;
  const sourceId = source.id ?? "(missing id)";

  for (const field of requiredFields) {
    assert(Object.hasOwn(source, field), `${sourceId}: missing required field ${field}`);
  }

  assert(typeof source.id === "string" && source.id.length > 0, `${sourceId}: id must be a non-empty string`);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.id), `${sourceId}: id must be kebab-case`);
  assert(!ids.has(source.id), `duplicate source id: ${source.id}`);
  ids.add(source.id);

  assert(typeof source.name === "string" && source.name.length > 0, `${sourceId}: name must be a non-empty string`);
  assert(typeof source.url === "string" && source.url.length > 0, `${sourceId}: url must be a non-empty string`);
  new URL(source.url);

  for (const field of ["source_type", "trust_level", "crawl_strategy", "license_status"]) {
    assert(enums[field].includes(source[field]), `${sourceId}: invalid ${field} ${source[field]}`);
  }

  assert(typeof source.can_store_full_text === "boolean", `${sourceId}: can_store_full_text must be boolean`);
  validateArrayField(source, "language_scope", sourceId);
  validateArrayField(source, "level_scope", sourceId);
  validateArrayField(source, "content_scope", sourceId);
  assert(typeof source.notes === "string" && source.notes.length > 0, `${sourceId}: notes must be a non-empty string`);

  if (kind === "official") {
    assert(source.trust_level === "canonical", `${sourceId}: official source must use trust_level canonical`);
  }

  if (kind === "secondary") {
    assert(source.trust_level !== "canonical", `${sourceId}: secondary source must not use trust_level canonical`);
  }
}

async function main() {
  const schema = await readJson(schemaPath);
  assert(schema.schema_version === 1, "schema_version must be 1");
  assert(Array.isArray(schema.required_fields), "schema.required_fields must be an array");
  assert(schema.enums && typeof schema.enums === "object", "schema.enums must be an object");

  const requiredFields = schema.required_fields;
  const enums = schema.enums;
  const ids = new Set();
  const counts = { official: 0, secondary: 0 };

  for (const registryFile of registryFiles) {
    const registry = await readJson(registryFile.path);
    assert(registry.schema_version === schema.schema_version, `${registryFile.path}: schema_version mismatch`);
    assert(Array.isArray(registry.sources), `${registryFile.path}: sources must be an array`);

    for (const source of registry.sources) {
      validateSource(source, {
        requiredFields,
        enums,
        kind: registryFile.kind
      }, ids);
      counts[registryFile.kind] += 1;
    }
  }

  assert(counts.official >= 5, `official source count must be at least 5, got ${counts.official}`);
  assert(counts.official + counts.secondary >= 15, `total source count must be at least 15, got ${counts.official + counts.secondary}`);

  console.log(`official source count: ${counts.official}`);
  console.log(`secondary source count: ${counts.secondary}`);
  console.log("secondary canonical count: 0");
  console.log("Source registry validation passed");
}

main().catch((error) => {
  console.error(`Source registry validation failed: ${error.message}`);
  process.exitCode = 1;
});
