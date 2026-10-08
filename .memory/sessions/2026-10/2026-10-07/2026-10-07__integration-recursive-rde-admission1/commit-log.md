# Recursive RDE and admission — authorized commit checkpoint

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
- committed_by_agent: codex
- committed_by_agent_model: gpt-6
- committed_by_agent_family: sol
- attribution_basis: live

## Commit record

- Date: 2026-10-08.
- Gate: backend, CRITICAL root-only, INTEGRATION-RECURSIVE-RDE-ADMISSION1; both internal checkpoints form one milestone commit.
- User authorization: resolve the repo divergence and also commit the pending Integration changes, followed by “sorry, continue” and notice of a third incoming commit. No push authorized.
- Commit: this containing checkpoint, titled `INTEGRATION-RECURSIVE-RDE-ADMISSION1: certify recursive families and differential admission`.
- Parent: bd830ac7, the complete recursive factorization prerequisite.
- Resolve the immutable hash with `git log -1 --format=%H -- .memory/sessions/2026-10/2026-10-07/2026-10-07__integration-recursive-rde-admission1/commit-log.md`; no hash-only metadata commit is needed.
- Complete source/tests, codecs, measurement harness, specification, roadmap and required durable memory selected explicitly. No unrelated work, temporary logs, snapshots or generated output.
- Verified milestone evidence: 912 covered core tests and 84 affected adopted Integration tests, serial measurements and unchanged resources. Fresh commit regression: 56/56 focused replay/codec/isolation tests, two workers, 2.94 s. Repository lint passes with the existing Graphing warning; build/TypeScript passes (Vite 43.14 s). Memory/file-size/diff checks must pass before commit.
- Reconciliation: fetched remote 124b1e0b contains three Equation commits since common ancestor 327e221d. After this protective milestone commit, merge normally and verify the combined state; preserve all original authored hashes. Shared memory is reconciled without dropping either lane. No tower assembly or UI adoption begins.
- Identity: preserve the preceding commits’ established user name/GitHub noreply identity using command-local settings; no global/repository Git configuration changes.
