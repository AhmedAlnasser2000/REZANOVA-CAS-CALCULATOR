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
| primitive | construction | 173.05 | 165.40–177.08 | 8,637,941 | 82,927,745 |
| primitive | verification | 34.81 | 32.04–36.18 | 1,674,504 | 16,267,415 |
| primitive | encoding | 43.34 | 42.12–43.96 | 2,146,635 | 19,977,570 |
| primitive | decoding | 161.26 | 160.50–162.60 | 8,168,301 | 82,532,318 |

Harness: `src/lib/symbolic-engine/integration/core/__tests__/exponential-rational-measurements.ts` (shared across the two ordered gates; delivered with the decision gate). Results are observations, not general timing guarantees.
