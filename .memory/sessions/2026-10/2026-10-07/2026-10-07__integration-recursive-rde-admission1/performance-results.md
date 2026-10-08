# Recursive subsidiary algorithms — serial observations

## Attribution

- primary_agent: codex
- recorded_by_agent: codex
- verified_by_agent: codex
- primary_agent_model: gpt-6
- recorded_by_agent_model: gpt-6
- verified_by_agent_model: gpt-6
- primary_agent_family: sol
- recorded_by_agent_family: sol
- verified_by_agent_family: sol
- attribution_basis: live

## Method

Backend observations, 2026-10-08. Node v24.19.0, Intel Core Ultra 7 265K. One serial process, no other heavy verification. Two warm-ups and five measured samples per fixture and operation. Each solve, standalone verification, encode and decode receives a fresh execution context and proof scope. Fixture/owner binding is separate; construction includes certified extensions and input values, with prebound Q(x) setup excluded. JSON serialization/parsing and file I/O are outside timers. Encoding includes full mathematical verification and bounded serialization; decoding includes whole-artifact bounding, fresh auxiliary reconstruction and full independent replay.

The unchanged profile is 20 billion work, 1 trillion cumulative allocation, 2,048 bits, degree 256, height 8 including the variable, artifact depth 64, nodes 100,000 and bytes 16 MiB. Work/allocation are charged kernel units. Memory snapshots follow each operation and are process RSS/heap observations, not peak or garbage-collection-controlled deltas. All measured operations complete. The opt-in harness is `integration/core/__tests__/recursive-subsidiary-measurements.ts`; exact samples and metadata are retained in `serial-observations.json`.

Fixtures: rationalFamily solves D(y)=c over Q(x); hyperFamily solves D(y)-y=c*t over t with Dt=t; logPositive solves D(v)=t/x over Dt=1/x; logNegative rejects D(v)=1/(x*t) in that field; mixedRelations covers [1,2x,1/x] over an exponential then primitive logarithm; dependentAdmission requests a half-rate hyperexponential over Dt=t, retaining index 2; heightFour has independent rates 1,2x,3x^2 and solves D(v)=1. General formal owners retain their native metadata; certification comes from sidecar proofs.

## Five-sample operations

Times are milliseconds. Counters are deterministic across the five samples.

