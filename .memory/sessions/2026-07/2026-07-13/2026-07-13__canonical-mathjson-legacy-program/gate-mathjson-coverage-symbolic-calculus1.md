# MATHJSON-COVERAGE-SYMBOLIC-CALCULUS1 Gate

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

- kind: backend producer coverage plus app-visible parity
- result: pass
- intentional mathematical or visible output change: no
- push: not authorized

## Coverage Evidence

- All 80 Calculus replay leaves are classified: 64 producer-proven MathJSON leaves and 16 exact bounded exemptions.
- Derivatives, partials, integrals, limits, series, Laplace transforms, ODE/IVP, implicit differentiation, and stored substitutions retain producer-owned native evidence through the final Calculus adapter.
- Exemptions are limited to mixed operator/applied/detail labels and the established malformed derivative-at-point compatibility strings. No result LaTeX is reparsed to manufacture a tree.
- The global 100-fixture baseline is 262 leaves: 149 proven, 20 exempt, and 93 missing in later workspace lanes.

## Payload Evidence

- 25 Calculus documents total 19,673 serialized bytes; the global maximum document remains 2,753 bytes.
- Three benchmark reruns each use five cold and 50 warm structured-clone corpus passes.
- Warm P95 is 0.175-0.181 ms per 25-document pass, approximately 0.007 ms per document, below the accepted prior per-document evidence.
- MathJSON, document, and History limits remain unchanged.

## Verification

- Broad Calculus/Symbolic regression: 156 files and 1,022 tests pass.
- MathJSON coverage, result contract, Equation solve-result, History replay, golden, print hygiene, feature probes, printer, inversion, seam, OOE, and compartment gates pass.
- TypeScript, global lint, production build, file-size ratchet, and diff hygiene pass.
- Replay refresh changes 38 fixtures only by canonical proof-presence lines; print hygiene adds seven duplicate canonical-payload fragments. Identity, cardinality, visible LaTeX, and mathematics are unchanged.
- Chromium: 11 Calculus smoke tests pass. Seven inspected cards cover derivative, implicit derivative, integral, one-sided limit, Maclaurin, Laplace, and numeric IVP with no horizontal overflow.

## Exclusions

- Concurrent Notebook source, styles, tests, and untracked `test-results/` remain unstaged and untouched.
- Existing Laplace table-detail notation is recorded for separate presentation review, not changed here.
