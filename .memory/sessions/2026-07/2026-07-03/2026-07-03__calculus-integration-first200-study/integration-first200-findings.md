# Calculus Integration First-200 Study Findings

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Boundary Update

2026-07-03: The concurrent Equation structured-output work was confirmed to be Equation-owned and not a Calculus change. Calculus integration should not import Equation solution types or edit Equation files, and normalization/capability work is eligible when it stays inside the Calculus integration lane.

## Current Study Evidence

- Scope: first 200 early Thomas/Finney-style indefinite integration cases from Sections 4.1 and 4.3, used as scratch study evidence rather than committed corpus truth.
- Backend sweep: 200 cases run; 189 supported, 11 controlled unsupported.
- Backcheck: 188 exact backchecks, 1 numeric-confidence backcheck, 0 supported-unverified rows.
- Playwright visual evidence: all 200 cases received visual evidence in study mode; 189 success cards and 11 controlled error cards rendered.
- Sequential visual risk: `calc.int.indef.thomas.first200.0060` (`x^{-5/4}`) rendered correctly when isolated, but one repeated in-place Playwright sweep hit a no-card state and browser target crash around that case. Treat as display-state/rerun stability evidence, not a solver capability gap.

## Unresolved Normalization And Preprocessing Cases

Do not leave these stale. They are first-200 study findings that should be fixed as general families, not one-off case patches.

- `calc.int.indef.thomas.first200.0019`: `\frac{3}{2}\sqrt{x}`.
- `calc.int.indef.thomas.first200.0020`: `\frac{1}{2\sqrt{x}}`.
- `calc.int.indef.thomas.first200.0023`: `\frac{1}{3x^{1/3}}`.
- `calc.int.indef.thomas.first200.0061`: `\sqrt{x}+x^{1/3}`.
- `calc.int.indef.thomas.first200.0062`: `\frac{\sqrt{x}}{2}+\frac{2}{\sqrt{x}}`.
- `calc.int.indef.thomas.first200.0063`: `8x-\frac{2}{x^{1/4}}`.

Likely theme: radical/fractional-power canonicalization, scalar factoring, and power-sum normalization before integration.

## Capability Cases For Current Lane

These may be handled inside Calculus integration without touching Equation or shared Display contracts if implemented as general symbolic rules rather than per-case patches.

- `calc.int.indef.thomas.first200.0045`: `-\pi\csc\left(\frac{\pi x}{2}\right)\cot\left(\frac{\pi x}{2}\right)`.
- `calc.int.indef.thomas.first200.0048`: `\sec\left(\frac{\pi x}{2}\right)\tan\left(\frac{\pi x}{2}\right)`.
  - General target: affine trig derivative matching with symbolic constants such as `\pi/2`, not a literal-case exception.
- `calc.int.indef.thomas.first200.0049`: `(\sin(x)-\cos(x))^2`.
- `calc.int.indef.thomas.first200.0050`: `(1+2\cos(x))^2`.
- `calc.int.indef.thomas.first200.0082`: `\cos(x)(\tan(x)+\sec(x))`.
  - General target: bounded trig identity/pre-integration simplification for early textbook forms, with proof/readback evidence where possible.

## Guardrails

- Do not edit Equation readback, Equation finite-root structures, or Equation presentation files from this lane.
- Do not import Equation-owned structured-output types into Calculus integration; copy the concept only where Calculus needs its own structure.
- Do not globally normalize `exactLatex` or change Copy Result, History, replay, or Formula Viewer semantics.
- Prefer general integration capabilities: factor constants, recognize affine inner derivatives, apply bounded trig simplifications, and attach method evidence.
- Any shared Display contract change must be discussed first and kept opt-in.
