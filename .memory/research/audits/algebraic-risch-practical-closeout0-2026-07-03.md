# ALGEBRAIC-RISCH-PRACTICAL-CLOSEOUT0

Date: 2026-07-03

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Audit only. This closeout records the current practical algebraic/Risch integration position after the frontier push that followed the Rubi Tier-I, Risch-Norman, transcendental certificate, genus-0, and genus-1 work.

No runtime behavior, public Calculus schema, Display schema, History, OOE, Tauri, persistence, or public strategy labels change in this closeout.

## Current Practical Surface

Calcwiz now has a practical but bounded indefinite integration stack:

- Rubi Tier-I exact-rational and target-free symbolic families are closed for the agreed current scope.
- Bounded Risch-Norman and transcendental certificate layers cover many elementary, named-special-function, and proof-backed non-elementary families.
- Genus-0 algebraic integration is live for affine/quadratic one-radical families, selected symbolic standard radicals, and bounded rational-in-radical numerators.
- Genus-1 canonical Legendre F/E/Pi templates are live.
- Exact-rational named-root first-kind genus-1 reciprocal radicals are live for supported real-root and complex-pair charts.
- Canonical genus-1 Hermite reductions are live for bounded even numerators over first-kind and third-kind Legendre radicals, including target-free symbolic numerator coefficients.
- Degree-5-or-higher one-radical curves stop as hyperelliptic/genus-2 boundaries.
- Safe repeated-root quartic degenerations with nonnegative square factors fall back to genus-0 polynomial/rational answers.
- Live elliptic answers now carry proof-context elementarity detail cards.
- The algebraic function-field orchestrator centralizes the late genus-0/genus-1/boundary routing surface while preserving public labels.

## Frontier Milestone Status

- Detail-card notation normalization: complete.
- Exact-rational root Legendre data: complete for supported three-real-root, four-real-root, and one-real-root complex-pair readiness surfaces.
- Generic exact-rational first-kind live adoption: complete for supported reciprocal radicals.
- Generic second-kind raw radical adoption: not live. The current implementation has denominator clearing, row extraction, matrix population, solve/backcheck surfaces, and bounded solve attempts, but live adoption remains blocked by unsolved coefficient vectors and antiderivative backchecks.
- Generic third-kind simple-pole adoption: not live beyond canonical Legendre third-kind templates and bounded canonical Hermite reductions.
- Rational-in-radical Hermite lift: live for canonical Legendre bounded even numerator slices; generic named-root rational-in-radical Hermite remains blocked by the same coefficient-solving and branch-backcheck prerequisites.
- Degeneration fallback: live only for safe perfect-square quartic degenerations with nonnegative square factors.
- Branch casewise coverage: complete as exact-rational evidence; symbolic branch splitting remains deferred.
- Elementarity certificates: complete as proof-context details for accepted live elliptic answers, not as a broad unsupported-curve theorem prover.
- Hyperelliptic boundary: complete as controlled genus-2/hyperelliptic stops.
- Function-field orchestrator: complete as an internal coordinator, not a new solver.
- Symbolic genus-0 quadratic branch lift: partially live for affine and centered-radius symbolic standard radicals; general `a*x^2+b*x+c` branch splitting remains deferred.
- Symbolic genus-1 named-root slice: live only for existing target-free canonical parameter slices; broad symbolic named-root cubic/quartic formulas remain deferred.
- Symbolic rational-in-radical slice: live only for canonical Legendre target-free even numerator coefficients; broad symbolic rational-in-radical curves remain deferred.

## Why Some Gates Stayed Bounded

The blocked gates share the same missing prerequisites:

- a solved coefficient vector over the named-root/Legendre field,
- pivot facts and denominator exclusions for those coefficients,
- branch-row compatibility between the chosen chart and the antiderivative,
- node-first antiderivative substitution rather than display-string templates,
- exact derivative backcheck after substitution,
- readable casewise output under the existing branch cap.

The repository now records these obligations as test-facing readiness surfaces instead of hiding them inside route-local heuristics. That is the correct stopping point before broader generic second-kind, third-kind, or symbolic named-root adoption.

## Practical Closeout Statement

`ALGEBRAIC-RISCH-PRACTICAL-CLOSEOUT0` closes the current algebraic frontier push as practical, not complete.

Calcwiz is now strong enough for a serious textbook benchmark sweep across elementary, special-function, genus-0, canonical genus-1, supported named-root first-kind, and controlled-boundary algebraic integration cases. The next useful work should be benchmark-driven validation or a focused coefficient-solving milestone for generic genus-1 second/third-kind adoption, not a claim of full algebraic-function-field Risch.

## Recommended Next Work

1. Run a Stewart/Thomas-style benchmark sweep and classify failures by parser/readback/coverage/boundary.
2. Promote only clustered failures into implementation milestones.
3. If continuing the generic genus-1 push, solve the coefficient-vector/backcheck prerequisite before any live second-kind or third-kind widening.
4. Keep broad symbolic named-root adoption deferred until branch rows, assumptions, and generated formulas fit within the cap.

## Verification

- `npm run test:memory-protocol`
- `git diff --check`
