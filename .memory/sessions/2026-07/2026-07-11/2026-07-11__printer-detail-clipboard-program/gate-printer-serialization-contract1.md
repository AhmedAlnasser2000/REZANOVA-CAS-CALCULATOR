# PRINTER-SERIALIZATION-CONTRACT1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- Kind: `backend` contract with `ui` parity evidence.
- Result: pass.
- Runtime behavior changed: no; the printer is not connected to result producers.

## Contract Evidence

- Plain MathJSON validation rejects boxed objects, cycles, unsupported values, non-finite literals, and configured node/depth/byte overflow.
- Structural serialization preserves `x+0`, `1x`, and `BA`, while rendering `Add(x, Negate(y))` as `x-y` and adding required precedence parentheses.
- Compatibility profile preserves supplied LaTeX byte-for-byte and records the structural candidate separately.
- Canonical, visible-LaTeX, and plain-text targets are pure and receive presentation preferences explicitly.
- The typed Equation adapter reuses `renderFiniteRootPresentation`; no second Equation renderer or global adapter registry was introduced.

## Verification Evidence

- `npm run test:printer-contract`: 9 passed.
- `npm run test:golden`: 44 passed across 43 executions.
- `npm run test:print-hygiene`: 7 passed.
- `npm run test:history-replay`: 5 passed, including all 100 fixtures.
- `npm run test:feature-probes`: 124 native and 37 UI tests passed.
- TypeScript, build, lint, Surface Protocol, OOE, compartments, file-size, memory-protocol, and diff-hygiene gates passed.
- `npm run test:canaries:browser`: 19 passed in 1.2 minutes.
- Playwright screenshots inspected Calculate `7/2` plus approximation and Equation `x=2`, `x=3` with solve-target/details; cards were readable with no overlap or overflow.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-11.md`
- `.memory/research/roadmaps/printer-detail-clipboard-roadmap.md`
- `.memory/sessions/2026-07/2026-07-11/2026-07-11__printer-detail-clipboard-program/`
