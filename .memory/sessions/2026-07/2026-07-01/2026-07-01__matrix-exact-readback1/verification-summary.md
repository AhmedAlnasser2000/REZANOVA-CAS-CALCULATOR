# MATRIX-EXACT-READBACK1 Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- backend

## Commands

```bash
npx vitest run src/lib/linear-algebra/matrix.test.ts src/lib/linear-algebra/exact-matrix-core.test.ts src/lib/linear-algebra/matrix-core.test.ts src/lib/modes/linear-algebra-worker-runtime.test.ts
npx tsc -b --pretty false
git diff --check -- src/lib/linear-algebra/matrix.ts src/lib/linear-algebra/matrix.test.ts
wc -l src/lib/linear-algebra/matrix.ts src/lib/linear-algebra/matrix.test.ts
npm run test:file-sizes
```

## Result

- Focused Matrix/exact-core/runtime tests passed: 4 files, 27 tests.
- TypeScript build passed.
- Scoped whitespace check passed for the Matrix files.
- Matrix files are under the default line cap: `matrix.ts` 136 lines, `matrix.test.ts` 78 lines.
- `npm run test:file-sizes` is blocked by unrelated active worktree edits in `src/app/runtime/useCalculusRuntime.ts` and `src/types/calculator/runtime-types.ts`; this Matrix slice did not touch those files.

## Notes

The repository had concurrent non-Linear-Algebra work in progress during this gate. Staging for the commit must include only the Matrix exact-readback files and this milestone's durable memory.
