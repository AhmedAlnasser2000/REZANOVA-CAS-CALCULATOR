# Recursive factorization — serial observations

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

Backend observations, 2026-10-07. Node v24.19.0, Intel Core Ultra 7 265K. One serial harness process, with no concurrent heavy verification. Two warm-ups and five measured runs for each operation; every operation uses a new execution context and fresh proof state. Timers exclude fixture construction, JSON stringify/parse and file I/O. Encoding includes verification and bounded wire-data construction. Decoding includes prebounding, reconstruction and independent replay. Memory snapshots are taken after the timer; they are process observations, not per-operation peak memory or garbage-collection-controlled deltas.

Limits: work 20 billion, cumulative allocation 1 trillion, integer bits 2,048, actual coordinate degree 256, tower height 8, artifact depth 64, nodes 100,000, bytes 16 MiB. All observed operations and fixture construction complete under this profile. Raw samples are retained in `serial-observations.json`; the opt-in harness is `integration/core/__tests__/factorization-measurements.ts`.

Fixtures: rationalQuartic is z^4+1; rationalRepeated is (2z-1)^3(z^2+1)^2; nonconstantLeading is (xz+x+1)((x+1)z-x) over Q(x); nestedDenominators combines rational coefficients in x and a second formal variable; depthEight is z^2-a7 over an eight-variable registered formal tower. Tower fixtures test abstract field arithmetic, not differential admission.

## Measured operations

Times are milliseconds. Work and cumulative allocation are charged kernel counters; counters are deterministic across the five observations for each operation.

| Fixture | Operation | Median | Minimum | Maximum | Work | Allocation | RSS range MiB | Heap-used range MiB |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| rationalQuartic | factorization | 4.862 | 4.733 | 5.218 | 276,689 | 3,458,474 | 90.5–94.8 | 11.1–13.9 |
| rationalQuartic | verification | 0.802 | 0.707 | 0.980 | 43,832 | 540,427 | 90.5–94.8 | 11.1–14.5 |
| rationalQuartic | encoding | 0.915 | 0.850 | 1.157 | 49,424 | 548,826 | 90.5–94.8 | 11.1–13.8 |
| rationalQuartic | decoding | 1.001 | 0.936 | 1.231 | 51,493 | 566,714 | 90.5–94.9 | 11.1–14.8 |
| rationalRepeated | factorization | 5.722 | 5.593 | 6.907 | 357,937 | 4,474,027 | 96.0–96.0 | 10.8–14.2 |
| rationalRepeated | verification | 0.899 | 0.873 | 1.239 | 61,741 | 758,625 | 96.0–96.0 | 11.2–14.5 |
| rationalRepeated | encoding | 1.015 | 0.985 | 1.391 | 67,228 | 764,944 | 96.0–96.0 | 11.6–14.9 |
| rationalRepeated | decoding | 1.162 | 1.128 | 1.528 | 69,395 | 784,789 | 96.0–96.0 | 11.5–13.7 |
| nonconstantLeading | factorization | 28.878 | 27.275 | 33.946 | 1,302,744 | 13,653,688 | 109.6–130.6 | 23.4–32.4 |
| nonconstantLeading | verification | 4.491 | 3.876 | 6.540 | 219,287 | 2,256,385 | 109.8–130.6 | 22.3–31.8 |
| nonconstantLeading | encoding | 6.719 | 5.483 | 7.295 | 315,339 | 2,362,698 | 109.8–130.7 | 16.6–33.5 |
| nonconstantLeading | decoding | 8.547 | 8.381 | 10.231 | 381,439 | 2,993,492 | 110.2–130.7 | 16.9–32.6 |
| nestedDenominators | factorization | 113.189 | 108.533 | 113.800 | 5,328,559 | 54,950,115 | 175.4–210.6 | 36.4–98.1 |
| nestedDenominators | verification | 16.482 | 14.700 | 20.608 | 851,252 | 8,776,045 | 175.5–204.3 | 38.3–67.5 |
| nestedDenominators | encoding | 24.080 | 21.465 | 25.642 | 1,186,313 | 9,232,314 | 176.0–228.1 | 47.1–72.8 |
| nestedDenominators | decoding | 49.074 | 47.733 | 53.400 | 2,141,547 | 18,973,070 | 178.2–241.7 | 36.0–75.3 |
| depthEight | factorization | 220.294 | 219.512 | 223.174 | 9,840,187 | 99,428,753 | 258.0–282.1 | 102.1–116.5 |
| depthEight | verification | 111.290 | 109.210 | 113.109 | 4,751,743 | 48,633,955 | 257.6–282.0 | 68.2–82.8 |
| depthEight | encoding | 110.097 | 107.265 | 113.282 | 5,187,048 | 49,086,022 | 257.9–282.5 | 50.4–127.8 |
| depthEight | decoding | 202.031 | 192.724 | 204.532 | 8,620,509 | 59,479,261 | 261.3–286.4 | 90.4–104.1 |

## Separate fixture construction

These are single construction observations, not a warmed performance claim. Deep native tower construction remains substantially more expensive than the subsequent sparse proof operations.

| Fixture | Milliseconds | Work | Allocation | RSS MiB | Heap used MiB |
|---|---:|---:|---:|---:|---:|
| rationalQuartic | 0.246 | 2,287 | 25,716 | 88.2 | 11.0 |
| rationalRepeated | 0.251 | 15,913 | 202,384 | 94.9 | 15.1 |
| nonconstantLeading | 0.814 | 31,195 | 357,258 | 96.0 | 12.2 |
| nestedDenominators | 33.130 | 2,127,392 | 23,706,215 | 131.6 | 26.0 |
| depthEight | 13760.679 | 915,861,536 | 8,047,792,590 | 250.7 | 73.6 |

## Diagnostics and limitations

Early deep-tower diagnostics identified repeated native coefficient Euclid/unit normalization as the dominant construction/proof cost. Two diagnostic attempts were interrupted; their CPU profile is temporary evidence, not acceptance timing. Recursive square-free/content and reconstruction proofs now operate in the checked denominator-cleared sparse representation. Registered immutable owners reuse only checked zero/one in one exact operation token; each external operation starts fresh. Unsupported custom domains retain their generic behavior.

No timing assertion or speed target is introduced, and the diagnostic elapsed times are not presented as a reproducible speedup ratio. Complete proper-subset recombination is exponential in modular-block count; difficult inputs may exhaust the explicit profile. Coefficient recovery uses conservative exact bounds. No producer-disabled replay operation regenerates factorization or search.
