# Serial algebraic-field observations

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


Two warm-ups and five samples per operation, fresh proof state. Fixture construction and file I/O are excluded. Measurements have no timing-sensitive threshold.

## Gate A — backend

| Operation | Median ms | Min ms | Max ms | Work | Allocation |
|---|---:|---:|---:|---:|---:|
| construction | 10.997 | 9.895 | 11.286 | 503586 | 5280160 |
| factorization | 112.428 | 110.079 | 122.283 | 5440724 | 60834269 |
| differentiation | 4.844 | 4.689 | 8.641 | 242657 | 2499332 |
| derivativeVerification | 2.475 | 2.436 | 5.720 | 123955 | 1189973 |
| verification | 17.923 | 14.506 | 18.882 | 836173 | 9779219 |
| encoding | 23.166 | 21.667 | 23.485 | 1150180 | 10969005 |
| decoding | 32.378 | 31.278 | 34.383 | 1377257 | 13336393 |

Fixture: Q(x)[a]/(a²-x), factoring z²-x; artifact 219774 bytes.

## Gate B — backend

| Fixture | Constants degree | Artifact bytes | Certification ms | Verification ms | Encoding ms | Decoding ms |
|---|---:|---:|---:|---:|---:|---:|
| rational | 1 | 6930 | 6.381 | 2.108 | 4.320 | 6.656 |
| quadratic | 1 | 23313 | 70.155 | 20.231 | 29.630 | 44.868 |
| hiddenConstant | 2 | 39558 | 119.154 | 31.178 | 46.496 | 65.524 |
| nestedConstant | 2 | 192244 | 1771.975 | 344.970 | 480.319 | 727.975 |
| cubic | 1 | 66002 | 1231.642 | 270.855 | 310.655 | 499.665 |
| heightEight | 2 | 190310 | 1032.851 | 257.384 | 362.378 | 547.122 |

### Complete ranges and accounting

| Fixture / operation | Min ms | Max ms | Work | Allocation | Heap delta min bytes | Heap delta max bytes |
|---|---:|---:|---:|---:|---:|---:|
| rational / certification | 6.304 | 9.521 | 318203 | 3165844 | -25100176 | 8246160 |
| rational / verification | 2.073 | 2.251 | 103524 | 1002865 | 2817960 | 2959896 |
| rational / encoding | 4.171 | 5.275 | 149132 | 1603583 | -26817800 | 6459600 |
| rational / decoding | 6.454 | 8.985 | 261095 | 2452841 | -24283768 | 9288320 |
| quadratic / certification | 67.906 | 72.322 | 3014213 | 30806428 | -15295256 | 17806056 |
| quadratic / verification | 14.725 | 26.137 | 686346 | 6718232 | -47718032 | 20337504 |
| quadratic / encoding | 26.397 | 29.824 | 930604 | 10284791 | -28062384 | 39435376 |
| quadratic / decoding | 44.428 | 46.985 | 1566845 | 14982433 | -12533904 | -11528168 |
| hiddenConstant / certification | 118.875 | 119.337 | 5640279 | 59110698 | 2089824 | 2146936 |
| hiddenConstant / verification | 24.750 | 31.980 | 1299321 | 13115823 | -34518984 | 33878848 |
| hiddenConstant / encoding | 45.630 | 47.064 | 1672715 | 18529788 | -3231080 | -2955936 |
| hiddenConstant / decoding | 64.970 | 73.742 | 2613291 | 25675831 | -51596272 | 17048088 |
| nestedConstant / certification | 1722.451 | 1891.462 | 77922887 | 845494055 | -72556816 | 65321160 |
| nestedConstant / verification | 335.530 | 347.356 | 14956803 | 158138580 | -9104512 | 60069880 |
| nestedConstant / encoding | 476.750 | 482.934 | 17917327 | 205764651 | -23849184 | 43442416 |
| nestedConstant / decoding | 721.899 | 753.439 | 24168980 | 246618864 | -180806816 | 22131792 |
| cubic / certification | 1207.104 | 1244.500 | 58487774 | 697893555 | 9140648 | 10063736 |
| cubic / verification | 267.962 | 300.808 | 13182873 | 156969905 | -33211176 | 36774720 |
| cubic / encoding | 310.260 | 332.952 | 14009350 | 169619898 | -30523976 | 33463160 |
| cubic / decoding | 483.988 | 532.307 | 20012574 | 233589348 | -18333928 | 51290760 |
| heightEight / certification | 999.150 | 1123.299 | 42298480 | 420987937 | -19632688 | 46814432 |
| heightEight / verification | 251.295 | 261.382 | 9857799 | 87117817 | -23002832 | 44527696 |
| heightEight / encoding | 357.663 | 368.148 | 12100141 | 120694710 | -32123600 | 34730608 |
| heightEight / decoding | 541.151 | 572.623 | 18843699 | 168442760 | -220480848 | 69553280 |

Rational, quadratic, hidden scaled root, nested b/a, cubic and height-eight fixtures all complete under the unchanged profile. Height-eight uses one quadratic and six linear extensions, keeping total degree two; it is not a claim that every degree-256 extension at height eight completes within the resource profile.

Work/allocation counters are cumulative charged units, not bytes. Heap deltas are observations affected by GC, including negative deltas; they do not establish a peak-memory bound. Complete five-sample data are retained in the separate JSON files.

The first height-eight constant check took about 55 seconds. Embedded parent elements now use parent derivative evidence without an unused generator tangent. Successful checks are reused only for the exact immutable proof, expected owner, verification rule and bounds within a fresh operation, with retention charges and unconditional cleanup. The final height-eight certification median is 1.033 seconds and decoding 0.547 seconds. Existing arithmetic interfaces and artifact formats remain unchanged.
