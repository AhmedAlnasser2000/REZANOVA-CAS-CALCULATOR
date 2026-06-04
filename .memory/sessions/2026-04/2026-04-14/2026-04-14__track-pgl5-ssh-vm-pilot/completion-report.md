# Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: live

## Task Goal
- Implement `PGL5` as the first real SSH remote pilot on the user-owned VM target: replace the SSH stub with a bounded remote run over `ssh`/`scp`, pull back remote artifacts locally, and write a parity report against a fresh local baseline for `sym-search-planner-ordering`.

## Gate
- backend

## What Changed
- Reframed the Playground roadmap so `PGL5` now means one real VM-first SSH pilot instead of a vague bounded prototype step.
- Added the required `TRACK-PGL4` manual verification checklist before starting the new track.
- Extended the external-compute SSH contract with:
  - required `remoteProjectPath`
  - optional local manifest `remoteExecution` metadata for pulled-back outputs and parity-report location
- Added a shared workload-execution helper so:
  - the local harness
  - the remote entrypoint
  - the local parity baseline
  all write the same manifest/summary shape without duplicating workload logic.
- Replaced the SSH `not-implemented` branch with a real bounded orchestration flow that:
  - writes local input JSON
  - uploads it to the VM
  - runs a dedicated remote Playground entrypoint
  - pulls back remote `artifact-manifest.json` and `summary.json`
  - writes a local `parity-report.json`
- Added a dedicated remote Playground entrypoint plus a skipped-by-default lab test file so normal `test:playground` runs stay stable while the remote path can still be invoked through `vitest`.
- Promoted the completed foundations record `ext-compute-ssh-foundations`, created the new active pilot record `ext-compute-ssh-vm-pilot`, and added a short symbolic-search reuse note.
- Applied one follow-up fix after live `<user-ssh-target>` debugging:
  - the remote entrypoint invocation now uses `npm exec -- vitest ...` so the target test path is forwarded correctly on the VM
- Applied a second follow-up fix after live `<user-ssh-target>` debugging:
  - the remote SSH entrypoint test now uses a `30_000ms` timeout so the VM can complete the symbolic-search workload without hitting Vitest's default `5_000ms` test limit

## Verification
- `npm run test:playground`
- `npx eslint eslint.config.js src playground`
- `npm run test:memory-protocol`
- `npm run test:playground` (post-commit follow-up after the remote `npm exec -- vitest` fix)
- `npx eslint eslint.config.js src playground` (post-commit follow-up after the remote `npm exec -- vitest` fix)
- `npm run test:playground` (post-commit follow-up after widening the remote entrypoint timeout to `30_000ms`)
- `npx eslint eslint.config.js src playground` (post-commit follow-up after widening the remote entrypoint timeout to `30_000ms`)

## Verification Notes
- The SSH path is covered in automated tests through mocked `ssh`/`scp` command execution.
- The lab verifies:
  - missing `remoteProjectPath` is rejected
  - remote command construction uses `hostAlias` and `remoteProjectPath`
  - pulled-back manifest and summary parsing works
  - parity can classify `match`, `mismatch`, `remote-failed`, and `pullback-failed`
- The user-owned VM was already proven manually as a reachable SSH target (`<user-ssh-target>`) and as a valid Playground execution environment.
- After the initial checkpoint, the live operator-side backend gate was completed successfully on `<user-ssh-target>`:
  - remote artifacts were uploaded, executed, and pulled back successfully
  - local `parity-report.json` recorded `resultClass: match`
  - local `artifact-manifest.json` recorded `status: completed`

## Commits
- Recorded in the current `HEAD` checkpoint for the `PGL5` milestone flow.

## Memory Updated
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-04/2026-04-14.md`
- `.memory/research/checklists/2026-04/2026-04-14/TRACK-PGL4-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/research/roadmaps/playground-incubation-roadmap.md`
- `.memory/sessions/2026-04/2026-04-14/2026-04-14__track-pgl5-ssh-vm-pilot/completion-report.md`
- `.memory/sessions/2026-04/2026-04-14/2026-04-14__track-pgl5-ssh-vm-pilot/verification-summary.md`
- `.memory/sessions/2026-04/2026-04-14/2026-04-14__track-pgl5-ssh-vm-pilot/commit-log.md`

## Follow-Ups
- Decide whether the next external-compute incubation step should move to a provider/rented host or stay VM-first for one more bounded operator/refinement pass.
- Commit the post-`PGL5` live-gate repair checkpoint that fixed:
  - remote `npm exec -- vitest` argument forwarding
  - remote `bash -lc` command construction
  - remote SSH entrypoint timeout budget
