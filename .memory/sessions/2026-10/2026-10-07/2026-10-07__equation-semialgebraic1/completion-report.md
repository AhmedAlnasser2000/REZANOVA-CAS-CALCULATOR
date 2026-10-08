# EQUATION-SEMIALGEBRAIC1 (stage 16), PR A

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

- **Plan approved by the user (2026-10-07):**
  - regions as nested Reduce-style cells (a new schema-7 set kind);
  - ∧, ∨ and ¬ in rows;
  - ∀ and ∃ as a row prefix (PR B);
  - any number of unknowns with typed stops only;
  - tooltips on keys and on hover (New Equation only);
  - verification by samples and a second variable order.
- **Constraints:**
  - nothing from `src/lib/equation/`;
  - no New Integration edits;
  - no old-UI changes;
  - no caps and no partial answers;
  - root-only, no subagents;
  - files under 1000 lines;
  - the 60 s rule.

## Delivered (PR A)

- A1 rows with ∧ ∨ ¬ (924bbed).
- A2/A3 decomposition and verifier (7cfd9e3).
- A4 regions laid out like Reduce (c899404).
- A5 keyboard and tooltips, A6 evidence (this commit).

Specification: `docs/architecture/equation/equation-semialgebraic1-spec.md`.

## Verification

- **TypeScript and lint:**
  - `tsc -b` clean;
  - ESLint clean on the equation, contract, types and new-equation areas.
- **Unit tests:**
  - equation core, service, contract, golden, display and New Equation: 2,744 passed;
  - the same run had 3 pre-existing Integration failures, also present on main 0e3db7d.
- **UI tests:** New Equation 13/13, including the new keyboard and tooltip tests.
- **Playwright:** `e2e/new-equation.spec.ts` 2/2 on a preview build, with screenshots `region.png`, `symbol-tooltip.png` and `region-or.png`.
- **60 s probe:** all region cases took 3.6–5.2 s.
- **Node-only repository gates:** 21 pass. The printer-migration ratchet fails identically on main 0e3db7d (the calculate and linear-algebra lanes).

## Open for the user

- Inequality-only rows choose one unknown automatically. Should regions default to every name as an unknown? This is ledgered.
- PR B: quantifiers and parameters through the decomposition.

## PR B (local branch gate7, pushed after #27 merges)

- **Commits:**
  - B0 automatic unknowns (316fca9);
  - B1 quantifiers and statements (53ca218);
  - B2 parameters through the decomposition (3ecd7d8);
  - B3 evidence, Guide, README and docs (this commit).
- **User decisions (2026-10-07):**
  - free names of quantified rows are unknowns;
  - rows whose every name is quantified answer True/False;
  - with no equation row, every free name is an unknown;
  - parameter cases are Reduce-style cells.
- **Verification:**
  - TypeScript clean; lint clean on changed areas;
  - equation, contract, golden and display tests: 1,304 passed;
  - New Equation UI tests: 13/13;
  - probe: 3.5–3.8 s per PR B case;
  - Playwright: in the B3 commit.
