# EQUATION-ALGEBRAIC-WRAPPER-FORMULA-HARDENING1 Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Existing Real Exact wrapper formula output is regression-hardened for grouped case readback and exact-zero display.
- No new wrapper family, domain, or route is enabled.

## Manual App Steps

- Real Exact, Complex Off: solve `|z^3+z+1|=b` for `z`.
  - Expected: grouped Real Cardano case output, `b\ge0`, separate `F=b` and `F=-b` groups.
- Real Exact, Complex Off: solve `(z^3+z+1)^2=b` for `z`.
  - Expected: grouped Real Cardano case output, `b\ge0`, separate `F=\sqrt{b}` and `F=-\sqrt{b}` groups.
- Real Exact, Complex Off: solve `|z^3+z+1|=0` and `(z^3+z+1)^2=0`.
  - Expected: one generated branch with no redundant repeated group label.
- Real Exact, Complex Off: solve `|z^3+z+1|=1` and `(z^3+z+1)^2=1`.
  - Expected: legacy finite-root output when both generated branches solve without formula payloads; no `1\ge0` fact.
- Real Exact, Complex Off: solve `|z^3-z|=1` and `(z^3-z)^2=1`.
  - Expected: grouped formula output when both generated branches need Cardano formula payloads; no `1\ge0` fact.
- Complex Exact, Complex On: try the same wrapper shapes.
  - Expected: Complex wrapper formula handoff remains unsupported.

## Expected Result

Grouped wrapper answers stay readable, exact-zero answers avoid redundant labels, copy/editor behavior remains stable, and no new wrapper scope appears.
