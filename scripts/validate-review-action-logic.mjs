import { readFile } from "node:fs/promises";
import { CatalogService } from "../dist/api/catalog.service.js";

const modelPath = "data/classification/conflict-confidence-model.json";
const queuePath = "data/classification/review-workqueue-plan.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function makeFakeConnection({ item, record }) {
  const state = {
    item: structuredClone(item),
    record: structuredClone(record),
    events: [],
    committed: false,
    rolledBack: false
  };
  return {
    state,
    async beginTransaction() {},
    async commit() {
      state.committed = true;
    },
    async rollback() {
      state.rolledBack = true;
    },
    async end() {},
    async query(sql) {
      if (sql.includes("SELECT item_json FROM review_queue_items")) {
        return [[{ item_json: state.item }]];
      }
      if (sql.includes("SELECT record_json FROM classification_records")) {
        return state.record ? [[{ record_json: state.record }]] : [[]];
      }
      throw new Error(`Unexpected fake query: ${sql}`);
    },
    async execute(sql, params) {
      if (sql.includes("UPDATE classification_records")) {
        state.record = JSON.parse(params[1]);
        state.record.effective_review_status = params[0];
        return [{ affectedRows: 1 }];
      }
      if (sql.includes("UPDATE review_queue_items")) {
        state.item = JSON.parse(params[1]);
        state.item.status = params[0];
        return [{ affectedRows: 1 }];
      }
      if (sql.includes("INSERT INTO review_events")) {
        state.events.push({
          review_item_id: params[0],
          canonical_problem_id: params[1],
          action: params[2],
          reviewer: params[3],
          note: params[4],
          before_status: params[5],
          after_status: params[6],
          event_json: JSON.parse(params[7])
        });
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected fake execute: ${sql}`);
    }
  };
}

function findRecord(model, item) {
  return model.records.find((record) => record.canonical_problem_id === item.canonical_problem_id);
}

function findMatchingTag(record, item) {
  const arrays = [
    ...record.resolved_algorithm_domains,
    ...record.resolved_problem_type_tags,
    ...record.resolved_knowledge_point_tags
  ];
  return arrays.find((tag) => tag.kind === item.tag_kind && tag.value === item.tag_value);
}

async function runAction({ item, record, action }) {
  const service = new CatalogService();
  const fakeConnection = makeFakeConnection({ item, record });
  service.createMysqlConnection = () => fakeConnection;
  const result = await service.applyReviewAction(item.id, {
    action,
    reviewer: "validation-reviewer",
    note: `${action} validation`
  });
  return { result, state: fakeConnection.state };
}

async function main() {
  const [model, queue] = await Promise.all([readJson(modelPath), readJson(queuePath)]);
  const tagItem = queue.items.find((item) => item.status === "open" && item.tag_kind && item.tag_value && findRecord(model, item));
  assert(tagItem, "expected a review item linked to a classification tag");
  const tagRecord = findRecord(model, tagItem);
  assert(findMatchingTag(tagRecord, tagItem), "linked review item must match an existing tag");

  const sourceDuplicateItem = queue.items.find((item) => item.status === "open" && item.type === "source_duplicate");
  assert(sourceDuplicateItem, "expected a duplicate review item");

  const confirmed = await runAction({ item: tagItem, record: tagRecord, action: "confirm" });
  assert(confirmed.state.committed && !confirmed.state.rolledBack, "confirm should commit");
  assert(confirmed.state.item.status === "confirmed", "confirm should update review item status");
  assert(confirmed.state.events[0]?.after_status === "confirmed", "confirm should write audit event");
  assert(!confirmed.state.record.review_queue_refs.includes(tagItem.id), "confirm should remove handled queue ref");
  const confirmedTag = findMatchingTag(confirmed.state.record, tagItem);
  assert(confirmedTag.review_status === "confirmed", "confirm should update tag review_status");
  assert(confirmedTag.effective_review_status === "confirmed", "confirm should update tag effective status");

  const rejected = await runAction({ item: tagItem, record: tagRecord, action: "reject" });
  assert(rejected.state.item.status === "rejected", "reject should update review item status");
  assert(rejected.state.events[0]?.after_status === "rejected", "reject should write audit event");
  const rejectedTag = findMatchingTag(rejected.state.record, tagItem);
  assert(rejectedTag.review_status === "rejected", "reject should update tag review_status");
  assert(rejectedTag.final_confidence <= 0.2, "reject should reduce final confidence");

  const merged = await runAction({ item: sourceDuplicateItem, record: null, action: "merge_duplicate" });
  assert(merged.state.item.status === "merged", "merge_duplicate should update item status");
  assert(merged.state.events[0]?.after_status === "merged", "merge_duplicate should write audit event");
  assert(merged.state.events[0]?.event_json.source_ref, "merge_duplicate should preserve source_ref in audit event");

  console.log(`review action tag item: ${tagItem.id}`);
  console.log(`review action duplicate item: ${sourceDuplicateItem.id}`);
  console.log("Review action logic validation passed");
}

main().catch((error) => {
  console.error(`Review action logic validation failed: ${error.message}`);
  process.exitCode = 1;
});
