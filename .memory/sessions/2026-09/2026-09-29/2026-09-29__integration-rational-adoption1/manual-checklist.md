# New Integration manual verification

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

## What is achieved now

Verified exact rational integration is available through New Integration with editable full expressions, independent worker jobs, retained exclusions and replayable derivations.

## Manual app steps and expected results

1. Run `npm run dev`, then MENU → Calculus → New Integration. The empty editor shows readable words with spaces.
2. Enter an explicit indefinite integral such as `\int \frac{1}{x^2+1}\,dx` and run. Expect a verified formal local-complex root-log answer, integration constant, conditions and verification details.
3. Enter `\int \frac{0}{x-1}\,dx`. Expect a constant answer while retaining the source exclusion at x=1.
4. Enter a bare expression or an integral of sin(x). Expect an unsupported-structure card without altering the draft.
5. Run a larger rational problem, switch to a new tab, then return. Expect the result in its original tab; Stop/edit/close must prevent stale success.
6. Export a derivation; open it as a saved problem, then verify it against an equivalent current integrand with a different cancelled denominator. Expect fresh verification and current-source exclusions in the latter action.
7. Reload and re-enter the workspace. Expect drafts/titles/limits restored, with no running jobs or trusted results restored.
8. Copy LaTeX and inspect a long answer at narrow width. Expect a self-contained exact answer and horizontally scrollable definitions rather than page overflow.

## Boundaries

One rational indefinite integral over rational coefficients only. Finite adjustable safeguards can stop large problems. Formal local-complex answers do not select principal logarithms or provide real-branch conversion. Legacy Calculus remains available.
