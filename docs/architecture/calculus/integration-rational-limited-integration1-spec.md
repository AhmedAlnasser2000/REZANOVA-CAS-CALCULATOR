# INTEGRATION-RATIONAL-LIMITED-INTEGRATION1

Date: 2026-10-07
Gate: backend; approved implementation route CRITICAL, root-only.
Status: verified complete on 2026-10-07; the user subsequently authorized a separate commit checkpoint.

## Outcome and boundary

For an explicitly owned Q(x) differential field with D(x)=1, accept normalized f and an ordered finite list g_1,...,g_n. Decide

    D(v) = f + sum_i c_i g_i,   v in Q(x), c_i in Q.

Return the complete affine solution family, including the independent additive constant in v, or checked evidence that no such pair (c,v) exists. This negative outcome is not an elementary non-integrability conclusion about f. Execution exhaustion yields no mathematical decision.

The user selected the complete family rather than one witness. Keep arbitrary rational coefficients, dependent/repeated/zero g_i, and n=0 in scope. Unknown constants c_i are solver outputs; symbolic parameters in the input coefficient field remain deferred. Higher fields, general parameterized RDEs with a nonzero coefficient of v, transcendental admission, parser/UI adoption and public result changes remain later gates.

Production changes stay in src/lib/symbolic-engine/integration/core/. Preserve native BigInt arithmetic, immutable owned values, existing interfaces and private wire formats. No dependency, legacy integration change, staging, commit or push accompanies implementation.

## Existing prerequisites and bounded additions

Reuse:

- differential-admission.ts: owned rational-variable validation;
- exponential-sum-bridge.ts: exact coefficient-by-coefficient conversion between the differential Q(x) owner and the native rational primitive domain;
- hermite-reduction.ts: Hermite reduction and complete reconstruction verifier;
- polynomial-division.ts and polynomial-square-free.ts: exact division, Bezout and square-free evidence;
- linear-system.ts: deterministic rational Gauss-Jordan elimination, rank/nullspace completeness and inconsistency witnesses;
- differential-derivative.ts: independent dual-number derivative verification;
- decision-wire-algebra.ts, rational-decision-wire.ts and rational-rde-wire.ts: exact value and evidence codec machinery;
- execution.ts and artifact-bounds.ts: shared accounting, fresh proof scopes and bounded untrusted traversal.

Add the limited-integration composition, common-residual-denominator proof, coefficient-matrix construction proof, family mapping, explicit-input verifier and separately tagged codec. Small existing Hermite/linear evidence codec helpers may be extracted inside core so their exact schemas are reused without changing existing artifacts. Do not duplicate polynomial, linear-system or differentiation engines.

## Checked reductions

Let h_0=f and h_i=g_i for i>0. Validate every supplied value and retain its normalized denominator before reduction, including zero and dependent inputs. Preserve the original ordered list and index coverage.

For each h_i, use the checked owner bridge and Hermite reduction to construct

    h_i = D(p_i) + r_i.

Here p_i is rational, and r_i is zero or a proper rational function with a monic square-free denominator. Polynomial parts are already integrated into p_i. Replay checks every Hermite certificate, exact bridge conversion and complete input coverage. Retain independently checked derivative evidence for each p_i, with target h_i-r_i, using the differential owner.

Normalize each p_i by requiring the constant coefficient of its polynomial part to be zero. This does not evaluate p_i at x=0, where it might have a pole. Retain/check polynomial division evidence if the existing Hermite identities do not already establish that normalization.

## Common denominator and finite coefficient system

Write each normalized residual as a_i/d_i, with d_i=1 for zero. Construct the monic LCM S of all d_i in input order, beginning with 1.

Retain checked GCD/Bezout evidence and exact quotient/reconstruction identities for each LCM step. Check S is nonzero, monic and square-free, and retain exact quotients S/d_i. This verifies that no residual or factor is omitted. Common denominators are proof devices, not additional source restrictions.

Set A_i=a_i(S/d_i). Verify r_i=A_i/S and deg(A_i)<deg(S), treating zero polynomials explicitly. Then

    r_0 + sum_i c_i r_i = 0

is equivalent to

    A_0 + sum_i c_i A_i = 0.

