# Algebraic Integration And Genus Roadmap

status: tracked planning artifact; checkpointed after the genus-0 push
created: 2026-07-02
primary_agent: codex
primary_agent_model: gpt-5.5

## Purpose

This roadmap organizes Calcwiz work on algebraic integration after Rubi Tier I, bounded Risch-Norman, and the practical formal transcendental certificate push.

The immediate target is practical genus-0 algebraic integration: rationalizable one-radical integrands that can be converted to rational functions, integrated by existing rational/Hermite/LRT machinery, then read back in the original variable.

The goal is not full algebraic function-field Risch. Genus 1 and elliptic-integral work stay deferred until the genus-0 layer can classify and hand off beyond-genus-0 cases honestly.

Recovery note: this roadmap was authored during the genus-0 algebraic audit/planning sequence but was accidentally left uncommitted until the later roadmap-recovery commit. The implemented genus-0 and genus-1 positions are summarized in current-state and the checkpoint audits; keep this file as planning context.

## Current Baseline

Calcwiz already has supporting primitives:

- radical parsing, conjugates, rationalization, and perfect-square recognition in algebra/symbolic radical modules
- exact polynomial and rational-function infrastructure
- bounded rational/Hermite/LRT integration routes
- exact supplements for facts and conditions
- exact antiderivative verification/backcheck support
- a narrow exact-rational trig-substitution radical route for affine completed-square families

What is missing is the method layer:

- algebraic radical profiling for `R(v, sqrt(q(v)))`
- genus-0/rationalizability classification
- rational parametrization evidence
- rational pullback integration
- inverse substitution readback
- branch/domain facts for symbolic coefficients
- controlled genus-1 boundary stops

## Guardrails

- Keep algebraic integration in Calculus/integration, not Equation.
- Shared primitive algebra may be reused, but Equation must not expose integration-owned genus/Risch steps.
- No public Calculus result schema, Display schema, History, OOE, Tauri, or persistence changes without a dedicated milestone.
- No public `algebraic-risch` or `genus` strategy label in the first implementation batch.
- Symbolic coefficients are in scope from the start only when facts and branch conditions can be stated visibly.
- No numeric-confidence adoption for symbolic algebraic results.
- New inverse-hyperbolic readback heads require input canonicalization, exact differentiation, copy/readback, and verification support before use in main answers.

## Recommended Sequence

### 1. `ALGEBRAIC-GENUS0-RADICAL-PROFILER1`

Behavior-invisible profiling for `R(v, sqrt(q(v)))`.

Record selected variable, radical count, radicand degree, coefficient scope, target-free symbolic parameters, branch-sensitive carriers, and stop reasons.

### 2. `ALGEBRAIC-GENUS0-SYMBOLIC-FACTS1`

Build integration-owned fact/readiness helpers for symbolic radicands.

Facts include slope nonzero, leading coefficient nonzero, discriminant sign, radicand/domain positivity, denominator nonzero, and substitution validity.

### 3. `ALGEBRAIC-GENUS0-PARAMETRIZATION1`

Produce rational parametrization evidence:

- `v = phi(t)`
- `sqrt(q(v)) = psi(t)`
- `dv = phi'(t)dt`
- required facts

Start with affine and completed-square quadratic radicands.

### 4. `ALGEBRAIC-GENUS0-PULLBACK-RATIONAL-INTEGRATION1`

Transform the algebraic integral into a rational integral in the parameter and delegate to existing rational/Hermite/LRT routes.

No new rational integration engine should be created here.

### 5. `ALGEBRAIC-GENUS0-INVERSE-READBACK1`

Back-substitute parameter answers into the original variable and enforce the case-by-case readback policy.

This milestone owns whether approved inverse-hyperbolic functions become usable in main answers.

### 6. `ALGEBRAIC-GENUS0-STANDARD-RADICAL-FAMILIES1`

Make textbook genus-0 radical families live:

- affine square roots and reciprocals
- `sqrt(a^2-u^2)` and reciprocal
- `sqrt(a^2+u^2)` and reciprocal
- `sqrt(u^2-a^2)` and reciprocal

### 7. `ALGEBRAIC-GENUS0-RATIONAL-IN-RADICAL1`

Make bounded `R(v, sqrt(q(v)))` forms live through rational pullback and inverse readback.

Keep one radical extension only.

### 8. `ALGEBRAIC-GENUS0-SYMBOLIC-BRANCH-COVERAGE1`

Widen target-free symbolic coefficient coverage with capped casewise branches.

Stop cleanly when facts are unrepresentable or branch count exceeds caps.

### 9. `ALGEBRAIC-GENUS0-GENUS1-BOUNDARY1`

Add controlled beyond-genus-0 stops for squarefree cubic/quartic radical curves and record genus-1/elliptic readiness.

This milestone prepares the later genus-1 certificate/readback track without implementing it.

## Future Benchmark Policy

Stewart/Thomas-style benchmark problems should be classified as:

- elementary genus-0 answer
- elementary non-algebraic answer already owned by Tier-I/RN
- named special-function answer
- non-elementary/transcendental certificate
- beyond-genus-0/elliptic deferred
- parser/readback/UI issue

Benchmark failures should not automatically become ad hoc rules. Promote them only when they fit the genus-0 method layer or a separately approved genus-1/special-function track.
