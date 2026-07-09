# LANGUAGE-SURFACE-AUDIT0 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

- Preserved the future Language compartment idea as detailed architecture memory.
- Recorded a compact global-memory summary in durable repo memory so future Codex sessions see the decision without reopening the original chat attachment.
- Started the repo-grounded `LANGUAGE-SURFACE-AUDIT0` and mapped live user-facing text surfaces across shell, workspace tabs, launcher, settings, history, variables, navigation metadata, Display result blocks, runtime status, Guide, Labs, diagnostics, and solver/readback outputs.
- Added a dedicated Language roadmap that sequences foundation, shell pilot, settings seam, panels pilot, navigation metadata, Display-text notation, and later RTL/content work.
- Classified current ownership boundaries:
  - Language should own prose, labels, commands, metadata, fallback, and interpolation.
  - Display should own math rendering, MathNotation, and structured mixed text/math rendering.
  - App runtime and OOE should keep launch, stale, cancellation, host routing, and commit/drop authority.
  - Solver/readback wording should not be migrated in the first foundation slice.
- Recommended the migration order: language foundation, shell pilot, settings seam, panels pilot, Display-text notation seam, then later Guide/solver/readback/RTL work.

## Files Updated

- `docs/architecture/language/language-compartment-display-text-memory.md`
- `docs/architecture/language/language-surface-audit.md`
- `.memory/research/roadmaps/language-roadmap.md`
- `.memory/research/INDEX.md`
- `docs/architecture/README.md`
- `docs/README.md`
- `.memory/current-state.md`
- `.memory/world-canon.md`
- `.memory/journal/2026-06/2026-06-19.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/sessions/2026-06/2026-06-19/2026-06-19__language-surface-audit0/`

## Scope Notes

- Docs/memory-only audit.
- No `src/` changes.
- No language settings schema, language pack loader, translation migration, RTL layout work, solver wording rewrite, Guide rewrite, Display renderer change, OOE change, History schema change, Graphing, Spreadsheet, plugin system, broad bus, code generator, or distro system.

## Next Recommended Milestone

`LANGUAGE-COMPARTMENT-FOUNDATION1`: add an English-only typed language contract, fallback behavior, validation, metadata with `ltr`/`rtl`, and one interpolation helper. Do not migrate broad surfaces in the foundation slice.
