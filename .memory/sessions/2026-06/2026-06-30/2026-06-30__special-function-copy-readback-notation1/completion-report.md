## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

`SPECIAL-FUNCTION-COPY-READBACK-NOTATION1` locks the copy/readback behavior for the new `erf`/`erfi` special-function answer layer.

## Changes

- Added UI regression coverage for special-function integral Copy Expr and Copy Result.
- Verified rendered and LaTeX notation modes copy MathLive-safe LaTeX for exact and casewise `erf`/`erfi` answers.
- Verified plain-text notation copies readable text without raw `\operatorname` leakage.
- Verified History replay preserves the special-function result copy path.
- Left runtime behavior unchanged because the central copy path already satisfied the policy.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/journal/2026-06/2026-06-30.md`
- `.memory/sessions/2026-06/2026-06-30/2026-06-30__special-function-copy-readback-notation1/`
