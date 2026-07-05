# CALCULUS-INTEGRATION-PASTE-KEYPAD-FIX1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Scope

`CALCULUS-INTEGRATION-PASTE-KEYPAD-FIX1` repairs two user-visible input issues in the Calculus indefinite-integration workflow.

Backend/UI gate labels: `backend` for canonicalization and solver-route preservation; `ui` for MathEditor paste/live input and keypad focus behavior.

## Completed

- Extended shared function-token canonicalization so pasted and live Calculus integral text recognizes full inverse-trig names such as `arctan`, hyperbolic names such as `sinh`/`cosh`, and split-letter paste forms before MathLive can turn them into multiplied variables.
- Added a conservative implicit-product split for one-letter variable prefixes before known grouped function calls, e.g. `xarctan(x)` and `xsinh^2(x)`, while leaving arbitrary glued identifiers such as `abcarctan(x)` unchanged.
- Aligned app-level Paste and native MathEditor paste for Calculus integration contexts.
- Kept keypad layer buttons and keypad keys from stealing editor focus on mouse-down, and made keypad/editor insert commands focus with `preventScroll`.
- Added focused unit/UI regression coverage for canonicalization, native paste, app Paste, no-scroll editor focusing, and keypad mouse-down behavior.

## Excluded

- Did not change solver adoption rules, Equation output structures, Display contracts, or benchmark ledgers.
- Did not stage unrelated dirty Limits work in `src/app/workspaces/CalculusLimitEditorSource.ui.test.tsx`, `src/lib/calculus/workspace/limits.test.ts`, `src/lib/symbolic-engine/limits/finite-leading-terms.test.ts`, or `src/lib/symbolic-engine/limits/finite-leading-terms.ts`.

## Remaining Risk

- Playwright visual verification is blocked in this environment: sandboxed Vite cannot bind `127.0.0.1:1420` (`listen EPERM`), and the approved unsandboxed Playwright attempt was rejected by the tool layer because the usage limit was hit.
- A temporary visual spec was prepared at `.task_tmp/calculus-integration-paste-keypad1/calculus-integration-paste-keypad.visual.spec.ts` and should be run when local Playwright execution is available.
