# MATRIX-INVERTIBILITY-THEOREM1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verification

Passed:

- `npm test -- --run src/lib/linear-algebra/matrix.test.ts src/lib/linear-algebra/editor-parser.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/navigation/menu.test.ts src/lib/app-state/history-schema.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

Known unrelated broad gate blocker:

- `npx tsc -b --pretty false` remains blocked only by unrelated `src/app/runtime/editorTargets.ts` MathLive selector/ref typing errors at lines 66 and 84-86.

## Coverage Notes

- Matrix runtime tests cover nonsingular square, singular square, and rectangular invertibility requests.
- Parser/dispatch tests cover `\operatorname{invertible}(...)` for named and inline matrices with exact sidecars.
- Keypad tests cover the Matrix-only `inv?` overlay key and absence outside Matrix.
- History schema tests cover replay acceptance for `invertibilityA`.
