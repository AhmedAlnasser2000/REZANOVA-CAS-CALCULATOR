# LIB-ORG Roadmap

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Summary
`LIB-ORG0` through `LIB-ORG3` are repo-organization milestones for decluttering root `src/lib`. They do not add math capability, alter solver behavior, redesign UI, or change result wording.

## Sequence
- `LIB-ORG0`: audit root `src/lib`, record the move map, add a verification checklist, and commit documentation only.
- `LIB-ORG1`: move existing domain files into `algebra/`, `equation/`, `linear-algebra/`, and `modes/`.
- `LIB-ORG2`: create `src/lib/calculus/` and move all shared calculus modules there.
- `LIB-ORG3`: group shared display, numeric, engine, input, app-state, and navigation utilities.

## Rules
- Use clean import rewrites, not root-level compatibility shims.
- Keep tests colocated with moved source files.
- Update docs, memory, scripts, and CODEOWNERS when exact file paths move.
- Commit each phase separately after its verification gate.
- Keep `test-results/` untracked.

## Posture After Completion
The next feature milestone can resume from a cleaner tree. `INT-RAT1` remains postponed until this organization pass is stable.
