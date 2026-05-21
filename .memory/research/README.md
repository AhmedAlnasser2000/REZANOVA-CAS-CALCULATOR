# Research Memory

`.memory/research/` stores interpreted planning, audit, readiness, and context-analysis artifacts. It is not the place for verbatim source snapshots; those live in `.memory/sources/`.

## Layout
- `roadmaps/`: active and historical roadmap or sequencing documents.
- `checklists/YYYY-MM/`: `TRACK-*` and `REFACTOR-*` manual verification checklists grouped by capture month.
- `readiness/`: readiness matrices, dependency matrices, and candidate metadata.
- `audits/`: audit and status artifacts.
- `source-context/fricas/`: FriCAS context-atlas outputs and extracted research notes.
- `architecture/`: architecture, boundary, and design notes.
- `references/`: interpreted legacy/source notes that are not verbatim snapshots.

## Rules
- Keep the research root low-clutter: only this README, `INDEX.md`, and approved category folders belong here.
- New manual verification checklists go under `checklists/YYYY-MM/`.
- New source-context mirrors get a named folder under `source-context/` only after the mirror is registered and approved.
- Preserve `.memory/sources/` files as-is; link to interpreted research from there instead of editing snapshots.
- `npm run test:memory-protocol` enforces the root layout and checklist calendarization.
