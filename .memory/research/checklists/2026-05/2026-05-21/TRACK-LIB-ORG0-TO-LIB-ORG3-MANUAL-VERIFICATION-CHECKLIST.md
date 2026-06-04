# TRACK-LIB-ORG0-TO-LIB-ORG3 Manual Verification Checklist

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now
- `LIB-ORG0` records the root `src/lib` taxonomy before source moves.
- `LIB-ORG1` through `LIB-ORG3` move files into domain, calculus, and shared utility folders with clean import rewrites.
- Runtime behavior is intended to remain unchanged.

## Manual App Steps
- Launch the app after `LIB-ORG3`.
- Open Calculate and evaluate a basic arithmetic expression.
- Open guided Calculus derivative, integral, and limit examples.
- Open Equation, Matrix, Vector, Table, Advanced Calc, Statistics, Trigonometry, and Geometry once.
- Open Settings and History surfaces once.

## Expected Results
- The app launches without console/runtime import errors.
- Existing examples and mode navigation behave as before the path migration.
- No root-level compatibility shim files remain in `src/lib`.
- `test-results/` remains untracked.

## Verification Commands
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `npm run test:unit`
- `npm run test:golden`
- `npm run test:ui`
