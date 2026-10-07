# Main reconciliation — 2026-10-07

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

## Backend gate

- User explicitly approved merge, verification and push of main. Root-only CRITICAL recovery, isolated from concurrent Graphing.
- Parents: local Integration f9ccdb6d; remote Claude PR #24 604d6bae; common ancestor a36c555b.
- Only committed conflicts are decisions.md and October 7 journal; concatenate both authored sections without rewriting attribution or discarding notes. Current state retains both workspaces.
- No production source conflict; README overlaps uncommitted work and will use checked three-way preservation. Dirty-file hashes and binary tracked patch retained in ignored task storage.
- Backend verification: pass. Repository lint has zero errors and one retained Graphing hook warning. Fresh TypeScript/production build passes (Vite 42.27 s); 113 focused unit tests in 11 files, 20 UI tests in 5 files and 4 modern golden cases pass, all Vitest runs at two workers. CI alignment/selector tests: 40 pass.
- Memory protocol (24 tests), file-size (10 tests), authority, display inversion, OOE, compartment and CI alignment validators pass. Diff hygiene passes.
- Real npm-dev Chromium inspection on isolated port 1421: two focused Equation/Integration scenarios pass in 20.6 s. Covers verified Equation answers/systems/assumptions/roots, exponential root-log Compact/Full/Copy, conditions, both negative obstruction paths, invalid/unsupported cards and narrow overflow. Screenshots inspected and retained below.
- Initial browser run passed but symlinked dependencies caused font-serving warnings; a temporary, uncommitted Vite configuration allowed the existing shared node_modules and the same two scenarios were repeated cleanly. No production Vite/port configuration change.
- Every original nonblank decision and journal line from both parents is preserved. All 65 pre-existing dirty-file hashes remain unchanged during isolated verification. Temporary binary patch and README backup protect checkout application; README's checked three-way merge is conflict-free.
- Existing remote Equation milestone attribution and verification limits are preserved; this dossier records only merged-tree checks, not a replacement full-suite claim. No full test suite needed for this conflict-free source reconciliation.
- User-owned port-1420 dev server is untouched; the isolated Playwright server stopped after completion.
- Publish procedure: commit the verified two-parent merge, fast-forward local main without staging concurrent work, apply only the checked README merge, compare preserved file hashes, then ordinary push (never force). The containing merge commit records authorization and evidence; Git refs establish subsequent push success.
