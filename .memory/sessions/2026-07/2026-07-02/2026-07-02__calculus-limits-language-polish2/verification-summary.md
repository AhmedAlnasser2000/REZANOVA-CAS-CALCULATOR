## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification

- Commit subject: `CALCULUS-LIMITS-LANGUAGE-POLISH2`
- `npm run test:unit -- src/lib/calculus/limit-request.test.ts src/lib/calculus/workspace/navigation.test.ts src/lib/guide/content.test.ts` passed.
- `npm run test:ui -- src/app/workspaces/CalculusLimitEditorSource.ui.test.tsx` passed.

## Evidence

- UI test now asserts the main editor placeholder is `\text{Enter a limit expression}`.
- UI test asserts no visible Limit-screen text says `limit request`.
- Guide test now expects `natural limit expressions`.
