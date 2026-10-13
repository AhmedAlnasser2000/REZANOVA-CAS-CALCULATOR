# Gate A serial observations

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

Backend, serial, two discarded warm-ups and five measured samples per operation. Every sample starts with a new execution context and proof scope. Native fixture setup, JSON conversion and file I/O are excluded. `construction` measures curve construction against its already certified actual constants; `relativeConstruction` and `constantBaseChange` measure the auxiliary constant infrastructure separately. No timing-sensitive assertion is used. All observations complete under the unchanged profile.

Work and allocation are engine accounting units; cumulative allocation is not RAM bytes. Heap/RSS values are endpoint observations, not peak bounds. Deltas may be negative because of garbage collection, and RSS includes the worker, fixture setup and warm-ups. Raw samples are in [gate-a-performance-samples.json](gate-a-performance-samples.json) and [gate-a-primitive-performance-samples.json](gate-a-primitive-performance-samples.json).

| Fixture | Operation | Median / min / max ms | Work per run | Allocation per run |
|---|---|---:|---:|---:|
| rationalRepeatedPole | construction | 16.37 / 11.87 / 18.94 | 619,750 | 6,270,496 |
| rationalRepeatedPole | reduction | 546.95 / 527.12 / 559.28 | 23,626,424 | 222,636,319 |
| rationalRepeatedPole | reductionVerification | 108.83 / 96.53 / 109.75 | 4,466,871 | 42,243,343 |
| rationalRepeatedPole | reductionEncoding | 581.10 / 564.59 / 587.56 | 20,177,045 | 203,955,256 |
| rationalRepeatedPole | reductionDecoding | 285.41 / 282.26 / 289.67 | 12,648,417 | 118,462,426 |
| rationalRepeatedPole | exactSolving | 398.12 / 390.99 / 401.99 | 17,018,429 | 170,016,609 |
| rationalRepeatedPole | exactVerification | 67.94 / 66.82 / 68.53 | 3,106,596 | 31,049,708 |
| rationalRepeatedPole | exactEncoding | 419.26 / 410.92 / 421.92 | 16,053,154 | 165,322,516 |
| rationalRepeatedPole | exactDecoding | 272.61 / 271.80 / 285.67 | 11,489,295 | 114,278,166 |
| ramifiedRepeatedPole | construction | 73.87 / 73.42 / 85.43 | 2,898,201 | 27,877,966 |
| ramifiedRepeatedPole | reduction | 1125.72 / 1075.79 / 1205.99 | 41,981,057 | 377,284,073 |
| ramifiedRepeatedPole | reductionVerification | 223.30 / 209.34 / 227.28 | 8,313,083 | 74,518,658 |
| ramifiedRepeatedPole | reductionEncoding | 1085.02 / 1070.28 / 1104.70 | 37,382,037 | 354,878,504 |
| ramifiedRepeatedPole | reductionDecoding | 667.87 / 658.44 / 687.60 | 24,422,777 | 216,094,337 |
| ramifiedRepeatedPole | exactSolving | 1388.28 / 1350.35 / 1504.45 | 48,144,361 | 433,158,414 |
| ramifiedRepeatedPole | exactVerification | 251.57 / 230.51 / 258.97 | 8,385,172 | 74,900,021 |
| ramifiedRepeatedPole | exactEncoding | 1251.78 / 1234.73 / 1284.99 | 43,364,169 | 408,538,883 |
| ramifiedRepeatedPole | exactDecoding | 837.43 / 817.03 / 855.74 | 29,728,337 | 261,430,618 |
| cubic | construction | 855.74 / 848.86 / 865.36 | 34,310,432 | 368,556,579 |
| cubic | reduction | 39908.99 / 39195.59 / 43250.54 | 1,292,146,757 | 12,848,939,730 |
| cubic | reductionVerification | 6423.58 / 6400.40 / 7211.16 | 200,745,393 | 2,084,081,880 |
| cubic | reductionEncoding | 26563.43 / 26048.81 / 27304.65 | 906,357,961 | 9,363,556,043 |
| cubic | reductionDecoding | 19405.81 / 19303.79 / 20065.17 | 668,888,363 | 6,766,761,411 |
| cubic | exactSolving | 14897.34 / 14590.02 / 15687.64 | 468,483,061 | 4,664,868,446 |
| cubic | exactVerification | 2536.07 / 2520.51 / 2588.11 | 88,210,922 | 899,120,494 |
| cubic | exactEncoding | 12438.71 / 12312.91 / 12473.10 | 430,222,644 | 4,382,743,038 |
| cubic | exactDecoding | 10241.86 / 9694.01 / 10450.14 | 324,495,348 | 3,242,528,292 |
| hiddenConstants | construction | 59.21 / 56.28 / 68.69 | 2,515,563 | 25,336,509 |
| hiddenConstants | reduction | 642.63 / 624.32 / 654.91 | 23,542,144 | 225,620,252 |
| hiddenConstants | reductionVerification | 126.53 / 123.91 / 128.99 | 5,241,977 | 50,748,500 |
| hiddenConstants | reductionEncoding | 719.43 / 697.80 / 723.87 | 24,194,568 | 244,528,206 |
| hiddenConstants | reductionDecoding | 423.08 / 402.97 / 441.51 | 15,719,945 | 150,653,650 |
| hiddenConstants | exactSolving | 218.34 / 215.18 / 231.10 | 8,195,320 | 79,764,168 |
| hiddenConstants | exactVerification | 80.10 / 76.20 / 99.81 | 2,905,076 | 28,604,180 |
| hiddenConstants | exactEncoding | 400.91 / 379.16 / 433.45 | 12,409,292 | 126,290,325 |
| hiddenConstants | exactDecoding | 210.83 / 197.01 / 212.84 | 7,641,923 | 73,766,509 |
| heightEight | construction | 329.20 / 325.32 / 345.87 | 12,320,776 | 101,522,976 |
| heightEight | reduction | 1089.80 / 1048.92 / 1135.83 | 37,081,186 | 293,272,929 |
| heightEight | reductionVerification | 438.91 / 430.65 / 452.48 | 15,448,215 | 124,673,521 |
| heightEight | reductionEncoding | 2088.56 / 2053.15 / 2107.63 | 61,369,759 | 530,355,023 |
| heightEight | reductionDecoding | 1162.82 / 1118.41 / 1248.09 | 36,643,438 | 288,440,841 |
| heightEight | exactSolving | 575.99 / 572.74 / 614.90 | 17,906,197 | 148,328,324 |
| heightEight | exactVerification | 399.31 / 345.68 / 418.72 | 12,227,930 | 102,369,148 |
| heightEight | exactEncoding | 1545.54 / 1516.52 / 1549.27 | 46,201,850 | 414,439,865 |
| heightEight | exactDecoding | 812.11 / 790.71 / 830.21 | 26,404,970 | 217,841,106 |
| complexTracePrimitive | relativeConstruction | 1.87 / 1.83 / 1.88 | 86,618 | 1,049,167 |
| complexTracePrimitive | constantBaseChange | 394.55 / 393.30 / 396.02 | 19,525,210 | 218,316,964 |
| complexTracePrimitive | primitiveConstruction | 397.51 / 390.67 / 403.33 | 19,306,981 | 207,411,623 |
| complexTracePrimitive | differentiation | 258.29 / 250.36 / 279.07 | 12,731,485 | 137,132,453 |
| complexTracePrimitive | verification | 204.37 / 196.95 / 205.67 | 10,178,307 | 110,162,419 |
| complexTracePrimitive | encoding | 910.65 / 886.61 / 922.42 | 38,859,314 | 416,020,730 |
| complexTracePrimitive | decoding | 671.55 / 661.01 / 702.56 | 28,272,176 | 299,531,983 |

## Artifacts and memory observations

| Fixture | Reduction bytes | Exactness bytes | Largest sampled heap / RSS MiB |
|---|---:|---:|---:|
| rationalRepeatedPole | 21,498 | 21,229 | 182.46 / 321.03 |
| ramifiedRepeatedPole | 38,455 | 43,298 | 283.82 / 432.28 |
| cubic | 156,094 | 145,569 | 706.22 / 1063.33 |
| hiddenConstants | 46,793 | 42,070 | 274.84 / 740.02 |
| heightEight | 145,492 | 140,487 | 465.48 / 774.91 |

Normalized complex trace artifact: 68,203 bytes; largest sampled heap/RSS: 240.33/382.65 MiB.

The nonradical cubic is the slowest representative: complete connection, local reduction and fresh replay dominate its observations. These measurements establish resource-profile acceptance, not a UI latency promise or general speed guarantee. Gate B decisions are not measured here.
