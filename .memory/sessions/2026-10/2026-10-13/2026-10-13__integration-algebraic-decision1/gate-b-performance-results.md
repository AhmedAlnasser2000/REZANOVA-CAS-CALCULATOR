# Gate B serial performance — algebraic integration

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

## Status and method

The user explicitly stopped the slow warmed measurement run at 2026-10-13 18:30:21 Asia/Riyadh (15:30:21 UTC), after about 14 minutes, then requested the Gate B commit. Remaining performance samples are waived for this correctness checkpoint and deferred to the separate performance gate. No measurement restart is authorized. The serial harness uses two warm-ups and five measured samples, fresh contexts and proof scopes, with fixture creation and file I/O outside timed operations. Gate B construction includes full constant certification and curve construction. Gate A separately retains historical reduction/exactness/primitive observations from its verified commit.

Record median/minimum/maximum wall time, exact work/allocation counters, heap/RSS endpoints and deltas, and artifact bytes. Heap/RSS endpoints are observations, not peak-memory or leak guarantees. No timing-sensitive assertion applies. All operations retain 20-billion work, 1-trillion allocation, 2048 bits, degree 256, height eight, depth 64, 100000 nodes and 16 MiB.

Schultz's dependent-residue and order-29 integrals additionally receive complete serial integration, fresh verification, encoding, producer-disabled decoding and replay-verification acceptance observations. These single observations are distinct from the warmed five-sample benchmark.

## Development failures

- Schultz first exhausted work during finite-field torsion: no mathematical verdict. Complete principality now proves least order one before reductions when applicable; otherwise full two-reduction evidence remains.
- The subsequent run exhausted integer-product bits in number-field pseudo-division: no mathematical verdict. Checked monic Euclidean identities now remove irrational leading units in genuine number fields; rational-content normalization remains for degree-one wrappers. Brown resultant scaling is unchanged.
- Neither repair increases limits, truncates values or supplies a fallback after exhaustion.

## Later performance follow-up

The user requested a separately reviewed performance gate and explicitly clarified that it targets multiple slow cases across the reconstructed engine, not just this fixture. Include construction, integration, standalone verification, encoding and producer-free decoding; choose representative rational/transcendental/algebraic, nested and higher-genus workloads from measured evidence. Targets and sequencing are unresolved. Current correctness acceptance retains complete algorithms, exact arithmetic, independent replay and unchanged limits.

Schultz currently has one full serial acceptance observation: 884.19 s including fixture setup and five operations, with integration alone 341.94 s. It is not a warmed median and does not characterize all inputs.

## Complete large-fixture acceptance observations

These are single serial observations with fresh proof state per operation, not warmed performance summaries. Fixture creation and file I/O are excluded from each operation timer; the test-file total also includes setup and assertions.

| Fixture | Operation | Seconds | Work | Allocation |
| --- | --- | ---: | ---: | ---: |
| Schultz dependent residue integral | integration | 341.940 | 13,703,762,606 | 245,737,332,556 |
| Schultz dependent residue integral | verification | 39.952 | 1,646,627,613 | 27,559,148,099 |
| Schultz dependent residue integral | encoding | 254.068 | 10,471,564,067 | 183,564,100,493 |
| Schultz dependent residue integral | decoding | 208.202 | 8,727,283,530 | 154,580,409,286 |
| Schultz dependent residue integral | replayVerification | 38.726 | 1,643,135,496 | 27,521,819,637 |
| Schultz order-29 integral | integration | 506.665 | 13,728,390,532 | 363,192,401,310 |
| Schultz order-29 integral | verification | 51.598 | 1,569,009,218 | 39,836,069,494 |
| Schultz order-29 integral | encoding | 279.008 | 8,567,656,421 | 272,907,694,740 |
| Schultz order-29 integral | decoding | 218.527 | 6,647,755,581 | 228,035,803,174 |
| Schultz order-29 integral | replayVerification | 48.061 | 1,541,186,350 | 39,606,776,388 |

Schultz: 880899 artifact bytes; complete test-file duration 884.19 s. Order 29: 998448 artifact bytes; complete test-file duration 1105.96 s. Every work/allocation count fits the unchanged profile. Full raw heap/RSS endpoints and deltas are retained in the accompanying observation JSON files. These counts are accounting units, not RAM bytes. The largest observed endpoint RSS is 1921593344 bytes in order-29 encoding; this is not a sampled process peak.

## Interrupted warmed benchmark

The process was terminated at the user's request, not by a failed mathematical decision or resource certificate. Rational, ramified-exact and hidden-constant fixture sampling had completed; the harness was still processing the auxiliary-complex-log fixture. Its progress file retains only the latest completed fixture, hiddenConstant; earlier snapshots were overwritten and the full aggregate was never produced. No full six-fixture benchmark completion is claimed. Raw retained samples are in [gate-b-performance-partial.json](gate-b-performance-partial.json), and exact process/timestamp evidence is in [gate-b-measurements-stop.json](gate-b-measurements-stop.json).

| Retained fixture | Operation | Median / min / max ms | Work per sample | Allocation per sample |
| --- | --- | ---: | ---: | ---: |
| hiddenConstant | construction | 180.25 / 176.59 / 187.59 | 8,213,585 | 85,097,849 |
| hiddenConstant | integration | 907.30 / 890.31 / 923.27 | 36,108,443 | 345,103,479 |
| hiddenConstant | verification | 175.99 / 163.61 / 179.74 | 6,723,655 | 64,817,390 |
| hiddenConstant | encoding | 1028.24 / 1002.69 / 1049.74 | 34,298,750 | 341,916,425 |
| hiddenConstant | decoding | 694.23 / 626.22 / 721.44 | 25,211,060 | 241,599,442 |

All retained samples fit unchanged limits. Five operation summaries are retained with five measured samples each; they do not substitute for the stopped remaining corpus. Gate A's separate 52-summary observations and the two complete large-fixture acceptance observations remain preserved. No speed target or broad performance acceptance is claimed.
