import { AtCoderCatalogService } from "../dist/api/atcoder-catalog.service.js";
import { CatalogService } from "../dist/api/catalog.service.js";
import { ConsumerMobileService } from "../dist/api/consumer-mobile.service.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const service = new ConsumerMobileService(new CatalogService(), new AtCoderCatalogService());
  const userKey = `validate-consumer-${Date.now()}`;
  const content = await service.getMobileContent(userKey);

  assert(content.generated_at, "mobile content generated_at required");
  assert(content.data_source?.progress === "mysql" || content.data_source?.progress === "memory", "progress data source required");
  assert(content.home?.today_task, "home.today_task required");
  assert(content.home?.library_cards?.length === 2, "home.library_cards should include GESP and AtCoder");
  assert(content.catalog_summary?.levels?.length >= 1, "catalog_summary levels required");
  assert(content.progress_summary?.counts, "progress_summary counts required");
  assert(content.profile_summary?.review_plan, "profile review plan required");
  assert(content.legacy?.gesp?.total_count === content.gesp.total_count, "legacy content should mirror GESP total");

  const catalog = await service.getGespCatalog({ level: content.catalog_summary.default_level });
  assert(catalog.levels.length >= 8, "catalog should expose all GESP levels");
  assert(catalog.selected_domain_id === null, "default catalog should not lock to one domain");
  assert(catalog.problem_types.length >= 1, "catalog reset should return problem types");

  const search = await service.searchProblems("小杨");
  assert(search.query === "小杨", "search query should be normalized");
  assert(search.total_count === search.gesp.length + search.atcoder.length, "search total should match source counts");
  assert(search.gesp.length + search.atcoder.length >= 1, "search should find related problems");

  const problem = content.gesp.featured_problem || content.atcoder.featured_problem;
  assert(problem?.id, "featured problem required for event validation");

  const viewed = await service.recordProgressEvent({
    problemId: problem.id,
    source: problem.source,
    title: problem.title,
    type: "view"
  }, userKey);
  assert(viewed.counts.viewed >= 1, "view event should increase viewed count");
  assert(viewed.recent_events[0]?.problemId === problem.id, "recent events should include viewed problem");

  const favorited = await service.recordProgressEvent({
    problemId: problem.id,
    source: problem.source,
    title: problem.title,
    type: "favorite"
  }, userKey);
  assert(favorited.counts.favorite >= 1, "favorite event should increase favorite count");
  assert(favorited.favorites.some((event) => event.problemId === problem.id), "favorites should contain problem");

  const reviewed = await service.recordProgressEvent({
    problemId: problem.id,
    source: problem.source,
    title: problem.title,
    type: "review"
  }, userKey);
  assert(reviewed.counts.reviewed >= 1, "review event should increase reviewed count");
  assert(Array.isArray(reviewed.weak_points), "weak_points should be an array");
  assert(reviewed.review_plan?.status === "ready" || reviewed.review_plan?.status === "empty", "review_plan status required");

  let badRequestThrown = false;
  try {
    await service.recordProgressEvent({ type: "view" }, userKey);
  } catch {
    badRequestThrown = true;
  }
  assert(badRequestThrown, "missing problemId should throw");

  console.log(`consumer mobile data source: ${content.data_source.progress}`);
  console.log(`consumer mobile GESP count: ${content.gesp.total_count}`);
  console.log(`consumer mobile AtCoder count: ${content.atcoder.total_count}`);
  console.log(`consumer mobile search results: ${search.total_count}`);
  console.log(`consumer mobile weak points: ${reviewed.weak_points.length}`);
  console.log(`consumer mobile review plan: ${reviewed.review_plan.status}/${reviewed.review_plan.items.length}`);
  console.log("Consumer mobile API validation passed");
}

main().catch((error) => {
  console.error(`Consumer mobile API validation failed: ${error.message}`);
  process.exitCode = 1;
});