| Fixture | Operation | Median | Minimum | Maximum | Work | Allocation | RSS range MiB | Heap-used range MiB |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| rationalFamily | construction | 0.068 | 0.058 | 0.077 | 3,938 | 42,804 | 98.4–108.3 | 13.1–19.7 |
| rationalFamily | solving | 10.609 | 9.621 | 11.958 | 483,444 | 4,510,460 | 98.6–108.3 | 14.8–19.0 |
| rationalFamily | verification | 3.123 | 2.377 | 4.251 | 137,897 | 1,220,585 | 98.8–108.3 | 13.2–22.3 |
| rationalFamily | encoding | 4.652 | 4.484 | 4.863 | 169,392 | 1,608,520 | 98.9–108.6 | 14.9–21.3 |
| rationalFamily | decoding | 5.831 | 4.948 | 6.005 | 198,783 | 1,682,755 | 98.9–108.6 | 15.1–21.2 |
| hyperFamily | construction | 3.095 | 2.405 | 3.722 | 124,241 | 1,092,963 | 131.9–173.9 | 23.8–60.2 |
| hyperFamily | solving | 79.985 | 78.562 | 87.396 | 3,431,941 | 26,292,679 | 133.3–175.6 | 36.7–57.2 |
| hyperFamily | verification | 16.293 | 15.309 | 17.406 | 700,154 | 4,773,155 | 133.3–175.8 | 36.2–56.7 |
| hyperFamily | encoding | 23.036 | 21.620 | 24.583 | 830,398 | 6,571,560 | 133.6–175.9 | 31.0–50.4 |
| hyperFamily | decoding | 30.427 | 28.270 | 32.431 | 1,094,990 | 7,581,346 | 134.9–176.6 | 37.5–55.5 |
| logPositive | construction | 23.458 | 15.541 | 25.513 | 866,658 | 8,098,819 | 178.7–250.6 | 23.9–49.9 |
| logPositive | solving | 125.124 | 122.856 | 143.704 | 5,337,211 | 43,087,149 | 187.3–252.0 | 27.4–58.3 |
| logPositive | verification | 18.819 | 17.715 | 25.397 | 974,117 | 7,101,837 | 177.8–252.1 | 26.8–86.4 |
| logPositive | encoding | 29.938 | 29.371 | 33.219 | 1,134,471 | 9,277,542 | 177.9–252.1 | 17.4–75.3 |
| logPositive | decoding | 40.574 | 37.575 | 42.330 | 1,525,034 | 11,123,568 | 178.0–252.4 | 22.9–79.6 |
| logNegative | construction | 15.274 | 15.197 | 21.281 | 857,369 | 8,018,418 | 254.8–259.8 | 40.3–103.2 |
| logNegative | solving | 36.167 | 33.730 | 39.135 | 1,534,225 | 11,388,828 | 255.0–259.6 | 42.4–76.4 |
| logNegative | verification | 5.923 | 5.771 | 6.318 | 330,224 | 2,356,697 | 255.0–259.6 | 56.9–90.9 |
| logNegative | encoding | 9.448 | 9.064 | 15.286 | 409,698 | 3,334,487 | 255.0–259.6 | 46.9–79.4 |
| logNegative | decoding | 19.747 | 14.608 | 20.571 | 648,292 | 4,774,759 | 255.6–259.9 | 43.8–77.8 |
| mixedRelations | construction | 71.471 | 71.150 | 72.782 | 3,191,198 | 23,891,103 | 263.4–267.9 | 61.0–74.8 |
| mixedRelations | solving | 36.073 | 34.836 | 36.204 | 1,647,431 | 12,716,439 | 263.6–268.0 | 66.4–80.1 |
| mixedRelations | verification | 14.650 | 14.214 | 14.815 | 754,783 | 4,799,931 | 263.8–268.2 | 103.4–117.1 |
| mixedRelations | encoding | 26.519 | 26.234 | 26.815 | 933,227 | 7,301,882 | 263.6–268.3 | 90.6–104.3 |
| mixedRelations | decoding | 50.741 | 49.757 | 51.768 | 1,829,232 | 11,768,916 | 264.0–268.8 | 55.7–69.2 |
| dependentAdmission | construction | 2.496 | 2.440 | 2.594 | 143,890 | 1,268,364 | 269.9–271.6 | 89.8–122.5 |
| dependentAdmission | solving | 6.967 | 6.913 | 12.672 | 379,030 | 2,760,755 | 270.2–271.7 | 67.7–123.2 |
| dependentAdmission | verification | 1.849 | 1.734 | 7.614 | 101,798 | 647,496 | 270.2–271.7 | 64.7–119.9 |
| dependentAdmission | encoding | 3.765 | 3.573 | 5.898 | 145,946 | 1,151,919 | 270.2–271.7 | 65.3–120.5 |
| dependentAdmission | decoding | 8.487 | 7.738 | 12.277 | 368,105 | 2,316,732 | 270.5–271.9 | 76.7–109.0 |
| heightFour | construction | 103.955 | 99.802 | 104.558 | 4,957,370 | 31,930,668 | 259.6–277.3 | 54.7–108.3 |
| heightFour | solving | 368.774 | 352.316 | 375.510 | 16,474,043 | 90,133,922 | 260.7–280.1 | 58.9–111.8 |
| heightFour | verification | 67.007 | 66.334 | 71.358 | 3,195,766 | 14,390,919 | 260.7–280.4 | 58.5–111.4 |
| heightFour | encoding | 101.197 | 97.186 | 107.238 | 3,895,127 | 25,479,163 | 260.9–280.7 | 58.4–111.3 |
| heightFour | decoding | 225.531 | 224.733 | 237.746 | 9,044,838 | 44,469,390 | 261.4–285.8 | 60.7–114.9 |

Stored artifact sizes in fixture order: rationalFamily 5,458 bytes, hyperFamily 16,632 bytes, logPositive 20,860 bytes, logNegative 13,153 bytes, mixedRelations 21,508 bytes, dependentAdmission 8,623 bytes, heightFour 43,791 bytes.

## Height-bound and growth diagnostics

A separate single height-eight diagnostic is not a warmed timing comparison. With exact scoped successful tower-proof reuse and the new private shared-data graph, construction, solve, encode and replay completed under one cumulative profile: final work 3,979,849,174 and allocation 14,877,483,077. Its stored artifact was 450,491 bytes. Height-eight final regression evidence is recorded in the verification summary, including the later explicit limited-integration conditions.

The preceding unshared diagnostic completed construction and solving but failed exactly at differential-artifact-nodes during encoding. No profile was enlarged. Exact serialized sharing changes only the new recursive tags; independent owner-bound replay still checks all mathematical obligations. Cache reuse is confined to exact immutable views and bounds inside one operation; new external operations remain fresh. No speed ratio is inferred from these single probes.

A demanding seed with a=(t+1)/(t+k*x) and a polynomial plus repeated-pole representative reached integer-product-bits in native fraction/GCD arithmetic in a logarithmic field. It yielded sticky exhaustion, not a mathematical decision. The seeded regression corpus uses rational parent coefficients and completes both primitive and hyperexponential paths, including large exact integers. This milestone adds no performance guarantee for every bounded input; coefficient growth remains a resource boundary.
