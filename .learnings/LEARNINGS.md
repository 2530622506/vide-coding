# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260607-001] correction

**Logged**: 2026-06-07T02:37:36Z
**Priority**: high
**Status**: pending
**Area**: data-ingestion

### Summary
Luogu difficulty-specific problem list URLs should be crawled directly instead of first scanning all difficulties.

### Details
When the user provides `https://www.luogu.com.cn/problem/list?type=AT&page=1&difficulty=2`, the crawler should keep `difficulty=2` in the list URL and only change `page`. Scanning the unfiltered `type=AT` list wastes time and contradicts the requested scope.

### Suggested Action
Parameterize the Luogu AtCoder list URL by target difficulty and preserve query filters during pagination.

### Metadata
- Source: user_feedback
- Related Files: scripts/build-luogu-atcoder-bank.mjs
- Tags: luogu, crawler, scoped-ingestion

---
