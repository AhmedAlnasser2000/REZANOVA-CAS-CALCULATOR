# Algebraic Genus-1 Integration Roadmap

status: tracked planning artifact; checkpointed after the genus-1 research push
created: 2026-07-02
primary_agent: codex
primary_agent_model: gpt-5-codex

## Purpose

This roadmap tracks the practical genus-1 algebraic integration layer after the live genus-0 push. The target is elliptic-integral readback for one-radical squarefree cubic/quartic curves, not full algebraic-function-field Risch.

Recovery note: this roadmap was authored during the genus-1 planning/audit sequence but was accidentally left uncommitted until the later roadmap-recovery commit. The implemented sequence was finalized by `ALGEBRAIC-GENUS1-PRACTICAL-CHECKPOINT0`; keep this file as planning context, not as the sole current-state source.

## Current Position

Genus 0 is live for the agreed practical one-radical scope, and cubic/quartic radical curves are now classified as beyond genus 0 instead of generic unsupported failures.

The current boundary example `sqrt(x^3+x+1)` is a correct genus-1 candidate. Its current controlled stop is expected until elliptic substrate and curve reduction land.

`ALGEBRAIC-GENUS1-READINESS-AUDIT0` is complete. The roadmap below counts the next sixteen moves after that audit, not seventeen moves including it.

## Guardrails

- Keep genus/Risch orchestration Integration-owned.
- Equation may later consume only domain-neutral algebra primitives through Equation-owned routes.
- Do not expose `RootOf` in main answers.
- Do not add public `genus`, `elliptic`, or `algebraic-risch` strategy labels in the first genus-1 batch.
- Use exact-rational live cases first; symbolic coefficient cases must wait for safe facts/readback.
- Every visible answer/fact/readback milestone must include Playwright UI verification as well as unit tests.
- Fix presentation credibility before denser elliptic formulas: scalar product normalization, named-root definitions, case/fact spacing, copy/readback, and result-card Playwright evidence are method prerequisites, not cosmetic afterthoughts.
- Keep exact-rational genus-1 adoption ahead of broad symbolic parameter branching. Symbolic readiness can be built early, but symbolic live cases must not outrun fact/readback support.

## Planned Sixteen Moves

1. `ALGEBRAIC-READBACK-SCALAR-PRODUCT-NORMALIZATION1`
   - Fix exact algebraic output products such as `2*1/a`.
   - Normalize scalar-times-radical, scalar-times-inverse-trig, and scalar-times-elliptic-ready products into clear fractions or explicit multiplication.
   - Add unit and Playwright smoke for rendered answer cards.

2. `ALGEBRAIC-INTEGRATION-UI-EVIDENCE-HARNESS1`
   - Add reusable Playwright helpers and fixtures for Calculus indefinite integral result cards.
   - Cover answer math, `Valid When`, detail cards, copy result, history replay, and overflow/scroll behavior.
   - This does not add new math coverage; it makes future math coverage trustworthy in the UI.

3. `ELLIPTIC-FUNCTION-SUBSTRATE1`
   - Add behavior-invisible `EllipticF/E/Pi` nodes, readback, copy, and differentiation.
   - Keep the substrate behavior-invisible until the curve/reduction layers can prove formulas.

4. `ALGEBRAIC-GENUS1-CURVE-PROFILER1`
   - Classify squarefree cubic/quartic radical curves and degeneration cases.
   - Record selected variable, radicand degree, coefficient scope, repeated roots, one-radical status, and controlled stop reasons.

5. `ALGEBRAIC-GENUS1-DEGENERATION-FACTS1`
   - Separate true genus-1 curves from repeated-root degenerations that should fall back to genus 0.
   - Add discriminant/squarefree facts, repeated-root evidence, and explicit messages for genus-0 degeneration versus genus-1 readiness.

6. `ALGEBRAIC-GENUS1-REAL-BRANCH-FACTS1`
   - Add exact-rational root/interval/radicand-sign fact evidence.
   - Track real root ordering, radicand sign intervals, endpoint exclusions, and branch-row caps.

