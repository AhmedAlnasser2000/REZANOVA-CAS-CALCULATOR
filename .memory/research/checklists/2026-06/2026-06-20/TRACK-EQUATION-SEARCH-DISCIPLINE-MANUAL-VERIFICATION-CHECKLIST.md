# Equation Search Discipline Track Checklist

Date: 2026-06-20

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Equation selected-target search has target-shape profiling, conservative route planning, and internal trace evidence.
- Generated equation handoffs are route-gated for exp/log and shared for carrier, composition, and mixed-algebraic branch delegation where semantics permit.
- Parameterized polynomial/rational symbolic coefficient handling shares an Equation-owned MathJson coefficient seam.
- Carrier and mixed-algebraic helpers share compatible MathJson arithmetic.
- Cap evidence and real/default cap audits confirm that current next work should be substrate, not cap raising.

## Manual App Steps

- Open Equation in the desktop app.
- Run the preserved `s` reference family with selected targets `s`, `t`, and `d` if needed for spot-checking route behavior.
- Run a known supported composition case such as `sin(tan(z))=a`.
- Run a known degree/readback boundary such as a symbolic cubic or degree-5 power case.
- Open History after each run and confirm completed records remain ordinary Equation records.

## Expected Results

- Supported selected-target and composition cases still return exact structured results.
- Known unsupported boundary cases stop with clear guidance rather than freezing or pretending to solve.
- History remains global committed History with no trace data or source-mirror paths exposed.
- No UI setting exposes cap tuning, DAG behavior, or source-mirror parity claims.
