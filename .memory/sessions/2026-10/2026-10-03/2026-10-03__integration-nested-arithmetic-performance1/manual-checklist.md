# Manual application smoke

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-6
- verified_by_agent_family: sol
- attribution_basis: live

## What is achieved now

The arithmetic implementation preserves the adopted rational result path. Exponential UI adoption remains separate. Numerical performance acceptance passed October 4; see performance-results.md.

## Manual app steps and expected results

- Run `npm run dev`; MENU → Calculus → New Integration.
- Enter integral x² dx: verified x³/3+C; no nontrivial restrictions.
- Enter integral 1/(x²+1) dx: verified compact root-log expression, definitions, local-complex semantics and x²+1≠0 with combined provenance.
- Enter integral x/x dx: verified x+C with retained source exclusion x≠0.
- Expand Conditions and Verification details; inspect answer cards and readability. Completed with Playwright Chromium October 3; screenshots accompany this dossier.
