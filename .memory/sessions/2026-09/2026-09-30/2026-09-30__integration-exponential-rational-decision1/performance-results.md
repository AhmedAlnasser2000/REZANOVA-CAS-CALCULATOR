# Serial resource observations — 2026-10-01

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



One warm-up and three measured runs per case/operation, fresh contexts and proof state. Same Node/machine/profile; no competing heavy verification process. Fixture construction and JSON parsing are outside timers. No speed target.

Node `v24.19.0`; CPU `Intel(R) Core(TM) Ultra 7 265K`. Work/allocation are cumulative charged units, not free RAM. RSS and heap observations are preserved separately in measurements.json.

| Case | Operation | Median ms | Min–max ms | Median work | Median allocation |
|---|---|---:|---:|---:|---:|
| affine | construction | 259.49 | 259.38–286.59 | 11,822,815 | 97,615,309 |
| affine | verification | 65.83 | 60.71–65.91 | 2,863,851 | 23,659,842 |
| affine | encoding | 90.42 | 85.92–90.45 | 4,004,612 | 32,519,993 |
| affine | decoding | 145.03 | 142.80–151.95 | 6,374,977 | 51,956,282 |
| repeated | construction | 619.66 | 613.97–624.63 | 28,357,216 | 255,240,568 |
| repeated | verification | 180.10 | 179.81–187.40 | 8,316,242 | 75,680,155 |
| repeated | encoding | 210.74 | 203.24–211.79 | 9,468,305 | 84,550,783 |
| repeated | decoding | 289.39 | 288.53–289.87 | 12,599,755 | 110,222,261 |
| algebraicResidues | construction | 1400.63 | 1400.53–1427.15 | 60,929,884 | 480,056,336 |
| algebraicResidues | verification | 348.33 | 333.91–349.37 | 14,888,730 | 117,290,113 |
| algebraicResidues | encoding | 527.38 | 526.20–531.09 | 22,961,407 | 179,626,027 |
| algebraicResidues | decoding | 662.22 | 646.67–665.75 | 27,949,138 | 219,779,011 |
| nonconstantResidue | construction | 103.02 | 98.20–104.57 | 4,172,743 | 38,883,263 |
| nonconstantResidue | verification | 15.93 | 15.69–24.64 | 880,427 | 7,880,116 |
| nonconstantResidue | encoding | 16.89 | 16.69–23.32 | 925,011 | 7,994,913 |
| nonconstantResidue | decoding | 34.35 | 25.94–34.71 | 1,395,837 | 12,302,584 |
| laurentObstruction | construction | 225.94 | 222.13–231.04 | 10,055,073 | 82,996,801 |
| laurentObstruction | verification | 59.12 | 55.03–59.21 | 2,540,516 | 20,858,972 |
| laurentObstruction | encoding | 75.52 | 71.95–77.87 | 3,465,949 | 28,044,255 |
| laurentObstruction | decoding | 121.00 | 119.49–123.01 | 5,123,949 | 41,702,292 |
| rebasedLaurent | construction | 70.94 | 66.42–74.24 | 3,138,166 | 25,672,304 |
| rebasedLaurent | verification | 24.93 | 19.09–27.25 | 1,027,571 | 8,266,903 |
| rebasedLaurent | encoding | 39.91 | 39.13–40.48 | 1,792,628 | 13,919,708 |
| rebasedLaurent | decoding | 48.67 | 48.62–50.04 | 2,193,645 | 17,137,910 |
| rationalRootLogs | construction | 474.38 | 472.73–481.88 | 22,470,925 | 231,887,333 |
| rationalRootLogs | verification | 94.61 | 86.69–95.75 | 4,512,743 | 45,808,998 |
| rationalRootLogs | encoding | 170.70 | 169.00–172.00 | 8,323,313 | 84,919,278 |
| rationalRootLogs | decoding | 233.86 | 231.84–237.13 | 10,804,692 | 109,589,174 |

Harness: `src/lib/symbolic-engine/integration/core/__tests__/exponential-rational-measurements.ts` (shared across the two ordered gates; delivered with the decision gate). Results are observations, not general timing guarantees.

## Observed coefficient-growth limitation

An exploratory constructed primitive used g=t+x and v=1/((x+1)g²), with input D(v)+D(g)/g. Under the unchanged 2,048-bit profile, r=x² and r=1/x both exhausted at integer-product-bits (about 9.9 s and 10.7 s in a focused correctness run). The shifted linear r=x+1 variant succeeded in about 101 s. These exploratory times include fixture creation and are not comparable to the serial timer table. No unsuccessful case produced a non-elementarity decision. The passing nonlinear/rational-exponent fixtures use g=t+1 and v=1/g²; coefficient-dependent poles and reducible residue moduli are tested separately.

The remaining bottleneck is growth of intermediate rational-polynomial coefficients in general fraction normalization/GCD and repeated proof arithmetic. No execution limit was raised, mathematical check removed, or hidden class restriction introduced. A focused arithmetic/performance gate can investigate this before UI adoption.
