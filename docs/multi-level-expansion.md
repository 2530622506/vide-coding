# Multi-Level Expansion

M6 Phase 14 verifies that the C++ catalog has expanded beyond the original level-5 MVP while reusing the same source, alignment, classification, review, and catalog read models.

## Coverage

Current official plus supplemental C++ records:

| Level | Records |
|---|---:|
| 1 | 55 |
| 2 | 55 |
| 3 | 52 |
| 4 | 53 |
| 5 | 53 |
| 6 | 49 |
| 7 | 47 |
| 8 | 47 |

Total: 411 records.

## Taxonomy Boundary

- Level 5 exposes zero DP tags.
- Level 6/7 exposes DP taxonomy where collected source evidence supports it.
- Level 6/7 DP tags are not marked `out_of_level`; they remain review-gated through `needs_review` or `community_inferred` evidence where appropriate.

## Verification

```bash
npm run build:api
npm run validate:multi-level-expansion
```

The validator checks:

- levels 1-8 exist in the combined official and supplemental dataset;
- each record uses the same canonical C++ model shape;
- catalog service can load every level page;
- level-5 DP remains absent;
- level-6/7 DP taxonomy is present and not flagged as out of level.
