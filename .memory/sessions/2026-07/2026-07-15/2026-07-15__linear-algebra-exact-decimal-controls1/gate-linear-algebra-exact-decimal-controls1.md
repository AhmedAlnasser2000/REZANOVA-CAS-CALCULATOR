# LINEAR-ALGEBRA-EXACT-DECIMAL-CONTROLS1

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

- label: backend
- result: verified pass under standing user approval for the full Linear Algebra program
- push authority: none
- protected state: concurrent Notebook and Statistics changes plus untracked `test-results/`

## Implemented

- Exact Matrix/Vector primaries remain canonical semantic and clipboard truth.
- Producer-owned primary MathJSON yields precision-aware decimal LaTeX without reparsing visible output.
- Both renders exact plus Decimal math; Decimal renders only Decimal math; Exact renders only exact math.
- Optional `approxDigits` travels through existing Matrix/Vector requests, workers, OOE snapshots, History seeds, and persistence schemas; old seeds retain the six-digit default.
- Integer counts, dimensions, Boolean/prose classifications, and native summary strings remain ineligible for decimal cards.
- History renders Matrix/Vector decimal readback as math, and replay preserves the saved precision.

## Handoff

- Commit this milestone as `LINEAR-ALGEBRA-EXACT-DECIMAL-CONTROLS1` under standing approval.
- Continue directly to `VECTOR-GRAM-SCHMIDT-N1`.
- Keep concurrent work unstaged and do not push.
