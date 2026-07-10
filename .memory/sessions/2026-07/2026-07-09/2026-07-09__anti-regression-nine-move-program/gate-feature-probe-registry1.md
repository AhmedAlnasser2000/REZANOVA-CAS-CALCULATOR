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
- `FEATURE-PROBE-REGISTRY1`

## Kind
- `backend` anti-regression registry with component and persistence evidence

## Opened At
- 2026-07-10

## Closed At
- 2026-07-10

## Scope
- Classify every live `Settings` key and bind it to executable semantic-runtime, formatting, shell-accessibility, or persistence-privacy evidence without changing application behavior.

## Verification Evidence
- Compile-time `Record<keyof Settings, ProbePolicy>` coverage and runtime parity both cover exactly 24 keys.
- Eighteen catalog probes span native, component, and persistence tests; source-name validation prevents missing, orphaned, or silently renamed evidence.
- `npm run test:feature-probes` passed 124 native tests and 37 UI/persistence tests.
- DEG/RAD/GRAD inverse trig, exact/decimal output, Equation settings, notation/precision, scale/contrast, language, History privacy, and calculator-memory policy are explicitly pinned.
- TypeScript, file-size validation, focused ModeStrip UI coverage, and diff hygiene passed.

## Result
- `verification-pass`; Behavioral Ratchet 5 is ready for the approval-gated commit.

## Durable Memory Updated
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-10.md`
- `.memory/research/roadmaps/anti-regression-nine-move-roadmap.md`
- This master dossier's status, completion, verification, commit log, and Move 5 gate record.

## Follow-Up Notes
- `GOLDEN-CORPUS-REGISTRY1` is next after commit approval.
- Keep Matrix/Vector capability work frozen through the Move 9 closeout.
