# Exact modular polynomial resultants and number-field norms

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

## Scope and prerequisites (backend)

The checked finite-number-field representation, exact coefficient conversion and scalar modular LU/CRT evidence are prerequisites. Distinct native polynomial-resultant and norm certificates now compose these mechanics. Polynomial coefficient domains and modular quotients remain rings with checked inverses. Existing Brown indexed PRS APIs, scalings, algebraic factorization transcripts and version-one formats are unchanged. These new private interfaces do not yet replace every norm embedded in older transcripts.

## Complete specialization and reconstruction

For A,B in C[X][Y], let m,n be their Y-degrees and a,b their maximum coefficient X-degrees. Every Sylvester determinant term uses n coefficients of A and m of B. Thus D=n*a+m*b bounds the ordered resultant's X-degree. Zero and constant cases retain exact scalar-power identities under the existing ordered convention.

Enumerate integer points 0,1,-1,2,-2,... and accept only points preserving both Y-degrees. Nonzero leading coefficients have finitely many roots, so enough good points exist in characteristic zero. Rejected points grant no authority. Retain D+1 distinct accepted points and their checked exact scalar-resultant certificates. A polynomial of degree at most D agreeing with them is unique. Replay verifies all scalar identities, degrees, distinct points and coverage without interpolation, prime search, modular LU, GCD or PRS producers.

Production computes Newton scalar divided differences first and trims zero high coefficients before constructing polynomials. A loose D alone therefore does not create a larger polynomial degree. Charge point traversal, arithmetic, evidence and temporary arrays; check exact dimensions before allocation/index conversion. Sticky exhaustion has no alternative algorithm.

For L=C(alpha), transpose every reduced coefficient of G in L[X] into C[X][alpha]. Verify forward coordinates, inverse native reconstruction and the complete original monic relation P. The norm is Res_alpha(P,G), the determinant norm of multiplication in the power basis. Linear presentations have degree one. Supplied owners/embeddings remain; numerical root matching supplies no authority.

## Source

[Moreno Maza and Pan, section 2](https://www.csd.uwo.ca/~mmorenom/Publications/MP11-HPCS.proceedings.pdf), PDF pages 2–3, describes degree-preserving evaluation/interpolation for resultants. This implementation uses deterministic integer points and checked scalar modular LU; it does not adopt the paper's random FFT grids, GPU execution or multivariable encoding. The explicit bound, uniqueness and termination arguments above are this implementation's proof obligations.

## Ownership, resources and replay

Separate version-one tags are `number-field-polynomial-resultant` and `number-field-polynomial-norm`. Bound entire artifacts before decoding nested evidence. Bind complete coefficient constructions to expected owners/inputs and rebuild fresh auxiliary polynomial/scalar domains. Reject forged polynomial-domain callbacks before invoking arithmetic. Native registration, original relations, complete coefficient conversion and scalar identities carry authority; names, references and flags do not. Auxiliary conversion creates no source restrictions.

## Evidence and remaining work

- `polynomial-norm-height-tests.log`: 23 focused/retained checks pass. Coverage includes known identities, Brown comparisons, bad points, seeded rationals, relative nested norms, linear relations, height-eight replay, mutated coverage/transpositions/relations, immutable operands and cold/sticky budgets. Replay disables search producers, including prime enumeration and modular LU.
- Incremental TypeScript/scoped lint pass (`typecheck-polynomial-norm-height.log`, `lint-polynomial-resultant-norm.log`). Logs remain under ignored `.task_tmp/2026-10-14__integration-performance1/`.
- Both subsidiary workloads complete two warm-ups and all five fresh serial cycles in ignored `measurements/polynomial-resultant-norm-serial.json`. Earlier `polynomial-resultant-norm.json` overlapped an outstanding TypeScript command and supplies no accepted serial measurement; it is preserved. The subsequent record ran after that command completed. These small fixtures replace no named target or final corpus/control observation.
- Integration-negative compaction, typed norm composition into legacy-history consumers and final current-source corpus/control/UI acceptance remain. Gate 2 is incomplete. No serial measurements are staged; no commit or push.

### Unit-coefficient content certificate (2026-10-15, backend)

- Prerequisite: the existing privately registered sparse polynomial ring is over an exact field. A nonzero scalar coefficient is a unit in the coefficient polynomial ring, so the common coefficient divisors are units; monic content is exactly one. The distinct `unit-coefficient-v2` witness retains its coefficient index and complete native primitive. Verification checks the indexed coefficient, exact reconstruction and owner; it does not infer content from a failed PRS.
- The original ordered coefficient-GCD chain remains a separate native/wire branch with its original complete checks. Producers choose the unit witness before any GCD computation. Without a scalar unit they retain the complete general algorithm. No exhausted computation triggers an alternative.
- This avoids unnecessary intermediate coefficient growth in monic multivariable recombination. The previously stopped cubic construction now passes under unchanged integer limits (`unit-content-cubic-tests.log`, 16 affected checks); no prior stopped operation was retried unchanged.
- Recorded/verified by codex, model gpt-6, family sol; live source and focused execution.

### Typed norm-consumer composition (2026-10-15, backend)

- Trager components now choose the complete modular/interpolated polynomial-norm certificate only for registered finite constant towers over Q. This applicability check precedes computation. Function-field coefficients retain the original full Brown producer and verifier.
- The distinct `number-field-polynomial-norm-v2` record carries the full checked transpose, exact original shifted polynomial, degree-preserving scalar resultant evidence and reconstructed norm. It never impersonates a subresultant transcript. Square-free norm, complete parent factorization and GCD recovery consume the exact norm through a typed accessor; their original irreducibility obligations remain.
- Nested replay reconstructs fresh polynomial owners bound to the supplied parent and outer variable; norm verification checks conversion in both directions and the complete interpolation identities. Original untagged Brown records still receive the complete original PRS checks. Source exclusions and native owners do not change.
- Focused norm/composition/authority coverage passes 27 checks (`norm-composition-tests.log`); new composition replay disables factorization, norm and resultant producers. Final static/retained refresh and full-corpus observations follow separately.
- Recorded/verified by codex, model gpt-6, family sol; live source and focused execution.

## Final acceptance — 2026-10-15

The typed consumer/integration composition, original and new replay, native mutation/cold-limit checks and final serial corpus now pass. The earlier doubled-origin/cubic content stops are resolved by checked finite-order filtering and the distinct scalar-unit content witness; no limit is raised. The performance gate passes its named hard targets, wider corpus/controls and current adopted visual acceptance. Full evidence paths and source qualifications are in verification-summary.md; raw observations remain ignored and unauthorized for commit. Recorded/verified by codex / gpt-6 / sol, live attribution.
