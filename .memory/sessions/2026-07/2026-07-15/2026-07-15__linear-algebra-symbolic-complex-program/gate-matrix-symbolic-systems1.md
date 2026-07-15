# MATRIX-SYMBOLIC-SYSTEMS1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- milestone: `MATRIX-SYMBOLIC-SYSTEMS1`
- gate: backend
- status: verified pass
- commit_approval: user-approved for milestones 8 through 12
- push_approval: not granted

## Implemented Boundary

- One Matrix-owned bounded symbolic/complex elimination classifier handles systems through 3 by 3, six remaining coefficient parameters, four undecidable zero predicates, and sixteen cases.
- Exact-route closure covers rank, RREF, null/column spaces, basis, coordinates, change of basis, invertibility/profile, LU/PLU and solve routes, multi-RHS systems, plus Vector span/independence.
- Named-vector and explicit ordered unknowns preserve accepted non-reserved names. Stored substitution protects those unknowns and named Matrix/Vector operands.
- Conditional classifications use standard set-valued `Which`; fully proved profile and independence results retain their typed V2 primaries.
- Opaque coefficients and over-budget classifications stop explicitly. Existing real-numeric engineering routes remain unchanged.

## Verification Evidence

- Focused backend: 97/97 tests passed; parser-extraction delta: 27/27 tests passed.
- Incremental TypeScript passed.
- OOE boundaries: 8/8 passed. Compartment boundaries: 36/36 passed.
- Result contract passed across every Matrix/Vector selector. Canonical frozen-file enforcement passed for 20 files.
- Aggregate MathJSON baseline is blocked only by concurrent Statistics moving 466 proven leaves to 491. Display inversion passed 24/24 tests and is blocked only by three concurrent Statistics owner-assembly hashes.
- Every Linear Algebra file is within cap; aggregate file-size validation is blocked only by concurrent `src/AppMain.tsx` and `src/app/runtime/useStatisticsRuntime.ts` overages.
- Chromium passed 2/2. The inspected conditional-system screenshot is readable, unclipped, and preserves the full-width high-contrast Matrix input pad.
- `git diff --check` passed.

## Protected Worktree

- Statistics and Notebook source/dossiers and untracked `test-results/` are not part of this gate.
