# Serial limited-integration observations

Node v24.19.0; CPU Intel(R) Core(TM) Ultra 7 265K. Two warm-ups and five measured samples per case/operation. Every operation uses a fresh execution/proof context. Fixtures, JSON parsing and file I/O are excluded. Encoding includes mandatory verification; decoding includes full evidence replay.

Final samples were taken serially after the concurrent broad verification job finished and before the retained core run. No timing-sensitive target or assertion applies.

Work/allocation are cumulative execution-accounting units, not bytes. RSS and heap-used are process observations after each operation, not isolated allocation deltas or peak memory. Raw samples and the complete unchanged limits are in serial-observations.json.

| Case | Operation | Median ms | Min–max ms | Work | Allocation |
|---|---|---:|---:|---:|---:|
| emptyPolynomial | solving | 4.140 | 3.834–5.042 | 224,220 | 2,359,917 |
| emptyPolynomial | verification | 2.110 | 1.456–2.120 | 97,691 | 1,006,507 |
| emptyPolynomial | encoding | 2.424 | 1.931–2.632 | 122,353 | 1,205,504 |
| emptyPolynomial | decoding | 2.998 | 2.933–3.522 | 147,510 | 1,479,244 |
| unique | solving | 7.432 | 6.330–8.748 | 393,715 | 4,422,871 |
| unique | verification | 2.368 | 2.150–3.756 | 146,182 | 1,591,363 |
| unique | encoding | 2.878 | 2.757–3.684 | 178,238 | 1,797,592 |
| unique | decoding | 4.488 | 3.630–4.870 | 210,419 | 2,137,107 |
| dependent | solving | 11.768 | 11.443–12.544 | 617,023 | 6,635,325 |
| dependent | verification | 3.963 | 3.726–6.208 | 241,572 | 2,485,536 |
| dependent | encoding | 5.615 | 4.628–6.980 | 299,121 | 2,783,258 |
| dependent | decoding | 7.772 | 5.935–10.634 | 349,385 | 3,290,722 |
| mixedPoles | solving | 100.148 | 98.817–107.578 | 5,874,798 | 69,256,343 |
| mixedPoles | verification | 49.824 | 45.265–57.631 | 2,749,768 | 32,266,667 |
| mixedPoles | encoding | 56.723 | 52.084–59.704 | 3,272,116 | 38,421,117 |
| mixedPoles | decoding | 69.604 | 65.898–71.573 | 4,003,499 | 46,976,044 |
| impossible | solving | 12.215 | 12.168–16.467 | 797,097 | 9,474,975 |
| impossible | verification | 4.711 | 4.514–5.031 | 305,790 | 3,592,313 |
| impossible | encoding | 5.970 | 5.691–6.503 | 379,856 | 4,219,495 |
| impossible | decoding | 12.836 | 8.335–13.460 | 493,613 | 5,491,375 |

Observed process RSS: 90.0–185.1 MiB; heap used: 11.1–73.0 MiB.

All five corpora completed all four operations under work 20 billion, allocation 1 trillion, integer bits 2,048 and degree 256; artifacts used depth 64, nodes 100,000 and bytes 16 MiB. Small-corpus observations do not imply a general runtime bound.

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
