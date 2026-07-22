# CI-LINUX-UNIT-REPAIR-CONTINUATION completion report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: [claude]
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-4-8
- recorded_by_agent_family: terra
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-4-8
- verified_by_agent_family: terra
- attribution_basis: handoff
- date: 2026-07-22

## Status

Checkpoint, not a completed milestone. Committed as a stable restore point before the deferred readback-normalization work, at user direction.

## What changed

- `integration/dispatch-by-parts.ts`: the Risch-Norman by-parts dispatch passed a native antiderivative to `symbolicSuccess` without a verification mode, so it defaulted to `backcheck` and discarded the route-owned `proofVerification` (`verified-exact`), surfacing `not-checkable` with "not enough finite numeric sample points". Added the guarded `precomputed-exact` mode, matching the six sibling routes codex had already converted. This is a source fix, not a test relaxation.
- Stale presentation assertions aligned to codex's established semantic-`toContain` convention across five files: delimiter style (`\left|`/`\left(` now plain), superscript braces (`x^{2}`/`^{6}` now `x^2`/`^6`), and genus-1 stop-message wording (now asserted on the stable `genus-1` substring rather than pinned prose).
- `README.md`: the Try in Browser badge now points at the purchased `rezanova-cas.com` domain instead of the `workers.dev` subdomain.
- Durable memory: journal entry, open-questions deferred set, `current-state.md` daily refresh, and this dossier.

## What was deliberately not done

- The 28 remaining red tests were not made to pass. They are correct tests catching real output defects; relaxing them would ship broken readback.
- No release was cut and no release gate was bypassed.
- No test isolation or quarantine was introduced for the integration suite.

## Handoff

The next milestone should route every integration readback through one normalization authority, then re-evaluate the nine deferred themes in `.memory/open-questions.md`. Term ordering (`b+ax` versus `ax+b`) is an AST-level canonicalization concern rather than a string-normalization one and may warrant separate treatment. Verification status and strategy-routing differences in that list are behavioral, not rendering, and should be judged individually.
