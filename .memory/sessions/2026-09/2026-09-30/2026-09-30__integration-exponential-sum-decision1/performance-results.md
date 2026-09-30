# Finite exponential sum measurements

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

## Method

Node v24.19.0; CPU Intel(R) Core(TM) Ultra 7 265K. One warm-up, three measured runs, serial, fresh execution state for every operation. Fixture construction, JSON parsing and I/O are excluded. Explicit arithmetic/artifact limits are recorded in measurements.json. No speed target or comparison with the single-product API.

Elapsed values below are medians in milliseconds; raw samples include min/max spread, work/allocation and process RSS/heap. Cumulative allocation is not bytes of resident memory.

| Case | Normalize | Integrate | Verify | Encode | Decode |
| --- | ---: | ---: | ---: | ---: | ---: |
| zero | 0.008 | 1.009 | 0.484 | 0.588 | 1.128 |
| rational | 0.011 | 73.071 | 10.567 | 21.710 | 34.023 |
| mixed | 0.063 | 116.994 | 25.830 | 47.345 | 66.855 |
| shifted | 0.040 | 19.301 | 6.620 | 13.409 | 17.391 |
| rationalExponent | 0.045 | 32.885 | 13.437 | 22.971 | 27.236 |
| canceled | 0.501 | 5.836 | 2.316 | 2.977 | 26.834 |
| firstObstruction | 0.043 | 8.003 | 2.478 | 3.781 | 6.819 |
| laterObstruction | 0.097 | 19.256 | 5.625 | 7.188 | 11.387 |

## Per-operation accounting and spread

| Case / operation | Min–max ms | Work | Cumulative allocation |
| --- | ---: | ---: | ---: |
| zero / normalization | 0.007–0.011 | 73 | 96 |
| zero / integration | 0.896–1.455 | 40,373 | 377,189 |
| zero / verification | 0.436–0.556 | 15,542 | 138,908 |
| zero / encoding | 0.548–0.782 | 24,684 | 184,120 |
| zero / decoding | 1.010–1.237 | 31,446 | 240,186 |
| rational / normalization | 0.011–0.013 | 152 | 297 |
| rational / integration | 72.922–77.001 | 4,261,055 | 51,446,955 |
| rational / verification | 10.547–11.036 | 633,434 | 7,592,229 |
| rational / encoding | 21.054–22.427 | 1,269,670 | 14,975,038 |
| rational / decoding | 34.007–34.739 | 1,888,490 | 22,271,523 |
| mixed / normalization | 0.063–0.075 | 2,333 | 8,355 |
| mixed / integration | 116.590–124.614 | 5,765,744 | 63,861,712 |
| mixed / verification | 25.006–27.758 | 1,239,963 | 12,347,598 |
| mixed / encoding | 46.472–47.927 | 2,364,653 | 23,312,387 |
| mixed / decoding | 61.911–67.808 | 3,129,626 | 31,750,689 |
| shifted / normalization | 0.039–0.042 | 1,427 | 5,513 |
| shifted / integration | 16.298–19.866 | 900,994 | 8,206,476 |
| shifted / verification | 5.728–10.296 | 315,231 | 2,692,583 |
| shifted / encoding | 10.093–14.805 | 560,957 | 4,543,227 |
| shifted / decoding | 17.249–17.780 | 671,393 | 5,511,901 |
| rationalExponent / normalization | 0.043–0.047 | 1,509 | 5,655 |
| rationalExponent / integration | 31.601–35.918 | 1,497,391 | 13,442,726 |
| rationalExponent / verification | 9.438–13.692 | 541,005 | 4,565,447 |
| rationalExponent / encoding | 21.732–23.877 | 1,019,867 | 8,266,472 |
| rationalExponent / decoding | 26.591–32.129 | 1,164,191 | 9,444,113 |
| canceled / normalization | 0.478–0.505 | 23,589 | 110,482 |
| canceled / integration | 4.473–9.028 | 258,112 | 2,270,438 |
| canceled / verification | 2.203–6.718 | 121,888 | 1,055,949 |
| canceled / encoding | 2.864–3.050 | 181,446 | 1,139,469 |
| canceled / decoding | 21.198–27.967 | 969,840 | 9,380,073 |
| firstObstruction / normalization | 0.042–0.045 | 1,711 | 6,081 |
| firstObstruction / integration | 6.570–8.351 | 366,827 | 3,346,492 |
| firstObstruction / verification | 2.295–5.135 | 131,728 | 1,133,669 |
| firstObstruction / encoding | 3.691–3.803 | 200,910 | 1,600,024 |
| firstObstruction / decoding | 6.792–6.883 | 368,415 | 3,302,996 |
| laterObstruction / normalization | 0.057–0.099 | 2,366 | 8,387 |
| laterObstruction / integration | 17.836–25.096 | 665,954 | 6,205,613 |
| laterObstruction / verification | 4.323–12.842 | 220,266 | 1,912,105 |
| laterObstruction / encoding | 6.900–7.233 | 349,297 | 2,842,331 |
| laterObstruction / decoding | 10.201–13.600 | 499,610 | 4,299,822 |

Root-log rational decisions account for much of the mixed positive fixture cost. A negative component avoids rational integration entirely. Cancellation is inexpensive mathematically, but full original-input artifact replay still validates every stored term and condition. These observations do not establish performance for arbitrary degrees, term counts or coefficient sizes.

Reproduce: `node --experimental-strip-types src/lib/symbolic-engine/integration/core/__tests__/exponential-sum-measurements.ts <output.json>`.
