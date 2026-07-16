## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Verification Ledger

- Program verification is in progress.
- App-visible mathematical output gates require Playwright evidence before completion.
- Complete-suite commands are reserved for the final cross-cutting closeout; ordinary gates use focused tests and contract ratchets.

## CANONICAL-RESULT-V4-SPECIAL-FUNCTION-EXPRESSION1

- gate_type: backend
- status: verified
- `npx vitest run src/lib/result-contract/v4-special-function-expression.test.ts` - pass, 12 tests.
- Focused V2/V3/native/consumer/History compatibility run - pass, 38 tests.
- `npm run test:result-contract` - pass, 126 tests across 18 files.
- `npm run test:canonical-result-v2-enforcement` - pass after sandbox escalation was required only because the ratchet self-test creates a temporary Git repository; V2 frozen-file enforcement and display inversion pass.
- `npx tsc -b --pretty false` - pass.
- `npm run test:file-sizes` - pass.
- `npm run test:memory-protocol` - pass before the final gate note.
- `git diff --check` - pass.
- Playwright: not applicable because this contract-only gate has no live V4 producer and changes no app-visible output.
