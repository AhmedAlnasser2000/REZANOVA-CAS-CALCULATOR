# EQUATION-CERTIFIED-NUMERICS1 (stage 15, renumbered)

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

- 2026-10-07: the user chose certified numerics before the semialgebraic gate and asked for the roadmap order to change and the change to be stated in memory (done first, in its own commit).
- **Plan approved**:
  - the isolated-real-root binder;
  - one variable in PR A, square systems in PR B;
  - the stage-number swap;
  - refusal with range-row advice for infinitely many non-closed roots;
  - range input as rows;
  - "✓ Certified".
- **Constraints**:
  - nothing from `src/lib/equation/`;
  - no New Integration edits;
  - no caps, only typed stops, and no partial answers;
  - CRITICAL, root-only, no subagents;
  - the 60 s probe for slow cases.

## Delivered

- A1: the roadmap swap and memory.
- A2: the `isolated` expression node (enclosure, exact order, wire, MathJSON) and the schema-7 `isolated-real-root` binder with validation, projection and replay.
- A3: the finder returns certified isolated zeros, range rows bound the search, unsettled tails are refused naming the range row, the independent verifier (`core/numeric/cover.ts`), the definition row and "✓ Certified".
- A4: 30-digit reference corpus and tamper tests, golden case `new-equation-certified-root`, print-hygiene baseline (52 cases, additions only), probe cases, Playwright (cos x = x; eˣ + sin x = 0 on −10 ≤ x ≤ 0), the spec `docs/architecture/equation/equation-certified-numerics1-spec.md`, roadmap and ledger.

## Verification

- Equation core, service, contract, golden and display tests pass; numeric corpus 14/14; New Equation UI tests and lint clean; typecheck clean.
- Repository gates pass except printer-migration, which fails identically on main a36c555 (pre-existing).
- Playwright `e2e/new-equation.spec.ts` on a preview build: 2 passed; screenshots sent to the user.
- 60 s probe: every case 3.4–5.6 s including about 3.4 s of process start.

## Remaining

- PR B (square systems by Krawczyk) after PR A merges. Ledger rows added for tan in mixed expressions, definition-row layout, complex numerics, the cover's scope, the f′ = 0 exact-root cover skip, tangent roots and the systems classes PR B does not take.

## PR B (square systems)

- Decisions: one `isolated-real-point` binder per point; HC4 bounds, then a named refusal; tangent solutions refused; range rows on polynomial systems left to stage 16.
- B0: systems eliminated to one numeric root verify by identity (they verified forever); elimination distributes after substituting.
- B1: `rangeOverBox`/`rangeNodes`, HC4 contraction and the mean-value form (`numeric/contract.ts`), rational interval algebra (`numeric/interval.ts`).
- B2: the `isolated-point` node, the Krawczyk test and refinement (`numeric/krawczyk.ts`), box order for certified tuples, the schema-7 binder with validation, projection and replay, one definition row per point, "✓ Certified".
- B3: the solver (`numeric/systems.ts`), the independent cover (`numeric/cover-box.ts`), identity checks for points, range rows in systems with kernels, the numeric remainder after exact elimination.
- B4: corpus (25-digit references polished at 60 digits), tamper tests, golden case `new-equation-certified-system` (print hygiene 53, additions only), probe cases, Playwright step, spec, roadmap, ledger, memory.

### Verification (PR B)

- Equation, service, contract, golden, display and New Equation unit tests pass; typecheck and lint clean; file sizes within caps.
- 60 s probe: every case 3.3–6.5 s including about 3.4 s of process start.
