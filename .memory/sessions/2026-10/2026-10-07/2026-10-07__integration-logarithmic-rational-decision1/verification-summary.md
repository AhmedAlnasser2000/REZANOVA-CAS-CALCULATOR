# Logarithmic rational decisions — verification

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

## Backend checkpoints

- 2026-10-07: user approved the full first-level logarithmic class, CRITICAL root-only, one milestone with mandatory primitive/replay checkpoint before decision authority. No staging, commit or push.
- Existing prerequisites: certified logarithmic admission, owned exact fractions, independent dual-number verification, square-free quotient rings and two trace checks, rational Hermite/LRT and complete rational limited integration.
- Checkpoint A PASS: 25 new logarithmic primitive tests, 52 retained exponential primitive/decision/replay tests and isolation. Incremental TypeScript and scoped lint pass. OOE/compartment, memory/file-size gates pass. The initial seven failures were independently known fixture targets using D(q) instead of the certified D(log q); corrected the fixture, all 25 pass. No production mathematics changed to satisfy them.
- Checkpoint B PASS: entire logarithmic denominator reduction, residue selection, complete descending limited-integration steps, rational/root-log embedding and final independent derivative check. Both negative paths retain the complete preceding evidence. No partially verified primitive or exhausted computation is a decision.

## Closeout evidence — 2026-10-07

| Check | Result |
|---|---|
| Retained core: `npx vitest run src/lib/symbolic-engine/integration/core --maxWorkers=2` | 41 files, 697 tests pass; 145.66 s; 599 retained + 98 new |
| Final focused logarithmic decision/wire | 73 tests pass; 36.47 s |
| Affected adopted Integration service, exponential service/replay/projection and rational result | 5 files, 80 tests pass; 31.03 s; two workers |
| Incremental TypeScript: `npx tsc -b --pretty false` | Pass |
| Scoped ESLint: first-level/logarithmic helpers, exponential wrappers and measurements | Pass |
| Kernel isolation | Pass, also included in retained core |
| OOE/compartment validators and validator tests | Pass; final rerun recorded below |
| Memory/file-size validators and validator tests | Pass; final rerun recorded below |
| Diff hygiene | Pass; final rerun recorded below |

Logs are in ignored `.task_tmp/integration-logarithmic-rational-decision1/`: `core-final.log`, `logarithmic-final-focused.log`, `service-final.log`, `typescript-final.log`, `lint-final.log` and the named boundary/protocol logs. Full core and serial measurements ran separately; no heavy verification job overlapped measurements.

## Authority, replay and compatibility

- Known independent primitives cover t, t^2, t/x, 1/(xt), 1/(xt^2), repeated poles and total derivatives with rational coefficient dependence. Negative fixtures include 1/t, t/(x+1), successful polynomial prefixes and constant residues followed by a polynomial obstruction.
- Positive, both negative, rational/root-log and degree-specialization partition artifacts replay with admission, derivative, Hermite, residue/selection, limited-integration, linear-system, resultant/trace and integration producers disabled. Replay binds the complete original argument and explicit expected owner/input; log x and log(2x) mismatch despite equal derivatives.
- Adversarial checks cover argument/admission evidence, norm/inverse/trace/selection, matrix and polynomial step coverage, targets and conditions; foreign/forged owners, immutability, mutable children, fresh operations, all four arithmetic limits and sticky failures during individual stages.
- Separate registered logarithmic/exponential domains remain. Shared helpers contain only identical first-level mechanics; existing exponential signatures and version-1 artifact formats remain. All retained exponential/rational/RDE/replay tests and affected adopted Integration tests pass. Production edits remain in the integration core.
- Logarithmic inverse powers keep their actual t restrictions. Construction numerator and denominator, coefficient denominators, primitive denominators and log norms retain provenance through cancellation. The completeness proof is in `proof-dossier.md`; schema or obstruction labels alone have no authority.
- Serial two-warm-up/five-sample observations for six cases and four operations are in `performance-results.md` and `serial-observations.json`. Fixture construction/JSON/I/O are outside timers. Allocation accounting is cumulative units, separate from process RSS/heap snapshots; no timing-sensitive assertions.

No application behavior changed and no logarithmic UI was activated. The approved backend gate has no Playwright requirement. Repository lint/build remain gates for a separately authorized commit. No staging, commit or push.

## Final record validation

After specification, roadmap, current-state, decision, journal and dossier completion: `npm run test:memory-protocol`, `npm run test:file-sizes`, `npm run test:ooe-boundaries`, `npm run test:compartments-boundaries` and `git diff --check` all pass. File sizes cover 2,704 files with five unchanged baseline caps; no ratchet weakening. New untracked source/record files also pass whitespace inspection. The index is empty. No owned Vitest, Playwright or measurement processes remain. No further production edits followed the 697-test core run.

## Subsequently authorized commit — 2026-10-07

The user requested this milestone commit and a discussion of the next gate. Repository lint passes with zero errors and one unchanged Graphing ref-cleanup warning; repository build including TypeScript passes, with Vite reporting 41.08 s. No production changes followed the 697-test/80-test runs, so their evidence remains applicable. Exact path staging includes required durable records, and final protocol/boundary/file-size/diff checks pass before commit. Commit identity and ownership are recorded by the containing `commit-log.md`. No push is requested.

Git identity recovery: the first commit attempt failed before creating a commit because no author was configured. All four preceding commits have the same user author, and the previous Integration commit has that same committer. Reuse this verified identity for the one command via `git -c`; global configuration remains untouched. This does not invalidate any source verification.
