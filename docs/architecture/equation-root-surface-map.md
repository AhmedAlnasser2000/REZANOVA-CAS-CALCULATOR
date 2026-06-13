# Equation Root Surface Map

Status: current surface map

Purpose: record the intended `src/lib/equation/` root import surface after the Candidate, Target, and Root Facade cleanup sequence.

## Import Boundary Rules

- Product, app, mode, worker, and cross-district callers should import Equation public behavior through root files in `src/lib/equation/`.
- Private modules inside a district may import sibling private helpers directly when the dependency is owned by the same district.
- Cross-district imports should prefer root facades unless a later milestone explicitly creates a private shared helper contract.
- One-line root files are intentional compatibility facades, not dead files.
- Active root surfaces remain in the root until they receive their own audit/split milestone.

## Public Compatibility Facades

These files intentionally preserve stable root imports while implementation lives in a district:

- `candidate-rejection.ts` -> `candidate/rejection`
- `candidate-validation.ts` -> `candidate/validation`
- `composition-core.ts` -> `composition/core`
- `composition-stage.ts` -> `composition/stage`
- `equation-algebraic-isolation.ts` -> `isolation/algebraic`
- `equation-complex.ts` -> `complex/solve`
- `equation-polynomial-domain.ts` -> `polynomial/domain`
- `equation-polynomial-system.ts` -> `polynomial/system`
- `equation-selected-target-isolation.ts` -> `isolation/selected-target`
- `equation-target.ts` -> `target/surface`
- `equation-target-resolution.ts` -> `target/resolution`
- `guarded-solve.ts` -> `guarded/run`
- `polynomial-carrier-follow-on.ts` -> `polynomial/carrier-follow-on`
- `substitution-solve.ts` -> `substitution`

## Active Root Surfaces

These files still own root-level behavior or entrypoint responsibilities:

- `complex-input-policy.ts`: Equation imaginary-unit policy.
- `domain-guards.ts`: residual validation, numeric substitution, angle-unit trig rewrite, and domain checks.
- `equation-branch-readback.ts`: branch readback helpers.
- `equation-direct-symbolic-worker-client.ts`: direct-symbolic worker client boundary.
- `equation-direct-symbolic.worker.ts`: direct-symbolic worker entrypoint.
- `equation-history.ts`: Equation history/replay helpers.
- `equation-inequality.ts`: public inequality facade with light orchestration.
- `equation-navigation.ts`: Equation screen/navigation helpers.
- `equation-ux.ts`: Equation UX/output helpers.
- `numeric-interval-solve.ts`: numeric interval solving.
- `range-impossibility.ts`: real range impossibility helpers.
- `shared-solve.ts`: shared Equation solve orchestration.

## Root Test Surface

Root tests stay at root when they verify public root surfaces or broad cross-route contracts. Focused district tests may live beside their district implementation, as Candidate and Target now do.

## Future Cleanup Guidance

- Audit before splitting any remaining active root surface.
- Keep root facades when they protect app, mode, worker, history, or test imports.
- Update this map after future Equation district splits or root import-boundary changes.
- Do not use facade cleanup as a vehicle for solver behavior, output wording, display/readback, OOE/runtime, replay/history, schema, worker-host, capability, or reserved-symbol changes.
