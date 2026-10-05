# Presentation gate verification

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Part A gate: pass

- **Environment**: cloud container, Node v22.22.2; gate scripts run as `node` commands, because npm refuses Node 22.
- **Tests**: `presentation/values.test.ts`, 13 tests (rewrites with independent exact checks, power extraction, mpmath decimals, order) and the core isolation test all pass.
- **Real issue found and fixed**: tie rounding went toward +∞ (−5/8 → −0.62); it is now half away from zero.
