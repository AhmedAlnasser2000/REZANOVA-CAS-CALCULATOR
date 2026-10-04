# EQUATION-PROOF-PERFORMANCE1 (parts A and B)

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Authority and scope

- 2026-10-04: after #19 merged, the user asked to plan "a performance gate for what we did till now" and to be asked where needed. The plan was approved in plan mode. The user's choices:
  - certificates-first verification;
  - recorded medians plus targets;
  - algorithmic fixes and per-store caching (Rust/WASM out);
  - one PR with two commits, continuing to part B without stopping.

  Commit, push and PR were pre-authorized.
- No code from the old Equation engine is used, imported or copied. Its inventory supplies only the case definitions of the corpus.
- CRITICAL, root-only, no subagents. The branch was restarted from `origin/main` (`7f98dc5`).
- Scope, part A:
  - new `core/bench/` and `representation/performance.test.ts`;
  - `algebra/integer.ts` (limbs), `algebra/rational.ts` (class brand, `rDyadic`);
  - `representation/enclosure.ts` (fixed-point trig, caches), `representation/real-order.ts` (sign cache);
  - `algebraic/root-of.ts` (refinement);
  - a lowered budget in `composition/verify.test.ts`;
  - spec, roadmap (stage 12, ledger row closed), README and Equation memory.

  No edits to the integration core, contracts, OOE or UI.

## Outcome

- Part A: every corpus case is faster or equal within noise; the depth-25 sin chain fell from about 122 s to under 1 s. Before/after medians are in the spec.
- Remaining baseline cases over 1 s after part A (Q1, Q2, S4) are part B's targets.

## Evidence

See verification-summary.md.

## Durable memory updated

- `.memory/current-state.md`, `.memory/decisions.md`, `.memory/journal/2026-10/2026-10-04.md`
- `docs/architecture/equation/equation-proof-performance1-spec.md` (new), the roadmap (stage 12, ledger) and `docs/architecture/README.md`
- This dossier.
