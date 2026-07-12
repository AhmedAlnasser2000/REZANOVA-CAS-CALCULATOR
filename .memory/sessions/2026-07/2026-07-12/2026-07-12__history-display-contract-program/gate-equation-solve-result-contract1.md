# EQUATION-SOLVE-RESULT-CONTRACT1 Gate

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

- kind: `backend`
- status: verified; entering the user-approved commit
- intentional visible or mathematical change: none
- push: not authorized
- excluded: `test-results/` and the separately committed Notebook program

## Contract

- `EquationSolveResultContractV1` owns solved versus controlled-stop status over one validated `CanonicalResultDocumentV1`.
- It carries bounded accepted/rejected candidate evidence and optional candidate validation, branch evidence, planner/solve badges, substitution and numeric diagnostics, and explicit analysis evidence.
- Whole-carrier limits are 20,000 nodes, depth 64, and 1,280,000 serialized UTF-8 bytes; candidate, validation, and analysis arrays have explicit count caps.
- Status must agree with document kind. Branches, badges, accepted candidates, rejection count, substitution diagnostics, and numeric method must mirror the canonical document exactly; analysis IDs must be unique.
- The private carrier district has no Display dependency. The narrow compatibility adapter is the sole `DisplayOutcome` boundary and cannot parse LaTeX.
- No carrier-to-Display adapter or live Equation runtime migration is included; that belongs to `EQUATION-OUTCOME-BOUNDARY1`.

## Verification

- `npm run test:equation-solve-result`: 2 files, 6 tests passed.
- `npm run test:result-contract`: 4 files, 23 tests passed over all 43 golden and 100 replay executions.
- Full Equation district: 142 files, 1,206 tests passed, including worker/fallback, exact/numeric, Complex, benchmark, domain, branch, and readback coverage.
- All six Equation golden and 25 Equation replay executions preserve canonical-document equality and structured-clone parity.
- `npx tsc -b --pretty false`, `npm run build`, and repo-wide plus focused ESLint passed.
- Display inversion, result intent, History replay, file-size, Surface Protocol, OOE, compartment, seam-impact, CI-alignment, and diff-hygiene gates passed.
- CI and Linux release now require 15 static gates including the Equation carrier contract.

## UI Boundary

- The carrier is not consumed by a live producer, renderer, History path, or copy path. This milestone changes no displayed result and therefore requires no new Playwright run.
- App-visible verification resumes at `EQUATION-OUTCOME-BOUNDARY1`, where the live worker/fallback boundary changes.

## External Limit

- The printer ratchet's seven unit tests pass, but its live inventory reports five unclassified Notebook-owned `resultLatex` paths from the parallel committed Notebook program.
- This milestone adds no printer result path, does not edit Notebook, and does not hide that unrelated debt with a broad registration.
