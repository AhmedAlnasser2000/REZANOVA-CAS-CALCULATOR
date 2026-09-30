# Arithmetic performance evidence

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

## Reproducibility

Baseline b4517300 and final candidate; v24.19.0, Intel(R) Core(TM) Ultra 7 265K, 20 logical CPUs. Two warm-ups and five measured runs for every operation. Entire 26-case / 94-operation corpus passed. Serial monitor observed no competing heavy verification job during the accepted pair. Profiles were collected separately. Exact raw counters and process memory observations are preserved in baseline-final.json and candidate-final.json.

Times below are median [min, max] milliseconds. Allocation counts are cumulative logical units, not bytes of live RAM. Process memory includes harness/setup and is not attributed solely to the kernel. No general latency guarantee is inferred.

| Case | Operation | Baseline ms | Candidate ms | Speedup | Work before → after | Allocation before → after |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| exp-x | integration | 8.491 [7.651, 9.144] | 8.461 [7.548, 9.510] | 1.00x | 453,494 → 393,290 | 3,878,790 → 3,549,299 |
| exp-x | verification | 2.779 [2.230, 4.452] | 3.595 [2.786, 5.235] | 0.77x | 154,272 → 141,172 | 1,223,221 → 1,225,233 |
| exp-x | encoding | 6.178 [5.748, 7.317] | 6.174 [5.803, 7.775] | 1.00x | 306,073 → 282,724 | 2,316,105 → 2,319,966 |
| exp-x | decoding | 7.352 [6.605, 7.573] | 7.926 [7.218, 8.969] | 0.93x | 366,163 → 338,908 | 2,799,970 → 2,804,559 |
| exp-minus-x | integration | 67.418 [61.852, 69.107] | 9.696 [9.335, 11.739] | 6.95x | 3,272,647 → 484,036 | 27,693,545 → 4,249,060 |
| exp-minus-x | verification | 29.521 [27.004, 34.017] | 4.899 [3.389, 7.743] | 6.03x | 1,533,397 → 184,597 | 12,929,462 → 1,559,522 |
| exp-minus-x | encoding | 52.273 [51.039, 56.431] | 8.062 [6.289, 9.181] | 6.48x | 2,705,913 → 359,240 | 22,589,580 → 2,911,042 |
| exp-minus-x | decoding | 64.602 [62.104, 66.749] | 8.551 [8.219, 9.978] | 7.55x | 3,274,024 → 417,321 | 27,459,786 → 3,407,103 |
| shifted | integration | 7.451 [7.252, 10.353] | 7.392 [7.324, 8.174] | 1.01x | 469,053 → 439,826 | 4,049,190 → 4,054,931 |
| shifted | verification | 2.809 [2.520, 5.229] | 3.700 [2.597, 4.323] | 0.76x | 159,332 → 146,180 | 1,277,829 → 1,279,891 |
| shifted | encoding | 5.264 [4.972, 8.282] | 4.940 [4.926, 8.032] | 1.07x | 316,192 → 292,739 | 2,425,323 → 2,429,284 |
| shifted | decoding | 9.219 [6.043, 10.458] | 7.574 [7.277, 7.745] | 1.22x | 376,357 → 348,998 | 2,910,173 → 2,914,862 |
| shifted-negative | integration | 66.002 [60.923, 78.403] | 10.339 [9.860, 11.176] | 6.38x | 3,291,759 → 530,889 | 27,904,570 → 4,757,075 |
| shifted-negative | verification | 30.799 [29.397, 31.880] | 3.546 [3.179, 6.292] | 8.69x | 1,540,202 → 189,673 | 13,004,132 → 1,614,761 |
| shifted-negative | encoding | 52.744 [48.942, 59.075] | 8.373 [6.240, 15.100] | 6.30x | 2,719,528 → 369,397 | 22,738,925 → 3,021,525 |
| shifted-negative | decoding | 65.797 [62.050, 69.559] | 8.859 [7.959, 9.167] | 7.43x | 3,287,747 → 427,586 | 27,610,333 → 3,518,788 |
| 2x-exp-x2 | integration | 14.675 [11.865, 15.980] | 8.497 [7.899, 12.125] | 1.73x | 733,328 → 457,779 | 6,316,779 → 4,175,238 |
| 2x-exp-x2 | verification | 4.387 [4.303, 6.311] | 3.308 [2.898, 9.378] | 1.33x | 272,413 → 162,813 | 2,212,209 → 1,425,095 |
| 2x-exp-x2 | encoding | 13.725 [8.638, 18.107] | 6.934 [5.468, 10.157] | 1.98x | 476,481 → 323,363 | 3,817,687 → 2,685,688 |
| 2x-exp-x2 | decoding | 9.213 [8.944, 15.122] | 7.203 [7.036, 10.666] | 1.28x | 545,981 → 388,649 | 4,399,911 → 3,268,867 |
| inverse-x-positive | integration | 21.003 [20.180, 28.938] | 13.719 [10.662, 15.117] | 1.53x | 1,291,750 → 628,241 | 12,276,034 → 6,051,672 |
| inverse-x-positive | verification | 7.673 [7.152, 15.758] | 3.322 [3.287, 9.289] | 2.31x | 474,215 → 201,398 | 4,358,496 → 1,851,603 |
| inverse-x-positive | encoding | 16.184 [12.636, 24.115] | 7.842 [6.688, 14.734] | 2.06x | 816,960 → 404,371 | 7,412,419 → 3,542,172 |
| inverse-x-positive | decoding | 18.911 [17.966, 26.889] | 8.293 [8.119, 12.808] | 2.28x | 1,090,088 → 471,703 | 10,139,363 → 4,135,613 |
| zero | integration | 22.187 [13.658, 23.463] | 11.921 [8.200, 13.294] | 1.86x | 889,239 → 498,176 | 8,818,669 → 4,880,973 |
| zero | verification | 4.751 [4.223, 13.638] | 2.859 [2.640, 2.971] | 1.66x | 287,150 → 150,155 | 2,771,248 → 1,407,968 |
| zero | encoding | 9.016 [8.640, 11.491] | 6.331 [5.202, 9.288] | 1.42x | 578,531 → 306,266 | 5,424,324 → 2,697,457 |
| zero | decoding | 11.931 [11.679, 12.719] | 6.403 [6.351, 11.942] | 1.86x | 763,426 → 353,127 | 7,296,566 → 3,128,614 |
| rational-coefficient | integration | 57.498 [53.717, 64.315] | 13.474 [13.394, 14.280] | 4.27x | 2,871,788 → 804,044 | 27,197,114 → 7,812,161 |
| rational-coefficient | verification | 26.439 [18.097, 35.833] | 4.395 [4.160, 9.201] | 6.02x | 1,189,943 → 252,422 | 10,996,202 → 2,309,428 |
| rational-coefficient | encoding | 40.096 [33.773, 42.641] | 12.011 [8.392, 13.064] | 3.34x | 2,058,267 → 505,587 | 18,834,377 → 4,425,422 |
| rational-coefficient | decoding | 45.150 [38.678, 51.112] | 13.572 [9.966, 14.098] | 3.33x | 2,352,775 → 580,686 | 21,839,307 → 5,107,769 |
| negative-exp-x2 | integration | 5.815 [5.512, 13.381] | 4.020 [3.851, 8.748] | 1.45x | 364,685 → 237,133 | 3,543,336 → 2,283,607 |
| negative-exp-x2 | verification | 1.576 [1.507, 8.006] | 1.351 [1.110, 1.785] | 1.17x | 102,077 → 65,734 | 944,092 → 598,146 |
| negative-exp-x2 | encoding | 3.608 [3.090, 3.774] | 2.461 [2.233, 7.055] | 1.47x | 204,984 → 134,126 | 1,799,906 → 1,107,916 |
| negative-exp-x2 | decoding | 4.043 [3.829, 4.195] | 4.322 [3.019, 4.639] | 0.94x | 244,197 → 171,658 | 2,146,397 → 1,454,882 |
| negative-exp-x-over-x | integration | 9.714 [9.396, 16.365] | 5.251 [5.032, 9.916] | 1.85x | 585,860 → 306,943 | 5,440,942 → 3,044,996 |
| negative-exp-x-over-x | verification | 3.137 [3.042, 3.209] | 1.285 [1.254, 1.327] | 2.44x | 200,751 → 78,012 | 1,759,080 → 727,626 |
| negative-exp-x-over-x | encoding | 4.918 [4.855, 9.606] | 2.598 [2.577, 2.681] | 1.89x | 280,627 → 156,225 | 2,362,877 → 1,332,258 |
| negative-exp-x-over-x | decoding | 6.092 [5.833, 13.086] | 3.309 [3.294, 3.460] | 1.84x | 359,153 → 190,496 | 3,119,671 → 1,640,125 |
| negative-exp-inverse-x | integration | 12.631 [12.435, 20.634] | 7.456 [7.009, 7.687] | 1.69x | 816,956 → 435,654 | 8,411,212 → 4,472,542 |
| negative-exp-inverse-x | verification | 4.165 [3.594, 12.941] | 2.206 [2.115, 2.383] | 1.89x | 243,049 → 110,708 | 2,460,794 → 1,096,971 |
| negative-exp-inverse-x | encoding | 7.986 [7.460, 8.282] | 4.106 [4.010, 8.969] | 1.94x | 495,358 → 232,504 | 4,840,880 → 2,112,977 |
| negative-exp-inverse-x | decoding | 11.058 [10.641, 18.457] | 5.049 [4.552, 9.963] | 2.19x | 671,449 → 270,854 | 6,630,383 → 2,461,296 |
| power-positive | differentiation | 9.612 [9.297, 11.926] | 3.223 [3.185, 6.313] | 2.98x | 548,349 → 164,332 | 3,796,216 → 1,325,519 |
| power-positive | verification | 9.166 [8.979, 12.659] | 2.983 [2.785, 3.174] | 3.07x | 531,051 → 149,041 | 3,684,447 → 1,213,542 |
| power-negative | differentiation | 30.170 [24.427, 31.027] | 3.676 [3.503, 6.713] | 8.21x | 1,447,965 → 186,900 | 11,214,908 → 1,446,276 |
| power-negative | verification | 28.796 [20.177, 31.025] | 3.194 [2.961, 3.239] | 9.01x | 1,233,314 → 167,004 | 9,390,938 → 1,317,750 |
| mixed-laurent | differentiation | 243.184 [235.933, 255.895] | 7.983 [7.611, 10.619] | 30.46x | 12,203,478 → 414,025 | 118,436,038 → 3,011,651 |
| mixed-laurent | verification | 189.682 [185.029, 200.564] | 7.085 [6.927, 11.690] | 26.77x | 9,761,111 → 368,736 | 93,118,028 → 2,697,932 |
| logarithmic | differentiation | 17.473 [16.043, 17.899] | 3.827 [3.753, 4.167] | 4.57x | 995,074 → 189,803 | 7,941,546 → 1,537,090 |
| logarithmic | verification | 25.312 [16.019, 28.145] | 3.401 [3.385, 6.873] | 7.44x | 940,629 → 169,601 | 7,430,856 → 1,370,969 |
| tower-five | differentiation | 1302.060 [1284.405, 1306.976] | 538.362 [524.770, 552.532] | 2.42x | 66,213,237 → 24,150,853 | 490,569,165 → 208,037,074 |
| tower-five | verification | 1244.397 [1214.286, 1249.897] | 469.883 [457.177, 480.620] | 2.65x | 62,581,180 → 21,000,176 | 463,361,039 → 180,800,884 |
| rational-quintic | integration | 3240.406 [3165.669, 3320.772] | 3137.859 [3123.889, 3182.485] | 1.03x | 163,190,203 → 161,178,727 | 9,841,120,606 → 9,816,746,200 |
| rational-quintic | verification | 67.873 [58.981, 71.621] | 68.111 [57.489, 68.227] | 1.00x | 3,786,972 → 3,786,981 | 53,337,889 → 53,337,889 |
| rational-quintic | encoding | 64.465 [63.587, 74.358] | 65.874 [60.885, 69.016] | 0.98x | 4,003,921 → 4,003,930 | 57,710,497 → 57,710,497 |
| rational-quintic | decoding | 281.999 [269.353, 289.559] | 239.329 [233.631, 248.155] | 1.18x | 15,165,619 → 13,384,387 | 488,574,580 → 467,037,684 |
| rational-quintic-log | integration | 59.856 [55.305, 69.373] | 67.910 [66.852, 70.622] | 0.88x | 3,708,716 → 3,708,791 | 46,753,666 → 46,753,666 |
| rational-quintic-log | verification | 18.521 [15.972, 27.056] | 16.008 [15.527, 16.714] | 1.16x | 1,050,381 → 1,050,390 | 13,487,962 → 13,487,962 |
| rational-quintic-log | encoding | 16.693 [15.800, 24.723] | 16.603 [15.972, 17.411] | 1.01x | 1,061,579 → 1,061,588 | 13,606,040 → 13,606,040 |
| rational-quintic-log | decoding | 30.542 [28.937, 31.169] | 31.142 [30.968, 31.963] | 0.98x | 1,849,202 → 1,849,235 | 23,479,714 → 23,479,714 |
| rational-quadratic | integration | 74.017 [70.852, 81.229] | 58.648 [57.996, 59.418] | 1.26x | 3,788,180 → 3,570,818 | 45,845,802 → 43,232,421 |
| rational-quadratic | verification | 10.530 [9.782, 11.033] | 9.512 [9.463, 9.681] | 1.11x | 576,117 → 576,126 | 6,972,624 → 6,972,624 |
| rational-quadratic | encoding | 11.644 [10.544, 12.066] | 10.271 [10.156, 10.327] | 1.13x | 610,273 → 610,282 | 7,375,188 → 7,375,188 |
| rational-quadratic | decoding | 23.402 [21.103, 37.718] | 30.990 [29.916, 36.296] | 0.76x | 1,222,172 → 1,098,494 | 14,707,636 → 13,223,853 |
| rational-quartic | integration | 172.484 [159.550, 173.600] | 158.678 [155.021, 170.166] | 1.09x | 9,637,610 → 9,298,769 | 118,906,411 → 114,811,834 |
| rational-quartic | verification | 19.688 [19.143, 20.394] | 20.293 [19.914, 33.553] | 0.97x | 1,290,527 → 1,290,536 | 15,977,932 → 15,977,932 |
| rational-quartic | encoding | 21.307 [20.457, 30.934] | 21.513 [20.965, 35.128] | 0.99x | 1,363,741 → 1,363,750 | 16,868,299 → 16,868,299 |
| rational-quartic | decoding | 57.119 [46.424, 60.601] | 45.855 [43.879, 58.564] | 1.25x | 2,971,084 → 2,847,458 | 36,615,698 → 35,129,783 |
| rational-repeated-poles | integration | 81.733 [72.690, 83.558] | 81.369 [69.828, 85.601] | 1.00x | 4,590,246 → 4,373,401 | 55,913,406 → 53,302,611 |
| rational-repeated-poles | verification | 13.375 [13.206, 15.759] | 13.644 [13.171, 13.802] | 0.98x | 839,184 → 839,214 | 10,273,554 → 10,273,554 |
| rational-repeated-poles | encoding | 14.221 [13.947, 25.359] | 16.347 [13.896, 33.518] | 0.87x | 873,654 → 873,684 | 10,679,213 → 10,679,213 |
| rational-repeated-poles | decoding | 25.601 [24.753, 37.953] | 24.381 [23.095, 41.727] | 1.05x | 1,559,148 → 1,434,882 | 18,923,283 → 17,432,010 |
| rational-repeated-residues | integration | 22.276 [20.230, 31.447] | 21.863 [21.081, 30.446] | 1.02x | 1,274,485 → 1,261,051 | 15,255,220 → 15,093,212 |
| rational-repeated-residues | verification | 6.550 [6.215, 7.418] | 6.832 [6.536, 6.920] | 0.96x | 373,206 → 373,215 | 4,508,031 → 4,508,031 |
| rational-repeated-residues | encoding | 6.594 [5.917, 7.612] | 6.421 [6.249, 6.801] | 1.03x | 378,899 → 378,908 | 4,563,167 → 4,563,167 |
| rational-repeated-residues | decoding | 11.383 [10.490, 12.243] | 11.711 [11.322, 11.918] | 0.97x | 655,816 → 655,849 | 7,869,331 → 7,869,331 |
| rational-degree-loss | integration | 136.595 [133.458, 152.194] | 125.442 [124.097, 132.954] | 1.09x | 7,539,824 → 6,891,650 | 92,076,044 → 84,261,774 |
| rational-degree-loss | verification | 19.637 [19.230, 36.451] | 19.746 [19.292, 35.852] | 0.99x | 1,178,743 → 1,178,773 | 14,425,795 → 14,425,795 |
| rational-degree-loss | encoding | 20.349 [19.924, 20.596] | 20.272 [19.617, 22.369] | 1.00x | 1,220,218 → 1,220,248 | 14,906,053 → 14,906,053 |
| rational-degree-loss | decoding | 48.811 [41.205, 53.002] | 34.707 [33.881, 46.266] | 1.41x | 2,453,353 → 2,066,178 | 29,775,738 → 25,134,084 |
| rational-seeded-0 | integration | 31.000 [29.723, 39.667] | 31.036 [30.078, 39.440] | 1.00x | 2,015,132 → 2,015,282 | 24,629,208 → 24,629,208 |
| rational-seeded-0 | verification | 10.046 [9.733, 18.039] | 9.937 [9.739, 10.307] | 1.01x | 657,763 → 657,799 | 8,091,169 → 8,091,169 |
| rational-seeded-0 | encoding | 10.091 [9.912, 10.523] | 10.219 [9.997, 10.448] | 0.99x | 662,026 → 662,062 | 8,130,522 → 8,130,522 |
| rational-seeded-0 | decoding | 16.400 [15.635, 24.634] | 16.366 [16.065, 26.077] | 1.00x | 1,044,598 → 1,044,664 | 12,788,770 → 12,788,770 |
| rational-seeded-1 | integration | 30.712 [30.133, 38.271] | 30.301 [29.602, 39.198] | 1.01x | 2,024,437 → 2,024,593 | 24,754,280 → 24,754,280 |
| rational-seeded-1 | verification | 9.910 [9.487, 17.507] | 9.555 [9.358, 10.080] | 1.04x | 649,548 → 649,584 | 7,996,152 → 7,996,152 |
| rational-seeded-1 | encoding | 10.042 [9.868, 10.239] | 9.761 [9.469, 10.540] | 1.03x | 653,798 → 653,834 | 8,035,447 → 8,035,447 |
| rational-seeded-1 | decoding | 15.883 [14.973, 24.456] | 15.306 [14.974, 24.985] | 1.04x | 1,032,422 → 1,032,488 | 12,650,309 → 12,650,309 |
| rational-seeded-2 | integration | 29.747 [28.596, 37.441] | 10.552 [10.165, 10.884] | 2.82x | 1,818,708 → 638,742 | 22,105,046 → 7,494,857 |
| rational-seeded-2 | verification | 9.183 [9.171, 9.417] | 4.305 [4.134, 4.434] | 2.13x | 579,502 → 249,997 | 7,093,270 → 2,988,925 |
| rational-seeded-2 | encoding | 9.470 [9.359, 9.562] | 4.295 [4.114, 4.402] | 2.21x | 583,775 → 254,090 | 7,132,906 → 3,026,217 |
| rational-seeded-2 | decoding | 14.987 [14.703, 24.227] | 5.943 [5.744, 14.130] | 2.52x | 923,868 → 344,768 | 11,250,375 → 4,056,681 |

## Separate baseline CPU profile

Profile includes fixture construction and module loading, so sampled self-time diagnoses likely costs rather than claiming an integration-only percentage. The largest sampled self-time entries were:

- integer (execution.ts): 409.5 ms.
- (garbage collector) (runtime): 169.9 ms.
- check (owned-validation.ts): 164.0 ms.
- rational (rational.ts): 132.8 ms.
- scalar (differential-field.ts): 92.8 ms.
- make (polynomial.ts): 91.0 ms.
- assert (differential-field.ts): 69.2 ms.
- assert (polynomial.ts): 59.7 ms.
- assertRational (rational.ts): 42.8 ms.
- quotient (execution.ts): 39.5 ms.
- integerGcd (rational.ts): 33.5 ms.
- fraction (differential-field.ts): 26.2 ms.

## Remaining costs

Deep towers still perform substantial recursive construction and independent dual evaluation. Generic nonmonomial denominators retain the Euclidean path. Checkpoint A by itself did not improve the small inverse example; the final A+B implementation exceeded acceptance across the broader corpus. No new derivative-proof reuse was needed.
