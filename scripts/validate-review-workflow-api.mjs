import { CatalogService } from "../dist/api/catalog.service.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const service = new CatalogService();
  const [queue, summary] = await Promise.all([
    service.getReviewQueue(),
    service.getReviewQueueSummary()
  ]);
  const audit = await service.getAuditSummary();
  const auditEvents = await service.getAuditEvents();

  assert(queue.data_source === "json" || queue.data_source === "mysql", "review queue data source required");
  assert(Array.isArray(queue.items) && queue.items.length > 0, "review queue items required");
  assert(queue.summary.total_count === summary.summary.total_count, "queue and summary counts must match");
  assert(queue.summary.by_priority.high >= 2, "high-priority review items required");
  assert(queue.items[0].status === "open", "open items should sort first");
  assert(queue.items[0].priority === "high", "high-priority items should sort first");
  assert(queue.items.every((item) => item.id && item.type && item.priority && item.status), "review item core fields required");
  assert(queue.items.some((item) => item.recommended_action), "review items should include recommended actions");
  assert(audit.summary.canonical_problem_count >= 400, "audit summary should include problem count");
  assert(audit.summary.tag_count >= 1000, "audit summary should include tag count");
  assert(audit.rollback.source_snapshot_file, "audit rollback snapshot file required");
  assert(auditEvents.data_source === "json" || auditEvents.data_source === "mysql", "audit events data source required");
  assert(Array.isArray(auditEvents.events), "audit events should be an array");

  console.log(`review workflow data source: ${queue.data_source}`);
  console.log(`review workflow item count: ${queue.items.length}`);
  console.log(`review workflow open count: ${queue.summary.total_count}`);
  console.log(`review workflow high priority: ${queue.summary.by_priority.high}`);
  console.log(`audit summary tags: ${audit.summary.tag_count}`);
  console.log(`audit event count: ${auditEvents.events.length}`);
  console.log("Review workflow API validation passed");
}

main().catch((error) => {
  console.error(`Review workflow API validation failed: ${error.message}`);
  process.exitCode = 1;
});
