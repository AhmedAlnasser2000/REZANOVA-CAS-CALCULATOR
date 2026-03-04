# Memory Index

## Purpose
- `.memory/` is Calcwiz's durable recall layer for product truths, current operating context, decisions, open questions, and task-level history.
- It exists to improve recall, handoff, milestone tracking, and workflow safety.
- Memory files must never affect runtime behavior.

## Read Order
1. `AGENTS.md`
2. `.memory/INDEX.md`
3. `.memory/current-state.md`
4. `.memory/world-canon.md`
5. `.memory/decisions.md`
6. `.memory/open-questions.md`
7. Most recent relevant folder under `.memory/sessions/`
8. Most recent relevant daily journal under `.memory/journal/`
9. `docs/app_summary_latest.md`

## Canonical Durable Files
- `.memory/current-state.md`: short operational snapshot of where the project stands now.
- `.memory/world-canon.md`: stable product and workflow invariants.
- `.memory/decisions.md`: dated decisions already locked in.
- `.memory/open-questions.md`: unresolved design and roadmap items.

## History And Task Recall
- `.memory/journal/`: chronological stream of short dated notes.
- `.memory/sessions/`: task dossiers with completion, verification, and commit context.
- `docs/checkpoints/`: verified app-state summaries for major milestones and architecture shifts.

## Durable Vs Temporary
- Tracked durable memory:
  - `.memory/*.md`
  - `.memory/journal/*.md`
  - `.memory/sessions/**`
  - `.memory/templates/**`
  - `.memory/research/PLAN.md`
  - `.memory/research/sources.md`
- Ignored temporary/heavy areas:
  - `.task_tmp/**`
  - `.memory/logs/**`
  - `.memory/scratchpads/**`
  - `.memory/review-video/**`

## Quick Links
- [README](README.md)
- [Protocol](PROTOCOL.md)
- [Current State](current-state.md)
- [World Canon](world-canon.md)
- [Decisions](decisions.md)
- [Open Questions](open-questions.md)
- [Journal README](journal/README.md)
- [Sessions README](sessions/README.md)
- [Latest App Summary](../docs/app_summary_latest.md)
- [Checkpoint Policy](../docs/checkpoints/README.md)