7. `ALGEBRAIC-GENUS1-NAMED-ROOT-READBACK1`
   - Add named root definitions for cubic/quartic normal forms without exposing raw `RootOf` in main answers.
   - Ensure definitions copy cleanly and render in details with Playwright evidence.

8. `ALGEBRAIC-GENUS1-NORMAL-FORM-EXACT-RATIONAL1`
   - Normalize exact-rational cubic/quartic curves to elliptic normal forms.
   - Support exact-rational root descriptors, inverse maps, and facts needed by the elliptic heads.

9. `ALGEBRAIC-GENUS1-DIFFERENTIAL-BASIS-REDUCTION1`
   - Reduce rational-in-radical differentials to rational derivative plus elliptic basis terms.
   - Distinguish first, second, and third kind obligations before making any family live.

10. `ALGEBRAIC-GENUS1-FIRST-KIND-LIVE1`
   - Make reciprocal square-root first-kind cases live.
   - First target: exact-rational `1/sqrt(P3(x))` and `1/sqrt(P4(x))` under clean branch facts.

11. `ALGEBRAIC-GENUS1-SECOND-KIND-LIVE1`
   - Make square-root and polynomial-over-root second-kind cases live.
   - Include exact-rational `sqrt(P3/P4)` and reduced polynomial-over-root cases where basis reduction is proven.

12. `ALGEBRAIC-GENUS1-THIRD-KIND-LIVE1`
    - Make simple-pole third-kind cases live with pole exclusions.
    - Carry visible exclusions for pole locations and branch intervals.

13. `ALGEBRAIC-GENUS1-RATIONAL-IN-RADICAL-HERMITE1`
    - Generalize exact-rational rational-in-genus1-radical reduction.
    - Reuse rational/Hermite/LRT primitives only where the curve reduction proof owns the algebraic extension.

14. `ALGEBRAIC-GENUS1-SYMBOLIC-PARAMETER-SLICE1`
    - Add a small symbolic parameter slice only after exact-rational paths are stable.
    - Likely first slice: named-root symbolic cubic or monic cubic with explicit distinct-root and branch facts.

15. `ALGEBRAIC-GENUS1-ANTIDERIVATIVE-QUALITY-GATE1`
    - Harden answer quality before moving to definite integrals: normalization, copy, history replay, facts, overflow, and representative textbook-style UI screenshots.
    - This is where Stewart/Thomas samples can begin acting as credibility smoke tests without turning into ad hoc rules.

16. `ALGEBRAIC-GENUS1-PRACTICAL-CHECKPOINT0`
    - Audit coverage, UI evidence, and next boundary.
    - Decide whether to move next to definite integrals, genus-1 certificates, genus-2 boundary messaging, or the larger textbook benchmark sweep.

## Expected Capability At Move 16

By the end of these moves, Calcwiz should have practical real-variable genus-1 algebraic integration for one square-root extension with exact-rational coefficients:

- reciprocal square-root first-kind elliptic integrals,
- square-root and polynomial-over-root second-kind reductions,
- simple-pole third-kind reductions,
- rational-in-radical Hermite reduction inside one genus-1 curve,
- named elliptic readback with facts and no raw `RootOf` in main answers,
- controlled degeneration back to genus 0 when repeated roots collapse the curve,
- controlled stops for genus `2+`, nested radicals, multiple independent radicals, broad symbolic branch explosions, and complex branch-cut cases,
- Playwright-backed evidence that the visible answer/fact/detail cards are readable.

This would put indefinite integration in a strong pre-definite-integral posture: elementary/Rubi Tier I, bounded RN/transcendental special functions, practical genus 0, and practical exact-rational genus 1 would all be available as antiderivative producers. Definite integrals would then mainly need interval/domain safety, endpoint singularity handling, branch-consistent evaluation, special-function endpoint evaluation, convergence tests, and numeric fallback policy on top of these antiderivatives.

## Benchmark Policy

Stewart/Thomas benchmark cases should be used after the substrate is live to classify failures as:

- parser/input problem,
- readback/UI problem,
- elementary genus-0 success,
- elliptic genus-1 success,
- transcendental/special-function success,
- controlled beyond-current-scope stop.

Benchmark cases should not become isolated ad hoc rules unless they expose a missing method-level primitive.
