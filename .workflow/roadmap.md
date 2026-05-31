# GESP 题型分类与知识点对齐网站 Roadmap

## Roadmap Decisions

| # | Decision | Choice | Source |
|---|---|---|---|
| 1 | Scope | Complete product roadmap with MVP first | user |
| 2 | Strategy | Progressive: build source and classification foundation before UI expansion | analysis |
| 3 | MVP boundary | C++ 五级题型分类目录 | analysis |
| 4 | Primary interface | Classified catalog pages, not a search-first product | user |
| 5 | Quality gate | Every classification needs source evidence, confidence, and review status | analysis |

## Milestone 1: Source Foundation

Goal: 建立可信题源基础，让后续采集和分类有统一来源模型。

Depends on: none

### Phase 1: Source Registry

Build a registry for official sources, OJ mirrors, training lists, solution articles, and video explanations.

Requirements:

- Define source fields: `name`, `url`, `source_type`, `trust_level`, `crawl_strategy`, `license_status`, `can_store_full_text`, `notes`.
- Seed official GESP 大纲页、官方真题解析页、官方样题页。
- Seed 洛谷、zqiceberg、Hydro、AIJIE_OJ、CSPOJ、ACGO、东方博宜、信创计划、羽润编程 and blog sources.

Success criteria:

- At least 15 source seeds are represented.
- Official sources are clearly marked as canonical.
- Secondary sources are marked as practice, mirror, or auxiliary evidence.

### Phase 2: Official Source Ingestion

Discover official syllabus, true-question pages, sample-question pages, and linked PDFs.

Requirements:

- Parse official page indexes.
- Store discovered PDF URLs, page titles, publication date when available, and hash.
- Preserve raw metadata without classifying yet.

Success criteria:

- Official syllabus document is registered.
- Official true-question entries are listed by session.
- Official sample-question entries are listed separately.

## Milestone 2: Problem Ingestion

Goal: 把官方 PDF 和外部题源转成可对齐的题目数据。

Depends on: Milestone 1

### Phase 3: PDF Parser

Extract official problems from syllabus, sample, and true-question PDFs.

Requirements:

- Extract exam session, language, level, question type, question number, title, and page reference.
- Preserve source document hash and parser version.
- Store only metadata and short evidence snippets until copyright policy is settled.

Success criteria:

- C++ 五级 official PDFs can produce a structured problem list.
- Selection, judgment, and programming questions are differentiated.
- Extraction failures are logged for review.

### Phase 4: OJ Mirror Ingestion

Parse external practice and mirror sources.

Requirements:

- Ingest 洛谷题单 / 题库 entries.
- Ingest zqiceberg 五级 entries.
- Add adapters for selected OJ mirrors only after source registry policies are set.

Success criteria:

- Mirror entries include source URL, title, OJ ID, source type, and trust level.
- No mirror source is treated as official.
- Duplicate candidates are emitted for alignment.

### Phase 5: Canonical Problem Alignment

Merge duplicates into canonical GESP problem records.

Requirements:

- Match by session, level, title similarity, OJ ID, and statement hash when available.
- Keep all source versions attached to the canonical problem.
- Mark uncertain matches as `needs_review`.

Success criteria:

- A canonical problem can show all known source links.
- Duplicate and conflict candidates are reviewable.
- C++ 五级 has a usable canonical problem table.

## Milestone 3: Classification Engine

Goal: 为每道题生成等级、算法范畴、题型模板、知识点、证据和置信度。

Depends on: Milestone 2

### Phase 6: Level And Algorithm Domain Classification

Classify canonical problems by GESP level and broad algorithm domain.

Requirements:

- Official source determines level when available.
- Domain seed includes 数论、二分、链表、贪心、递归、分治、高精度、复杂度、排序/模拟。
- DP on 五级 items is treated as a conflict or auxiliary solution label, not official level-5 domain.

Success criteria:

- Every C++ 五级 canonical problem has at least one level label.
- Most programming problems receive a candidate algorithm domain.
- Out-of-level tags are detected and flagged.

### Phase 7: Problem Type And Knowledge Extraction

Map problems to exam-oriented problem types and fine-grained knowledge points.

Requirements:

- Implement seed templates: 二分答案判定型、质因数分解型、gcd/lcm 变形型、链表操作模拟型、排序关键字贪心型、复杂度判断型。
- Extract knowledge points from official syllabus terms, problem text, solution text, and code signals.
- Store evidence for each tag.

Success criteria:

