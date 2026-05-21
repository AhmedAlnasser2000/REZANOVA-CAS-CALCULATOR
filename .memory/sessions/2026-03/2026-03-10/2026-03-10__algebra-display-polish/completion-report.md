# Algebra Display Polish

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.3-codex
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.3-codex
- attribution_basis: historical-user-confirmed

## Summary
- Fixed post-`R5` display regressions in exact rational output presentation.

## Delivered
- Compacted repeated same-variable factors into exponent form for symbolic exact output and transform-summary math.
- Prevented symbolic result cards from leaking raw plain-text/LaTeX approximation lines on exact rational output paths.

## Verification
- `npm run test:unit -- --run src/lib/symbolic-engine/rational.test.ts src/lib/algebra-transform.test.ts src/lib/modes/calculate.test.ts`
- `npm run test:ui -- --run src/AppMain.ui.test.tsx`
- `npm run test:gate`
