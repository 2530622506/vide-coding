import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { mysqlConfig } from "./mysql-config.mjs";

const SCHEMA_PATH = "infra/mysql/schema.sql";
const DATA_PATH = "data/atcoder/luogu-atcoder-problem-bank.json";

function json(value) {
  return JSON.stringify(value);
}

async function applySchema(connection) {
  const schema = await readFile(SCHEMA_PATH, "utf8");
  const statements = schema
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await connection.query(statement);
  }
}

async function main() {
  const catalog = JSON.parse(await readFile(DATA_PATH, "utf8"));
  const connection = await mysql.createConnection({
    ...mysqlConfig(),
    multipleStatements: false
  });

  try {
    await applySchema(connection);
    await connection.beginTransaction();
    await connection.query("DELETE FROM atcoder_problem_bank");
    await connection.query("DELETE FROM atcoder_catalog_snapshots");

    for (const problem of catalog.problems) {
      await connection.execute(
        `INSERT INTO atcoder_problem_bank (
          pid,
          difficulty,
          difficulty_label,
          title,
          title_zh,
          problem_json
        ) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))`,
        [
          problem.pid,
          problem.difficulty,
          problem.difficulty_label,
          problem.title,
          problem.title_zh,
          json(problem)
        ]
      );
    }

    await connection.execute(
      `INSERT INTO atcoder_catalog_snapshots (
        snapshot_id,
        catalog_json
      ) VALUES ('active', CAST(? AS JSON))`,
      [json(catalog)]
    );

    await connection.commit();
    console.log(`seeded AtCoder problems: ${catalog.problems.length}`);
    console.log("seeded AtCoder catalog snapshot: active");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`AtCoder MySQL seed failed: ${error.message}`);
  process.exitCode = 1;
});