Build a rational matrix with column i containing all coefficients of A_i and right-hand side -A_0. Use every coefficient from degree 0 through deg(S)-1. When S=1, all residuals are zero and the system has zero rows but still n columns. When n=0, a nonzero right-hand side must be rejected through the existing zero-column inconsistency contract.

Check matrix dimensions before allocation and verify each column/right-hand-side reconstruction. Use deterministic exact elimination and its complete verifier. No coefficient ansatz, degree guess, pole enumeration, root isolation or irreducible factorization is needed.

## Completeness and returned family

Store a fixed proof-rule identifier, rational-limited-integration-hermite-v1, whose executable checks establish the preceding hypotheses.

The necessity proof is: a nonzero proper rational function with square-free denominator has a simple finite pole over an algebraic closure. A derivative of a rational function has either no pole at that point or a pole of order at least two. Thus a proper square-free residual has a rational primitive if and only if it is zero. Polynomial contributions have already been integrated.

For a consistent system, let c^(0) be its particular coefficient vector and d^(1),...,d^(k) its complete nullspace basis. Construct

    v_0 = p_0 + sum_i c_i^(0) p_i,
    v_j = sum_i d_i^(j) p_i.

Return the complete family

    c = c^(0) + sum_j lambda_j d^(j),
    v = v_0 + sum_j lambda_j v_j + C,
    lambda_j, C in Q.

Store each coefficient direction paired with its primitive direction. Do not discard a direction merely because v_j=0: its nonzero coefficient vector can still represent distinct valid solutions. Represent the independent additive constant separately from the matrix nullspace. The normalized representatives v_0,v_j have zero constant coefficient in their polynomial part.

Verification checks exact mapping from the complete linear family, independent derivatives of v_0 and every v_j, and their targets f+sum_i c_i^(0)g_i and sum_i d_i^(j)g_i. Equality and D(x)=1 in owned Q(x) establish that the only remaining rational primitive freedom is C in Q.

For an inconsistent system, retain the full reduction/matrix evidence and a rational row witness y with y^T M=0 and y^T b nonzero. Reject missing reductions, incomplete matrix coverage or invalid witnesses before returning a negative decision.

Document that this residue/linear-system argument is stable under extending the characteristic-zero constant field: a rational inconsistency witness remains contradictory. No arithmetic over complex constants or new constant-extension input is introduced.

## Private interfaces and evidence

Private entry points:

- solveRationalLimitedIntegration(ctx, owner, f, generators)
- verifyRationalLimitedIntegration(ctx, owner, f, generators, decision)
- encodeRationalLimitedIntegration(ctx, owner, f, generators, decision, bounds)
- decodeRationalLimitedIntegration(ctx, owner, f, generators, data, bounds)

Use immutable discriminated variants solutions and no-rational-solution. A solutions decision includes its coefficient particular vector, paired nullspace/primitive directions, independent additive-constant semantics and derivative evidence. Both variants retain exact ordered inputs, bridge/reduction coverage, S and its evidence, the complete matrix/elimination certificate, proof-rule identifier and conditions.

Only the owned Q(x) variable field is accepted. Foreign values, formal towers and incompatible derivations fail with the existing typed errors. Invalid input, owner mismatch, verification failure and resource exhaustion remain distinct; do not introduce an unsupported variant for otherwise valid Q(x) instances.

Retain every input denominator by its original position and, on success, the normalized denominators of v_0 and all primitive directions. Preserve entries despite cancellation or a zero parameter choice. Inputs are already normalized backend values; earlier source-expression exclusions remain the caller's responsibility. No logarithm-norm conditions are needed because these returned primitives are rational.

## Saved decisions and independent replay

Add rational-limited-integration-decision, version 1, preserving all existing formats. Encode exact integer-string coefficients, the base construction descriptor, ordered inputs and every required piece of evidence. Do not serialize callbacks, contexts, owners or trusted verification flags.

Decode against an explicitly supplied expected owner, f and ordered generators; bind reconstructed values to that owner with fresh auxiliary proof domains. Equal printed names alone do not establish compatibility. Bound the complete envelope before nested decoding, reject malformed/noncanonical records, and verify the expected derivation and every input, including duplicate/zero entries.

Replay reconstructs and checks stored reductions, LCM identities, coefficient matrix, elimination, family mapping, derivatives and conditions. It must not call the limited-integration solver, Hermite-reduction producer, linear solver or derivative producer. Ordinary checked arithmetic used by the verifiers remains permitted.

