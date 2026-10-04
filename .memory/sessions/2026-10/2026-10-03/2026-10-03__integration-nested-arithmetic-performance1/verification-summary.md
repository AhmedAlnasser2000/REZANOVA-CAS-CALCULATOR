# INTEGRATION-NESTED-ARITHMETIC-PERFORMANCE1 verification

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-6
- verified_by_agent_family: sol
- attribution_basis: live

## Status

Backend milestone, CRITICAL root-only; implementation authorized October 3, completed October 4. User authorized one final commit; no push. Performance and correctness acceptance pass. Final memory/staged-diff validation is required immediately before commit.

## Implementation and checkpoint evidence

- Baseline core extracted from `b452798ed1d03f8441bcddcfea4c1f65aa1ab00a`. Before edits the current core matched it exactly. Temporary baseline/profiles/logs live in `.task_tmp/integration-nested-arithmetic-performance1/`.
- Checkpoint A replaces a second normalized-pair GCD with a reconstructed nonzero constant Bezout combination. One-sample shifted integration/verification: 31.224 s / 11.341 s. Quadratic input construction still exhausts at integer-product-bits. Acceptance not met.
- Checkpoint B clears coefficient denominators into K[x][t], removes checked primitive content between pseudo-remainders, carries denominator-scaled Bezout witnesses, cancels their common factors and checks the existing final divisibility/monicity/Bezout contract. Constants and zero retain ordinary Euclid; unregistered/custom coefficient domains retain the generic path.
- Checkpoint B preliminary shifted integration/verification: 8.831 s / 2.826 s. Quadratic and inverse-exponent cases now finish both assembly paths, integration, verification, encoding and decoding at unchanged limits. These are checkpoint observations, not final acceptance medians.
- 34 focused core/adoption test files: 517 tests passed in 143.08 s with two workers (470 retained core, 7 initial additions, 40 affected adoption tests). Final delta: 14 tests pass (120.22 seconds), including four later additions and all new stress/replay cases. Covered inventory is 481 core plus 40 affected adoption tests.
- Incremental TypeScript and scoped ESLint passed initially. Final repository lint/build pass after all additions; one existing Graphing hook warning, no lint errors; Vite build 36.23 seconds.
- No new proof cache, shared-denominator verifier path or derivative-checker change was needed at checkpoints A/B. Checkpoint C is omitted because A/B pass acceptance.

## Visual evidence

Through `npm run dev` on localhost:1420, Playwright Chromium rendered the polynomial integral, 1/(x^2+1) root-log result and x/x source exclusion. Answer cards, formal semantics, Conditions and verification details were inspected in screenshots. No overflow at 1280 px. The initial smoke accidentally observed a previous result while computing; that evidence was discarded and the corrected smoke waited for the worker to finish and the earlier-expression notice to disappear. Browser and owned dev server were stopped.

## Final acceptance and boundaries

- Full serial acceptance passes: two warm-ups/five measured runs, same baseline verification artifact, same Node/machine/limits. Shifted 10.25x integration and 10.99x verification; quadratic/inverse complete all six operations. All 149 non-target comparisons pass; 53 nested and 110 broader candidate operation groups.
- Producer-disabled positive/negative historical replay, fresh-state/mutation/resource tests pass. Final lint/types/build, isolation, OOE, compartments and file sizes pass.
- Separate diagnostics show quadratic accepted peak bits 2011 -> 619 (direct) / 435 (ordinary), inverse 1987 -> 502 / 316. Baseline paths exhaust; candidate paths complete. Diagnostic timings are excluded from performance acceptance.
- Performance-results and six JSON files preserve timings/spread, counters, process memory, baseline artifact identity and separate growth samples. Completed baseline results were retained across interrupted candidate attempts; incomplete candidate runs were discarded.
- No new proof cache, hidden restriction, larger limits, artifact version or capability. Mathematical checking remains exact and independent. No broad speed guarantee.
- Durable memory updated: current-state, decisions, open-questions, October 4 journal and this dossier. Specification/provisional roadmap updated. User-authorized commit metadata is in commit-log.

## Baseline artifact provenance

- `exponential-rational-shifted-b452798e.json`: produced by untouched b452798e code; SHA-256 `519ee683ea5171aec00158bc440e6294c7f25449dddd206f0f1f6cd745c81fb6`. The shifted fixture is the full stress decision; the negative fixture is the nonconstant-residue obstruction.
- `exponential-rational-negative-b452798e.json`: produced by untouched b452798e code; SHA-256 `42018885b1f90c8d80fc0408bbf25cbd0f5ff72760918f995afecc14a87cd47c`. The shifted fixture is the full stress decision; the negative fixture is the nonconstant-residue obstruction.

Separate baseline CPU profile of the quadratic input paths: 12,503 samples; exact integer validation 68.8%, integer remainder 12.9%, integer GCD 3.7%, rational construction 3.2%. These are sampled self-time proportions, not inclusive times to add to caller costs.

## October 4 continuation

- Same root-only owner resumed the existing gate. Interrupted candidate timings are incomplete and excluded; completed five-run baseline data remains intact. Candidate and broad-corpus timing restart is serial and uses the same baseline artifact, limits, machine and Node version. User authorized the final milestone commit after acceptance and repository lint/build.

Final nested harness passed: shifted 89.930 -> 8.778 s integration (10.25x), 32.334 -> 2.942 s fresh verification (10.99x), decoding 49.581 -> 4.470 s. Quadratic integration/verification/replay 19.612/6.771/10.467 s; inverse 13.621/4.697/7.203 s. All five measured samples complete, with identical target baseline verification artifact and unchanged limits. Broader regression acceptance and commit checks subsequently passed; final memory/staged-diff gates are recorded below.

## Final commit gates (October 4)

- Memory protocol, file-size validation and diff hygiene pass after final records. Repository lint/build and boundary checks pass; the only lint finding is the pre-existing Graphing warning. Kernel source stays private and all owned verification/preview processes have completed. User-authorized commit is one milestone; no push.
