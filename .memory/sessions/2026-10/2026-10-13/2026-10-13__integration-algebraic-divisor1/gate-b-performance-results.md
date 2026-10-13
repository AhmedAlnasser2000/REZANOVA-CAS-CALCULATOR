# Gate B performance observations

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-6
- verified_by_agent_family: sol
- attribution_basis: live

## Method

Backend, serial, two discarded warm-ups and five measured samples per operation. Each run uses fresh execution/proof state and cumulative nested accounting. Native fixture setup and JSON/file I/O are outside the timings. `construction` means certified good-reduction construction, not native field construction; `verification`, `encoding` and `decoding` concern the complete torsion decision. `reductionDecoding` separately measures good-reduction replay. The native Riemann–Roch/principality operations are recorded separately. There are no timing-sensitive assertions. All sampled operations complete under the unchanged profile.

Work and allocation are exact engine accounting units; allocation is not bytes of RAM. Heap deltas are before/after `heapUsed` observations affected by garbage collection and may be negative. They are not peak-memory bounds. Maximum RSS is for the whole Vitest worker including fixture construction and warm-ups; it cannot be assigned to a single operation. Raw samples and process memory are in [gate-b-performance-samples.json](gate-b-performance-samples.json).

| Fixture | Operation | Median / min / max ms | Work per run | Allocation per run |
|---|---|---:|---:|---:|
| rational | construction | 52.44 / 44.43 / 53.85 | 2,149,516 | 19,585,471 |
| rational | constructionVerification | 12.95 / 12.43 / 17.41 | 600,160 | 5,635,666 |
| rational | riemannRoch | 50.57 / 43.35 / 51.79 | 2,115,801 | 19,842,932 |
| rational | principality | 136.36 / 134.36 / 154.12 | 5,751,373 | 53,538,742 |
| rational | torsion | 1433.01 / 1421.54 / 1448.13 | 43,996,200 | 310,590,761 |
| rational | verification | 256.25 / 252.74 / 263.69 | 7,908,991 | 56,549,703 |
| rational | encoding | 1253.78 / 1230.54 / 1267.84 | 35,023,810 | 290,367,270 |
| rational | decoding | 682.07 / 658.47 / 743.27 | 21,187,996 | 152,696,501 |
| rational | reductionDecoding | 47.02 / 39.80 / 48.17 | 1,818,747 | 16,686,089 |
| ellipticOrderTwo | construction | 1442.64 / 1427.02 / 1481.70 | 54,348,995 | 489,647,636 |
| ellipticOrderTwo | constructionVerification | 304.85 / 298.25 / 321.95 | 11,615,308 | 108,958,125 |
| ellipticOrderTwo | riemannRoch | 312.59 / 301.51 / 329.44 | 12,002,687 | 114,275,563 |
| ellipticOrderTwo | principality | 368.45 / 360.65 / 372.81 | 13,720,134 | 129,237,116 |
| ellipticOrderTwo | torsion | 25716.18 / 24863.19 / 26140.36 | 710,764,157 | 5,262,116,347 |
| ellipticOrderTwo | verification | 3247.51 / 3215.15 / 3292.27 | 94,078,733 | 707,849,275 |
| ellipticOrderTwo | encoding | 13285.70 / 13193.84 / 13429.53 | 399,927,684 | 3,342,321,194 |
| ellipticOrderTwo | decoding | 7782.66 / 7702.15 / 7846.00 | 258,098,179 | 1,977,756,037 |
| ellipticOrderTwo | reductionDecoding | 1085.67 / 1065.74 / 1122.49 | 40,478,443 | 382,514,042 |
| heightEightHiddenConstants | construction | 394.61 / 382.23 / 412.72 | 14,058,657 | 115,341,953 |
| heightEightHiddenConstants | constructionVerification | 305.53 / 303.13 / 316.99 | 11,137,231 | 94,985,157 |
| heightEightHiddenConstants | riemannRoch | 312.83 / 309.20 / 323.55 | 11,221,370 | 95,718,393 |
| heightEightHiddenConstants | principality | 373.35 / 350.77 / 392.26 | 13,268,233 | 112,312,692 |
| heightEightHiddenConstants | torsion | 319.30 / 315.95 / 333.89 | 11,555,104 | 97,861,875 |
| heightEightHiddenConstants | verification | 301.36 / 291.83 / 317.75 | 10,905,773 | 93,039,770 |
| heightEightHiddenConstants | encoding | 1374.28 / 1353.68 / 1403.54 | 39,894,422 | 364,104,166 |
| heightEightHiddenConstants | decoding | 707.61 / 691.34 / 732.91 | 22,330,032 | 188,948,397 |
| heightEightHiddenConstants | reductionDecoding | 1142.78 / 969.27 / 1302.24 | 33,730,323 | 286,309,464 |

## Fixtures, stored sizes and memory

| Fixture | Request | Decision | Torsion bytes | Good-reduction bytes | Heap-delta min / max bytes across samples |
|---|---|---|---:|---:|---:|
| rational | div(x) on Q(x) | torsion, order 1 | 29,510 | 15,312 | -260,592,432 / 93,708,208 |
| ellipticOrderTwo | (0,0)-O on y²=x³-x | torsion, order 2 | 138,451 | 80,033 | -435,857,072 / 256,186,648 |
| heightEightHiddenConstants | zero divisor; y²=2x² with linear upper extensions to height eight | torsion, order 1 | 133,502 | 139,490 | -389,017,544 / 75,460,480 |

Worker maximum RSS: 1,000,596 KiB (977.14 MiB). This includes setup, earlier operations, warm-ups and garbage-collector retention. The height-eight sampled fixture has total function-field degree two; the separate total-degree-four height-eight acceptance fixture also passes complete fresh replay.

Opt-in serial command: `CALCWIZ_DIVISOR_B_MEASURE=1 npx vitest run src/lib/symbolic-engine/integration/core/algebraic-divisor-b-measurements.test.ts --maxWorkers=2 --reporter=verbose`. One test/file passes; 484.92 s overall, including excluded setup and warm-ups.

## Additional order-29 acceptance observation

This is one complete acceptance run, not the two-warm-up/five-sample benchmark. It exercises the sourced genus-two infinity divisor, exact least order, independent quadratic-conjugation/Pell norm, and producer-disabled positive replay. Data is in [gate-b-order29-observation.json](gate-b-order29-observation.json).

| Stage | Milliseconds | Work | Allocation |
|---|---:|---:|---:|
| torsion | 289513.00 | 7,047,125,096 | 236,662,625,298 |
| verification | 32483.85 | 904,671,423 | 28,603,827,450 |
| encoding | 142169.41 | 4,153,137,460 | 173,294,409,706 |
| decoding | 89956.39 | 2,960,474,208 | 140,567,471,401 |

Stored artifact: 791,876 bytes. All operations remain below 20 billion work and 1 trillion cumulative allocation, with the unchanged bit/degree/height/artifact limits. The successful decision and replay do not depend on a small-multiple search.
