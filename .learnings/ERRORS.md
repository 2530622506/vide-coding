# Errors

Command failures and integration errors.

---

## [ERR-20260605-001] external_fetch

**Logged**: 2026-06-05T00:00:00+08:00
**Priority**: medium
**Status**: pending
**Area**: tooling

### Summary
Node `fetch` can fail against Luogu pages even when `curl -L` succeeds.

### Details
The AtCoder bank builder hit DNS failure in sandbox and then a Luogu redirect loop through Node/undici when escalated. Direct `curl -L --max-time 20` successfully retrieved the same page.

### Suggested Action
For Luogu public pages, keep a `curl` fallback in scraper scripts and parse the embedded `lentille-context` JSON.

### Metadata
- Source: error
- Related Files: scripts/build-luogu-atcoder-bank.mjs
- Tags: luogu, scraper, fetch, curl

---

## [ERR-20260606-001] ai_reference_solution_generation

**Logged**: 2026-06-06T00:00:00+08:00
**Priority**: high
**Status**: pending
**Area**: tooling

### Summary
The configured default AI endpoint cannot currently generate AtCoder C++ reference solutions from this environment.

### Details
`pnpm generate:atcoder-ai-solutions` reached the AI API after network escalation, but the endpoint returned `403 unsupported_country_region_territory`. The generator remains implemented, but needs a supported OpenAI-compatible base URL and key before it can produce sample-verified C++17 answers.

### Suggested Action
Set `ATCODER_AI_BASE_URL`, `ATCODER_AI_API_KEY`, and `ATCODER_AI_MODEL` to a reachable OpenAI-compatible provider, then run `ATCODER_AI_SOLUTION_LIMIT=<n> pnpm generate:atcoder-ai-solutions`.

### Metadata
- Source: error
- Related Files: scripts/generate-atcoder-ai-solutions.mjs
- Tags: atcoder, ai-solution, openai-compatible, api-region
