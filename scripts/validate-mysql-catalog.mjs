import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { mysqlConfig } from "./mysql-config.mjs";

const officialDetailsPath = "data/classification/problem-details.json";
const supplementalPath = "data/classification/supplemental-cxx-problems.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function count(connection, table) {
  const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM ${table}`);
  return Number(rows[0].count);
}

async function scalarCount(connection, sql) {
  const [rows] = await connection.query(sql);
  return Number(rows[0].count);
}

async function main() {
  const [officialDetails, supplemental] = await Promise.all([
    readFile(officialDetailsPath, "utf8").then(JSON.parse),
    readFile(supplementalPath, "utf8").then(JSON.parse)
  ]);
  const expectedRecords = officialDetails.records.length + supplemental.records.length;
  const expectedGuidance = officialDetails.records.length + supplemental.answer_guidance.length;
  const expectedDetails = officialDetails.records.length + supplemental.problem_details.length;
  const expectedLevel5 = officialDetails.records.filter((record) => record.level === 5).length + supplemental.records.filter((record) => record.level === 5).length;
  const expectedSourceVersions = supplemental.source_versions.length;
  const connection = await mysql.createConnection(mysqlConfig());
  try {
    const recordCount = await count(connection, "classification_records");
    const guidanceCount = await count(connection, "problem_answer_guidance");
    const detailCount = await count(connection, "problem_details");
    const reviewCount = await count(connection, "review_queue_items");
    const sourceCount = await count(connection, "source_versions");
    const seedRecordCount = await scalarCount(
      connection,
      "SELECT COUNT(*) AS count FROM classification_records WHERE COALESCE(JSON_UNQUOTE(JSON_EXTRACT(record_json, '$.source_signals.user_editable')), 'false') <> 'true'"
    );
    const userRecordCount = await scalarCount(
      connection,
      "SELECT COUNT(*) AS count FROM classification_records WHERE COALESCE(JSON_UNQUOTE(JSON_EXTRACT(record_json, '$.source_signals.user_editable')), 'false') = 'true'"
    );
    const seedGuidanceCount = await scalarCount(
      connection,
      "SELECT COUNT(*) AS count FROM problem_answer_guidance WHERE COALESCE(JSON_UNQUOTE(JSON_EXTRACT(guidance_json, '$.content_origin')), '') <> 'user_input'"
    );
    const seedDetailCount = await scalarCount(
      connection,
      "SELECT COUNT(*) AS count FROM problem_details WHERE COALESCE(JSON_UNQUOTE(JSON_EXTRACT(detail_json, '$.content_origin')), '') <> 'user_input'"
    );
    const [levelRows] = await connection.query(
      "SELECT COUNT(*) AS count FROM classification_records WHERE level_no = 5 AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(record_json, '$.source_signals.user_editable')), 'false') <> 'true'"
    );
    const [statusRows] = await connection.query("SELECT effective_review_status, COUNT(*) AS count FROM classification_records GROUP BY effective_review_status");

    assert(seedRecordCount === expectedRecords, `expected ${expectedRecords} seeded classification records, got ${seedRecordCount}`);
    assert(seedGuidanceCount === expectedGuidance, `expected ${expectedGuidance} seeded answer guidance records, got ${seedGuidanceCount}`);
    assert(seedDetailCount === expectedDetails, `expected ${expectedDetails} seeded problem detail records, got ${seedDetailCount}`);
    assert(recordCount >= expectedRecords, `expected at least ${expectedRecords} classification records, got ${recordCount}`);
    assert(guidanceCount >= expectedGuidance, `expected at least ${expectedGuidance} answer guidance records, got ${guidanceCount}`);
    assert(detailCount >= expectedDetails, `expected at least ${expectedDetails} problem detail records, got ${detailCount}`);
    assert(reviewCount === 69, `expected 69 review queue items, got ${reviewCount}`);
    assert(sourceCount >= expectedSourceVersions, `expected at least ${expectedSourceVersions} source versions, got ${sourceCount}`);
    assert(Number(levelRows[0].count) === expectedLevel5, `expected ${expectedLevel5} C++ level 5 records, got ${levelRows[0].count}`);
    assert(statusRows.length >= 2, "expected multiple effective review statuses");

    console.log(`mysql classification record count: ${recordCount}`);
    console.log(`mysql user-maintained classification record count: ${userRecordCount}`);
    console.log(`mysql answer guidance record count: ${guidanceCount}`);
    console.log(`mysql problem detail record count: ${detailCount}`);
    console.log(`mysql C++ level 5 record count: ${levelRows[0].count}`);
    console.log(`mysql review queue item count: ${reviewCount}`);
    console.log(`mysql source version count: ${sourceCount}`);
    console.log("MySQL catalog validation passed");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`MySQL catalog validation failed: ${error.message}`);
  process.exitCode = 1;
});