Every external entry starts fresh proof state, including repeated calls with the same ExecutionContext. All nested work uses the same cumulative context. Do not change ExecutionContext.operation() to implicit scope reuse; any internal composition helper must preserve the existing public freshness contract.

## Resources and acceptance

Use the existing explicit profile: work 20 billion, cumulative allocation 1 trillion, integer bits 2,048 and polynomial degree 256. Artifact limits are caller-supplied; initial tests use depth 64, 100,000 nodes and 16 MiB. Differential construction checks retain the existing tower bound 8; accepted mathematical inputs are still only Q(x).

Check sizes and safe index conversions before coefficient/matrix/array allocation. Charge input traversal, bridge conversions, arithmetic, evidence, matrix construction, verification and codecs. The common denominator may exceed the configured degree even when individual inputs fit; report resource exhaustion rather than truncating or rejecting mathematically. Add no hidden generator-count ceiling. Larger test profiles must be explicit.

Retain the existing core tests (521 at this planning checkpoint). Add:

- n=0, zero/constant/polynomial inputs, empty matrix dimensions and all-residuals-zero families;
- unique coefficient choices, free coefficient directions, duplicate/dependent/zero generators, and zero primitive directions with nonzero coefficient directions;
- f=1/x+1/x^2, g_1=1/x: c_1=-1, v=-1/x+C;
- f=1/x, g_1=1/x, g_2=2/x: c_1+2c_2=-1, v=C;
- f=1/x with no generators: no rational primitive, with no non-elementarity claim;
- f=1/(x-1), g_1=1/x: an impossible coefficient family;
- repeated poles, irreducible quadratic and higher-degree denominator factors, common/nonmonic denominator sources and proper residual cancellation;
- exact coefficients beyond 2^53, alternate variable names, foreign owners, forged values and operand immutability;
- seeded complete positive families built from known rational primitives and independent negative fixtures;
- mutated reduction targets, missing inputs/factors/coefficients, LCM quotients, square-free evidence, matrix signs, rank/nullspace coverage, family mapping, derivative evidence and conditions;
- positive/negative artifact replay with producers disabled, wrong expected inputs/order/owner, malformed data, fresh proof state and unchanged existing codec coverage;
- work/allocation/integer/degree exhaustion across construction and checking, plus artifact traversal/size exhaustion. Exhaustion never returns a mathematical negative.

Record representative serial timings and work/allocation for solving, standalone verification, encoding and decoding; no timing-sensitive acceptance threshold. Include dependent-family and mixed-pole corpora to expose unnecessary matrix/denominator growth.

## Verification and handoff

Run focused core Vitest with two workers, incremental TypeScript, scoped lint, isolation, compartment/OOE, memory/file-size and diff checks. If shared codec helpers are extracted, run the affected old/new replay coverage. Application behavior does not change, so no Playwright gate applies. Repository lint/build remain gates for a separately authorized commit.

Update specification, roadmap, current state, decisions, journal and milestone dossier. Completion wording: verified complete rational limited-integration solution families and impossibility certificates over Q(x), with replayable completeness evidence.

The next planned gate is one-logarithm rational decisions. Its representation, polynomial-reduction and admission prerequisites require separate review; completion here does not authorize that gate.

## Executable proof obligations

`rational-limited-integration.ts` composes the existing owned rational bridge, Hermite verifier, exact linear verifier and independent dual derivative checker. Its auxiliary `FormalPrimitiveDomain` owns all native polynomials and fractions; original and returned differential elements remain bound to the explicit caller owner.

