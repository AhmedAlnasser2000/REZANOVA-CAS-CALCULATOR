# COMPLEX-INPUT1 + COMPLEX-EQUATION3 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Task Goal

Harden existing imaginary-unit input policy and Complex On + Exact Equation routing without adding new Complex solver families.

## Recovery Note

This memory dossier was added after the implementation commit because the normal memory closeout step was missed when `17b8669` was created. The recovery was recorded by amending the metadata-only memory commit, not by rewriting the original implementation commit.

## What Changed

- Added `src/lib/equation/complex-input-policy.ts` and focused coverage.
- Aligned Equation input canonicalization around `i` / `\imaginaryI` as the imaginary unit.
- Kept `j` and `k` ordinary variables.
- Hardened target analysis, Complex Off guidance, branch readback, Equation mode routing, OOE pilot handling, and runtime controller coverage around the existing complex input policy.
- Added focused regression coverage in canonicalization, target selection, Complex solver tests, and runtime controller tests.

## Boundaries

- No new complex trig/log/exp family.
- No override syntax for using `i` as an ordinary variable.
- No Approximate complex solving.
- No Isolate complex solving.
- No solver display-policy, replay/history/schema, OOE host, or worker-host changes outside the narrow Complex input/routing hardening.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/input/input-canonicalization.test.ts src/lib/equation/equation-target.test.ts src/lib/equation/equation-complex.test.ts` passed.
- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Commits

- `17b8669` COMPLEX-INPUT1 + COMPLEX-EQUATION3.

## Follow-Ups

- Keep broader Complex district splitting and later Complex Exact stability as separate milestones.