- Each confirmed tag has source evidence.
- A level-5 taxonomy table can be generated from data.
- Knowledge-point coverage can be counted per algorithm domain.

### Phase 8: Conflict And Confidence Model

Handle source disagreement and uncertain classifications.

Requirements:

- Define `syllabus_fit`: `exact`, `adjacent`, `out_of_level`, `community_inferred`, `disputed`, `needs_review`.
- Define confidence scoring from official match, problem evidence, code signal, community consensus, and reviewer confirmation.
- Route conflicts to review queue.

Success criteria:

- Classification conflicts are visible, not overwritten.
- Confidence scores are reproducible.
- Review queue receives disputed and low-confidence items.

## Milestone 4: Classified Catalog UI

Goal: 把数据呈现为分类目录，而不是搜索页。

Depends on: Milestone 3

### Phase 9: Catalog Information Architecture

Design and implement catalog routes.

Requirements:

- Level directory: level -> algorithm domains -> problem types.
- Algorithm-domain page: covered levels, problem types, representative problems, knowledge tree.
- Problem-type page: level fit, knowledge points, common pitfalls, problem list.

Success criteria:

- Users can browse from 五级 to 数论 / 二分 / 链表 and see related problem types.
- Catalog pages do not depend on search to be useful.
- Counts and evidence summaries are shown.

### Phase 10: Problem Detail And Source Alignment

Show canonical problem details and source mapping.

Requirements:

- Display official source, mirror links, solution references, and trust levels.
- Display algorithm domains, problem types, knowledge points, confidence, and review status.
- Display conflict warnings such as out-of-level DP tags.

Success criteria:

- Each problem detail page answers: 几级、哪个算法范畴、哪个题型、哪些知识点、证据是什么。
- Source alignment is visible.
- Copyright-sensitive content is not over-displayed.

### Phase 11: Level 5 Catalog Release

Release the first usable C++ 五级 catalog.

Requirements:

- Publish C++ 五级 algorithm-domain pages.
- Publish C++ 五级 problem-type pages.
- Publish C++ 五级 knowledge-point coverage table.

Success criteria:

- The catalog includes official and selected mirror sources.
- At least the seed 五级 categories are represented.
- Users can browse problems by level, algorithm domain, and problem type.

## Milestone 5: Review Workflow

Goal: 建立人工复核闭环，提高分类可信度。

Depends on: Milestone 4

### Phase 12: Review Queue

Build a workflow for confirming, rejecting, and merging classification records.

Requirements:

- Review low-confidence tags.
- Review duplicate candidates.
- Review source conflicts and out-of-level labels.

Success criteria:

- Reviewer actions update `review_status`.
- Rejected tags remain auditable.
- Duplicate merges preserve source history.

### Phase 13: Audit And Export

Make classification decisions traceable and reusable.

Requirements:

- Keep review event history.
- Export canonical problems, tags, evidence, and source mappings.
- Support rollback for mistaken merges or classification changes.

Success criteria:

- Every manual decision has an audit event.
- Dataset can be exported for backup or external review.
- Data quality metrics are visible.

## Milestone 6: Expansion

Goal: 在五级 MVP 验证后扩展到更多等级、语言和学习路径。

Depends on: Milestone 5

### Phase 14: Multi-Level Expansion

Extend from C++ 五级 to more GESP levels.

Requirements:

- Add levels 1-4 and 6-8 incrementally.
- Reuse source registry, parser, canonical alignment, and classification engine.
- Adjust taxonomy for DP in level 6/7.

Success criteria:

- New levels can be added without changing the core data model.
- Cross-level algorithm-domain pages show correct level boundaries.
- Out-of-level warnings remain correct.

### Phase 15: Python And Learning Paths

Add Python sources and learning-path outputs.

Requirements:

- Ingest Python official PDFs where available.
- Align shared concepts across C++ and Python.
- Generate learning paths from weak knowledge points and prerequisite relations.

Success criteria:

- Python entries are separate but comparable with C++.
- Knowledge-point coverage supports learning recommendations.
- The system remains source-evidence-first.

## Roadmap Risks

- Copyright and source terms may constrain full-text storage.
- PDF parsing can fail on layout changes and scanned documents.
- OJ and blog labels can conflict with official syllabus.
- Manual review is required for high-trust output; fully automatic classification is not enough.

## Next Step

Run `$maestro-plan 1` or `$maestro-plan --from roadmap:RDM-20260531-gesp-classification` to break Milestone 1 into implementation tasks.
