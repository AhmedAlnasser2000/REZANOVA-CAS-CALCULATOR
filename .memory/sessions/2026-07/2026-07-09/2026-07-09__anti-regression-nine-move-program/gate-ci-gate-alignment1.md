# Gate

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

## Gate Name
- `CI-GATE-ALIGNMENT1`

## Kind
- `backend` workflow gate with `ui` browser evidence

## Opened At
- 2026-07-10

## Closed At
- 2026-07-10

## Scope
- Align pull-request, `main`, and Linux-release workflows with the repository gate contract, every-commit workspace canaries, pre-package release evidence, and zero-retry policy.

## Files Touched
- CI and Linux-release workflows, package scripts, Playwright policy, workflow validator/tests, focused browser smoke drivers, bounded carrier readback/validation repair, focused tests, and durable program memory.

## Verification Evidence
- Workflow validator: 7/7 passed; YAML syntax parsed for both workflows.
- Required named static gates passed locally: app identity, Surface Protocol, OOE, compartments, file sizes, canary registry, and runtime probes.
- Browser gates: 19/19 workspace canaries passed in 1.2 minutes; 11/11 preserved focused smoke cases passed in 52.8 seconds; retries remained zero.
- Carrier regression: 61/61 focused Equation tests passed. The real-app nested-radical visual probe passed with a readable success card and no double-minus output.
- TypeScript, production build, lint, Cargo check, memory, and diff-hygiene gates passed at closeout.
- Broad unit baseline: 3,442 passed; the two failing Complex-abs assertions are pre-existing and outside this milestone.

## Result
- `pass` with inherited broad-unit blocker recorded

## Durable Memory Updated
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-10.md`
- This master dossier's status, completion, verification, commit log, and gate record.

## Follow-Up Notes
- Begin `SEAM-IMPACT-SELECTOR1` after post-commit readback.
- Mandatory Incident Review must include the two inherited Complex-abs failures and the nested-radical positive-root classification gap.
- Do not add retries or make the browser job depend on the static CI job.
