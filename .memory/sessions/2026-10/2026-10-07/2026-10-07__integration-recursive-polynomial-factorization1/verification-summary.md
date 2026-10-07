# Recursive factorization — verification

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

## Backend checkpoints

- 2026-10-07: user approved complete Q/registered recursive factorization, CRITICAL root-only. No subagents. Subsequent explicit instruction authorizes one milestone commit; no push or recursive RDE/admission implementation.
- Checkpoint A passed before recursive activation: 14 initial rational tests; 32 focused arithmetic tests including existing polynomial and multivariate coverage; incremental TypeScript, scoped lint, kernel isolation, OOE/compartment and file-size checks. Exact units/multiplicities, modular Frobenius certificates, nonmonic/repeated factors and z^4+1 rejection coverage are checked. An initial test coefficient was corrected to the independently intended nonmonic product; the algorithm was not weakened.
- Checkpoint B passes Q(x), two/three/deeper registered fields and height-eight native/differential owners; sparse multivariate specialization/lifting, nonconstant leading coefficients, nested denominators, exact large coefficients, seed identities, ownership, immutability, complete native correspondence and exhaustive irreducibility coverage. All four arithmetic-limit categories and exhaustion in conversion/modular/lift/recombination/verification/decode are checked. Prime-power/truncated rings receive no field capability.
- Producer-disabled replay checks stored finite irreducibility, p-adic/local lift identities, recovery/content, subset rejections, square-free components and native reconstruction without running factorization, prime/point search, Berlekamp, lifting, recombination, content or square-free producers. Fresh expected owners, altered input, malformed/cyclic/accessor data and mutable custom domains are covered.

## Test evidence

- `npx vitest run src/lib/symbolic-engine/integration/core --maxWorkers=2`: 47 files, 773 tests pass, 133.42 s. Includes all 697 retained tests and 76 new tests. Production is unchanged afterward. Nine additional test-only cases pass in the final focused run; no full-suite rerun is required for that delta.
- Final six factorization test files, two workers: 85 tests pass, 18.14 s. Combined retained/new coverage is 782 core tests, not a claim that one final 782-test aggregate run occurred.
- Five affected New Integration files (`service`, `result`, `exponential-service`, `exponential-result`, `exponential-replay`), two workers: 80 tests pass, 23.84 s. Existing service/result/worker ownership is unchanged.
- Final `npx tsc -b` and scoped ESLint over 26 changed/new TypeScript files pass. Repository lint passes with zero errors and one pre-existing Graphing ref-cleanup warning.
- Final repository build passes including TypeScript (Vite 41.38 s). Isolation remains covered by the unchanged-production core run. OOE boundary tests 8/8, compartment tests 36/36, memory protocol tests 24/24, file-size tests 10/10 and each validator pass. Tracked and new-file diff hygiene passes; no cap/enforcement baseline is widened.
- No Playwright applies: this milestone changes private arithmetic/proof machinery and no application behavior or rendered output. No UI visual verification is claimed.

## Serial observations and diagnostics

Five fixtures each complete two warm-ups and five serial observations for factorization, standalone verification, encoding and decoding with fresh contexts/proof scopes. JSON parse/file I/O and fixture construction are excluded. Exact counters and post-timer RSS/heap observations are retained in `serial-observations.json`, summarized in `performance-results.md`.

The height-eight fixture medians are 220.294/111.290/110.097/202.031 ms for factor/verify/encode/decode. Its separate single construction observation is 13,760.679 ms. Earlier interrupted profiling isolated nested native coefficient Euclid/unit normalization; checked sparse square-free/content/reconstruction and operation-scoped registered zero/one reuse avoid that repeated work. Diagnostic elapsed times are not a reproducible speedup claim. The user-facing timing was corrected immediately to these raw measurements.

## Scope, Git and memory

Started clean on main at 651e7812, ahead of local origin/main by one existing logarithmic milestone. No remote mutation, history rewriting or unrelated source edits. Production stays in Integration core; existing arithmetic signatures, Brown outputs and private formats are preserved. Completion proof is in `proof-dossier.md`. Updated specification, provisional roadmap, current state, decisions and the original 2026-10-07 journal; dates/other authorship remain intact. One user-authorized gate commit follows successful repository checks, with containing-commit metadata in the same checkpoint.

Git initially refused the authorized commit due to absent author configuration, before writing a commit. Existing author/committer history and the previous checkpoint explicitly establish the same command-local recovery identity. Reuse it for this command only; source/test evidence remains unchanged.