- `LimitedReduction` records the original index, native input, complete Hermite certificate, bridged primitive/residual, polynomial quotient/remainder normalization and dual derivative evidence. The verifier checks every original index exactly once, exact bridges, zero polynomial-part constant, and the target h_i-r_i.
- Each `LimitedLcmStep` certifies gcd(S_previous,d_i), both exact gcd quotients, and S_next=(S_previous/gcd)d_i. A final Bezout certificate for (S,S') proves square-freeness. Residual quotient and numerator arrays are checked for complete coverage and degree strictly below deg(S).
- The matrix includes every coefficient below deg(S), including zero rows. The stored Gauss-Jordan operations, rank, free-coordinate identity and residual tests prove the full affine coefficient family. Negative row witnesses are checked only after all preceding obligations.
- Family pairs use the corresponding particular/nullspace vector verbatim and an exact checked linear combination of the p_i. Their derivatives are independently checked against the original input combinations. Polynomial division establishes the canonical representative even when x=0 is a pole. An explicit `arbitrary-rational` field retains C independently of the coefficient parameters.
- Conditions record all input denominators by position and all returned representative denominators. S does not enter the conditions merely because it is a proof denominator.

For completeness, after any coefficient choice the combined residual is A/S with deg(A)<deg(S). Cancellation cannot create multiple poles: its reduced denominator divides the square-free S. If A is nonzero, properness rules out a nonzero polynomial and at least one simple finite pole remains over an algebraic closure. Differentiation of a rational function has no simple-pole Laurent coefficient: differentiating a constant term gives zero and differentiating a negative power gives order at least two. Therefore D(v-p_0-sum(c_i p_i))=A/S forces A=0. Conversely A=0 gives the displayed rational primitive. The constants of Q(x) with D(x)=1 are exactly Q, proving the separate and complete additive freedom.

For any characteristic-zero constant extension K/Q, the verified Bezout identities remain identities over K, hence S stays square-free. The same pole proof applies over an algebraic closure of K. The rational coefficient matrix has the same rank over K: its nonzero rational pivot minors remain nonzero. A rational inconsistency witness y remains contradictory, and a consistent rational particular vector and nullspace basis span all K-valued coefficient solutions after scalar extension. This justifies descent without adding K-arithmetic or accepting symbolic input parameters.

`rational-limited-integration-wire.ts` bounds the entire version-1 envelope before nested reconstruction, creates a fresh native proof domain and binds differential values to the expected owner. Stored inputs retain their original order. `hermite-wire.ts` and `linear-wire.ts` share the existing exact schemas; old rational-decision/RDE encodings retain their field names and nesting. Replay never calls the limited-integration, Hermite, linear or differential-derivative producers. Ordinary polynomial arithmetic and identity verification remain permitted.

Every public operation opens a fresh execution proof scope. No new proof cache is introduced. Coefficient matrix and potential complete-nullspace dimensions are checked exactly before safe index conversion; actual arithmetic, traversal and storage are charged to the same cumulative context. The public arithmetic limits and all existing formats are unchanged.

## Completion evidence

- All 521 retained core tests and 78 additions pass: 599 tests across 38 files, two workers, 134.01 seconds. This includes the existing nested arithmetic stress cases, isolation, rational/RDE codecs, exponential decisions, normalization and producer-disabled replay.
- Incremental TypeScript, scoped ESLint, OOE/compartment boundaries, memory protocol, file-size checks and scoped diff/new-file whitespace hygiene pass. No application output changed; no Playwright gate applies. Repository lint/build remain gates before a separately authorized commit.
- Serial five-case measurements used two warm-ups and five samples per operation with fresh contexts. Solving medians were 4.140–100.148 ms; standalone verification 2.110–49.824 ms; encoding 2.424–56.723 ms; decoding 2.998–69.604 ms. Counters, min/max, limits and process-memory observations are recorded in the milestone dossier, with no timing-sensitive assertion.
- Complete dossier: `.memory/sessions/2026-10/2026-10-07/2026-10-07__integration-rational-limited-integration1/`. Production changes stay inside the private Integration core. Concurrent Graphing/Equation work remains outside this milestone; no staging, commit or push was performed.

Completion: **verified complete rational limited-integration solution families and impossibility certificates over Q(x), with replayable completeness evidence**.

## Sources and attribution

Hermite reduction and the square-free residual structure: [Bronstein, Symbolic Integration Tutorial, §§1.2–1.3](https://www.math.kobe-u.ac.jp/HOME/taka/2007/knx/bronstein-tutorial-issac98.pdf). The family construction above follows by exact linearity and the stated simple-pole proof; the certificate design is grounded in the existing kernel modules listed above.

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

## Separately authorized commit checkpoint — 2026-10-07

The user authorized a separate milestone commit after publishing main reconciliation 012f2259. The exact staged source passes repository lint/build (41.59 s), 140 affected replay/isolation tests with two workers (4.76 s), and final memory/file-size/boundary/diff checks. Earlier 599-core-test evidence is retained. Three earlier Codex contract-planning notes are included at explicit user request; they change no production behavior. No Integration push is authorized by this checkpoint.
