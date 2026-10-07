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
