# Logarithmic rational decisions — serial observations

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

Node v24.19.0; CPU Intel(R) Core(TM) Ultra 7 265K. Serial two warm-ups and five measured runs per case/operation. Each operation has a fresh execution/proof context; every iteration constructs a fresh fixture. Fixture construction, JSON serialization/parsing and file I/O are outside operation timers. No heavy verification job overlapped this measurement run.

The unchanged profile is work 20 billion, cumulative allocation 1 trillion, integer bits 2,048 and degree 256, with tower 8 and artifact depth/nodes/bytes 64/100,000/16 MiB. No timing-sensitive acceptance target applies.

All fixtures use t=log x: polynomial=t^2, extraDegree=t/x, repeatedPole=1/(x*t^2), algebraicResidues=1/(x*(t^2+2)), nonconstantResidue=1/t, and polynomialObstruction=t/(x+1). The opt-in harness is `src/lib/symbolic-engine/integration/core/__tests__/logarithmic-rational-measurements.ts`; run it with `node --experimental-strip-types <harness> <output.json>`.

| Case | Operation | Median ms | Min ms | Max ms | Median work | Median cumulative allocation units |
|---|---|---:|---:|---:|---:|---:|
| polynomial | solving | 63.813 | 62.786 | 65.502 | 3,034,678 | 27,241,050 |
| polynomial | verification | 20.292 | 17.933 | 21.009 | 931,277 | 8,144,397 |
| polynomial | encoding | 25.250 | 24.530 | 27.065 | 1,237,424 | 10,475,143 |
| polynomial | decoding | 38.076 | 37.291 | 40.099 | 1,659,440 | 14,213,861 |
| extraDegree | solving | 46.214 | 44.707 | 48.845 | 2,132,337 | 19,627,564 |
| extraDegree | verification | 15.443 | 11.627 | 16.948 | 670,314 | 6,028,722 |
| extraDegree | encoding | 15.141 | 14.612 | 18.405 | 859,132 | 7,478,649 |
| extraDegree | decoding | 29.934 | 25.002 | 32.628 | 1,190,492 | 10,407,744 |
| repeatedPole | solving | 52.989 | 51.408 | 60.870 | 2,312,367 | 19,621,397 |
| repeatedPole | verification | 17.346 | 15.915 | 24.461 | 696,319 | 5,905,924 |
| repeatedPole | encoding | 13.891 | 13.175 | 19.304 | 759,512 | 6,205,632 |
| repeatedPole | decoding | 26.837 | 23.582 | 29.693 | 1,083,654 | 9,059,027 |
| algebraicResidues | solving | 1442.716 | 1395.860 | 1457.876 | 62,367,760 | 538,117,370 |
| algebraicResidues | verification | 348.809 | 329.070 | 379.153 | 15,849,331 | 137,586,285 |
| algebraicResidues | encoding | 565.061 | 519.519 | 582.995 | 24,235,678 | 207,674,765 |
| algebraicResidues | decoding | 682.691 | 659.734 | 726.270 | 29,103,311 | 249,578,275 |
| nonconstantResidue | solving | 34.460 | 27.288 | 40.171 | 1,412,865 | 11,919,933 |
| nonconstantResidue | verification | 8.985 | 7.079 | 16.094 | 387,670 | 3,263,862 |
| nonconstantResidue | encoding | 8.974 | 8.367 | 18.537 | 435,943 | 3,513,998 |
| nonconstantResidue | decoding | 14.365 | 12.165 | 18.560 | 670,375 | 5,635,308 |
| polynomialObstruction | solving | 25.678 | 22.165 | 29.622 | 1,321,897 | 13,689,645 |
| polynomialObstruction | verification | 7.541 | 5.932 | 16.846 | 365,100 | 3,639,797 |
| polynomialObstruction | encoding | 10.009 | 9.764 | 19.380 | 610,820 | 5,980,468 |
| polynomialObstruction | decoding | 17.578 | 16.035 | 22.836 | 963,069 | 9,410,545 |

Post-operation process RSS snapshots: 107.6–329.1 MiB; heap-used snapshots: 18.8–172.7 MiB. These include runtime/JIT, fixtures and previously retained samples; they are not per-operation peaks or allocated-byte totals.

Accounting units charge performed arithmetic, traversal and cumulative temporary storage. They are not live heap bytes. See serial-observations.json for each retained sample. These small-corpus observations are not a general speed guarantee.
