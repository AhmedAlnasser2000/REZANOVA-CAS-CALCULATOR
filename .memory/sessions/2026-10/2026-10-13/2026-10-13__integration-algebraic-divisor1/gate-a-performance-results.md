# Gate A performance observations

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

Backend, serial: two warm-ups and five measured samples per operation, fresh contexts/proof state. Fixture construction and JSON I/O are excluded. The unchanged 20-billion work / 1-trillion allocation profile applies. All observations completed; there is no timing assertion. Heap deltas are before/after observations affected by GC, not peak-memory bounds. Exact work/allocation counters are cumulative within each operation. Full sample data is in gate-a-performance-samples.json.

| Fixture | Operation | Median / min / max ms | Work | Allocation |
|---|---|---:|---:|---:|
| rational | construction | 13.23 / 12.70 / 13.53 | 616,967 | 6,241,691 |
| rational | constructionVerification | 8.24 / 6.17 / 8.78 | 317,180 | 3,195,859 |
| rational | riemannRoch | 51.03 / 49.13 / 60.23 | 2,095,000 | 19,628,923 |
| rational | riemannRochVerification | 18.12 / 14.26 / 20.34 | 679,499 | 6,492,860 |
| rational | principality | 140.36 / 138.41 / 144.41 | 5,691,720 | 52,924,490 |
| rational | verification | 32.57 / 31.05 / 34.19 | 1,289,826 | 12,070,729 |
| rational | encoding | 56.25 / 55.00 / 57.11 | 1,713,056 | 19,595,076 |
| rational | decoding | 129.64 / 125.73 / 145.65 | 5,050,686 | 46,503,634 |
| rational | riemannRochDecoding | 60.88 / 59.91 / 61.76 | 2,383,709 | 22,159,138 |
| elliptic | construction | 111.69 / 109.53 / 129.19 | 5,455,641 | 56,775,508 |
| elliptic | constructionVerification | 64.40 / 63.91 / 65.47 | 3,281,073 | 35,097,797 |
| elliptic | riemannRoch | 495.11 / 473.28 / 501.06 | 20,713,362 | 189,651,710 |
| elliptic | riemannRochVerification | 144.64 / 142.84 / 160.47 | 6,633,487 | 64,099,951 |
| elliptic | principality | 1461.89 / 1404.52 / 1585.45 | 54,308,785 | 492,404,322 |
| elliptic | verification | 317.56 / 268.00 / 340.89 | 11,598,797 | 107,870,379 |
| elliptic | encoding | 379.07 / 378.20 / 381.19 | 14,061,997 | 151,959,590 |
| elliptic | decoding | 1342.60 / 1302.51 / 1468.22 | 53,310,580 | 485,591,829 |
| elliptic | riemannRochDecoding | 866.80 / 716.50 / 873.66 | 26,820,346 | 252,449,174 |
| heightEightHiddenConstants | construction | 293.08 / 278.82 / 304.36 | 12,242,069 | 100,561,611 |
| heightEightHiddenConstants | constructionVerification | 250.99 / 249.69 / 258.01 | 10,733,513 | 91,902,800 |
| heightEightHiddenConstants | riemannRoch | 259.32 / 256.80 / 268.59 | 11,210,739 | 95,595,101 |
| heightEightHiddenConstants | riemannRochVerification | 254.36 / 250.91 / 259.40 | 10,900,204 | 92,974,669 |
| heightEightHiddenConstants | principality | 311.66 / 306.14 / 315.98 | 13,238,493 | 111,993,481 |
| heightEightHiddenConstants | verification | 268.03 / 265.27 / 269.37 | 11,281,360 | 95,864,918 |
| heightEightHiddenConstants | encoding | 372.50 / 370.00 / 387.07 | 13,695,014 | 132,036,553 |
| heightEightHiddenConstants | decoding | 986.58 / 965.13 / 1081.05 | 34,643,724 | 293,594,301 |
| heightEightHiddenConstants | riemannRochDecoding | 954.83 / 937.74 / 986.50 | 32,865,390 | 280,414,272 |

Principality artifact sizes: rational 18,458 bytes; elliptic 100,008 bytes; height-eight hidden constants 200,456 bytes. The elliptic fixture uses div(y-1) on y²=x³+1. The height-eight fixture preserves the hidden sqrt(2) constant field and linear upper extensions. Riemann–Roch replay is measured separately. Torsion measurements belong to Gate B, which has not activated.
