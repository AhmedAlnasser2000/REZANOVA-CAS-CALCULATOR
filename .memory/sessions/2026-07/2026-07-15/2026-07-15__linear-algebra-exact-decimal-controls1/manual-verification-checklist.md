# Linear Algebra Exact/Decimal Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Manual App Steps

1. Set approximate digits to `4` and output style to Both.
2. In Vector, set `u=[1,1,1]`, `v=[1,1,0]`, and run `proj_u(v)`.
3. Confirm the exact `2/3` column vector and Decimal `0.6667` column vector are both visible.
4. Switch to Exact, then Decimal, and confirm only the corresponding mathematical card remains.
5. In Decimal mode, copy the result and confirm the clipboard contains the exact fractional vector.
6. Replay the entry from History and confirm the saved four-digit Decimal card returns.

## Expected Results

- Exact output remains canonical and copyable in every style.
- Decimal output is rendered mathematics, not raw LaTeX or prose.
- The answer card, History replay, and three-entry column vector remain readable without horizontal overflow.
