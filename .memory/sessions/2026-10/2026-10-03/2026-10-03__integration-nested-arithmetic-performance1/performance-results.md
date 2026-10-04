# Performance evidence

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

Backend gate; final serial measurements completed October 4, 2026.

Baseline: b452798e; Node v24.19.0; Intel(R) Core(TM) Ultra 7 265K on ahmed-Desktop. Two warm-ups and five measured runs, serial; all operations have fresh execution/proof state. Limits and machine metadata match. Standalone target verification binds the same baseline artifact before timing. File I/O and JSON parsing are excluded. Interrupted candidate runs were discarded.

## Stress timings

| Exponent | Operation | Baseline median / min–max (s) | Candidate median / min–max (s) | Speedup |
|---|---|---:|---:|---:|
| shifted | input-direct | 7.866 / 7.792–8.101 | 0.573 / 0.563–0.612 | 13.72x |
| shifted | input-ordinary | 8.854 / 8.791–9.114 | 0.805 / 0.788–0.822 | 11.00x |
| shifted | integration | 89.930 / 89.372–91.368 | 8.778 / 8.631–8.935 | 10.25x |
| shifted | verification | 32.334 / 31.925–33.053 | 2.942 / 2.905–3.015 | 10.99x |
| shifted | encoding | 32.610 / 32.411–33.050 | 2.967 / 2.930–2.979 | 10.99x |
| shifted | decoding | 49.581 / 48.845–50.335 | 4.470 / 4.424–4.526 | 11.09x |
| quadratic | input-direct | input exhaustion | 1.770 / 1.760–1.789 | — |
| quadratic | input-ordinary | input exhaustion | 1.821 / 1.808–1.835 | — |
| quadratic | integration | not reached | 19.612 / 19.452–19.637 | — |
| quadratic | verification | not reached | 6.771 / 6.744–6.821 | — |
| quadratic | encoding | not reached | 6.819 / 6.803–7.026 | — |
| quadratic | decoding | not reached | 10.467 / 10.329–10.538 | — |
| inverse | input-direct | input exhaustion | 1.155 / 1.150–1.163 | — |
| inverse | input-ordinary | input exhaustion | 1.263 / 1.254–1.273 | — |
| inverse | integration | not reached | 13.621 / 13.551–13.717 | — |
| inverse | verification | not reached | 4.697 / 4.649–4.716 | — |
| inverse | encoding | not reached | 4.711 / 4.692–4.778 | — |
| inverse | decoding | not reached | 7.203 / 7.177–7.231 | — |

Baseline quadratic and inverse direct/ordinary construction consistently exhausted at `resource-limit: integer-product-bits`. Candidate operations complete under the unchanged 2,048-bit profile. No speedup ratio is claimed for operations that the baseline could not finish.

## Work, allocation and memory

These are cumulative accounting units, not measured RAM bytes. Counters are deterministic for each selected operation; arithmetic and checking remain charged.

| Shifted operation | Baseline work | Candidate work | Baseline allocation | Candidate allocation |
|---|---:|---:|---:|---:|
| input-direct | 329,146,714 | 37,462,853 | 95,046,114,735 | 4,182,923,352 |
| input-ordinary | 394,367,580 | 53,591,863 | 97,178,589,407 | 3,061,169,357 |
| integration | 3,396,968,322 | 423,835,138 | 341,584,129,076 | 8,339,463,498 |
| verification | 1,221,211,555 | 142,905,227 | 126,196,489,223 | 2,986,352,470 |
| encoding | 1,222,410,764 | 144,313,632 | 126,205,569,036 | 2,997,799,490 |
| decoding | 1,868,701,684 | 216,865,446 | 192,395,541,801 | 4,647,724,852 |

Stress baseline: RSS observations 345.9–407.8 MiB; heap used 16.6–170.8 MiB; process maxRSS 412.0 MiB. Lifetime high-water memory is not per-operation allocation.

Stress candidate: RSS observations 335.8–400.2 MiB; heap used 18.2–170.9 MiB; process maxRSS 402.3 MiB. Lifetime high-water memory is not per-operation allocation.

Corpus baseline: RSS observations 96.8–398.2 MiB; heap used 12.2–160.5 MiB; process maxRSS 398.2 MiB. Lifetime high-water memory is not per-operation allocation.

Corpus candidate: RSS observations 96.6–304.7 MiB; heap used 12.5–149.0 MiB; process maxRSS 305.9 MiB. Lifetime high-water memory is not per-operation allocation.

## Regression acceptance

All 149 successful non-target comparisons satisfy max(20%,20 ms). Two target paths exceed 5x. Both formerly exhausting stress cases complete every candidate operation. The candidate corpus contains 53 nested and 110 broader operation groups, each with five measurements.

The broader corpus covers rational/quintic integration, rational RDEs, hyperexponential decisions, finite exponential sums, logarithmic and Laurent differentiation, and five-level formal towers. Raw samples preserve every median/spread input and memory/counter observation.

Target verification artifact SHA-256: `519ee683ea5171aec00158bc440e6294c7f25449dddd206f0f1f6cd745c81fb6`.

Checkpoints A/B meet acceptance. Checkpoint C was not implemented. No cache or derivative-verifier arithmetic changes were introduced; representations, codecs and limits stay intact. No general speed guarantee is implied beyond the measured corpus.

## Separate coefficient-growth diagnostics

One instrumented construction sample per path, outside acceptance timing. Peak sizes describe accepted intermediate integers before any rejected product; they are not bounds on every possible expression.

| Case/path | Baseline peak bits / degree | Candidate peak bits / degree | Outcome |
|---|---:|---:|---|
| quadratic/direct | 2011 / 34 | 619 / 25 | baseline product-bit exhaustion; candidate success |
| quadratic/ordinary | 2011 / 36 | 435 / 25 | baseline product-bit exhaustion; candidate success |
| inverse/direct | 1987 / 34 | 502 / 24 | baseline product-bit exhaustion; candidate success |
| inverse/ordinary | 1987 / 34 | 316 / 24 | baseline product-bit exhaustion; candidate success |
