# INTEGRATION-DIFFERENTIAL-FIELD1

Date: 2026-09-30
Gate: backend; CRITICAL, root-only.
Status: complete: backend implementation, mathematical verification and workflow checks passed; milestone commit authorized.

## Scope and interfaces

This gate adds exact recursive differential arithmetic with certified first-level exponential/logarithmic construction and replayable evidence. All production changes are private integration core files. There is no parser, UI, result-contract, legacy integration or automatic transcendental integration change. No dependencies, staging, commits or pushes are authorized. The broader roadmap remains subject to change when necessary.

Prerequisites are the existing owned BigInt rational field, polynomial/fraction arithmetic, checked exact division, Euclidean GCD, square-free decomposition and execution context. `DifferentialField` implements the existing exact-field interface with a uniform owned element wrapper: a Q scalar or an existing normalized rational function whose coefficients are owned elements of its parent. It does not replace existing representations or their formal partial derivatives.

- `DifferentialField.rationals` constructs Q with zero derivation.
- `DifferentialField.rationalFunctions` constructs Q(x), with D(x)=1, over an explicitly supplied Q owner.
- `DifferentialField.formal` constructs K(t) from polynomial rule coefficients owned by K. Each generator and ring has its own identity. Names establish no compatibility.
- `embed` promotes only through actual ancestor owners; `make` and `fraction` use existing normalized fraction construction.
- `differentiate` returns immutable input/derivative evidence after verification. `verifyDerivative` accepts an explicit target input and supplied evidence.
- `buildExponential` accepts a finite rational-multiple family over Q(x), including zero aliases. `buildLogarithm` accepts one nonzero nonconstant rational argument over Q(x).
- `DifferentialField.certified` copies certificate containers and verifies the snapshot before returning a certified owner. Caller containers are not frozen or mutated. `verifyAdmission` independently replays that evidence.
- `encodeDifferentialArtifact` and `decodeDifferentialArtifact` implement the separately tagged version-1 field artifact. Existing codecs are unchanged.

Every formal extension has `constantField: unestablished`, including extensions above a certified field. Only Q, Q(x), and successfully admitted first-level function extensions claim Q constants. An element with derivative zero is not automatically converted into a rational scalar. The test D(t−x)=0 with D(t)=1 retains t−x as a nonzero formal element.

## Independent total differentiation

The producer differentiates coefficients recursively and adds the formal partial derivative times D(t). Rational functions use the quotient rule. These are private computational helpers: no unchecked derivative is returned.

The verifier follows a separate path. It evaluates the canonical representation by Horner arithmetic in pairs (value, tangent), mapping each coefficient recursively and mapping t to (t,D(t)). Pair multiplication is (a,b)(c,d)=(ac,ad+bc), and inverse is (a,b)⁻¹=(a⁻¹,−ba⁻²). The verifier checks both the value and tangent against the explicit input and candidate. It never calls the coefficient-differentiation producer. Primitive arithmetic and ownership checks are shared.

Both paths operate on exact formal generators. A nested rule may refer only to coefficients of the immediately preceding field; ancestor promotion must be explicit. Stored rules and values are immutable. No symbolic zero oracle is introduced.

## Admission proofs and hypotheses

All admissions below are over Q(x), characteristic zero, with constants Q, and a normalized, coprime rational argument. These are sufficient first-level admission criteria; they are not general dependency or constant-field algorithms. The mathematical framework is [Kaltofen, Lemmas 2.2–2.4](https://kaltofen.math.ncsu.edu/bibliography/84/Ka84_integration.pdf). The distinction between a formal monomial and an admitted exponential/logarithmic monomial also follows [Bronstein, section 3.1](https://www.math.kobe-u.ac.jp/HOME/taka/2007/knx/bronstein-tutorial-issac98.pdf).

### Exponential

For nonconstant r, set D(t)=D(r)t. A rational logarithmic derivative v′/v has only simple finite poles and has zero polynomial part. For any nonzero integer n:

- If r is polynomial, nr′ is a nonzero polynomial. The certificate verifies the derivative, its constant denominator and its nonzero numerator.
- Otherwise, choose the first factor in the verified square-free decomposition of r's denominator. At each root of this factor, r has a pole of order m, hence r′ has order m+1≥2. The verifier checks that the derivative's normalized denominator is divisible by the factor to exactly order m+1, using checked division and coprimality of the remaining cofactor.

Consequently nr′ cannot equal v′/v. This excludes the exponential dependence/constant-extension obstruction for every n, without searching finitely many n. The new transcendental generator represents exp(r), with constants still Q. Its argument denominator is retained as a nonvanishing condition.

For a batch, every ratio to a nonzero reference must be a rational scalar. Integer GCD/LCM produces a common argument and signed integer exponents with GCD one. The leading numerator coefficient of the common argument is positive, making its orientation independent of input order. The verifier checks each exact argument reconstruction, sign convention and exponent GCD. Zero arguments have exponent zero and alias 1; an all-zero batch returns the supplied Q(x) without an extension. Nonzero constant exponentials require a future constant-extension policy.

Additive constants are retained: a single exp(x+1) is admissible, whereas the family exp(x), exp(2x+1) is outside this rational-multiple admission. Its missing constant is never discarded.

### Logarithm

For nonconstant nonzero r, set D(t)=r′/r and record `chosen-local-log` semantics. Verified square-free decompositions of the coprime numerator and denominator exhibit a nonconstant square-free factor with multiplicity m. The logarithmic derivative has residue +m at its numerator roots or −m at its denominator roots. The selected factor is canonical: first numerator factor if available, otherwise first denominator factor. Reconstruction, square-freeness and numerator/denominator coprimality establish this nonzero residue at every root of the selected factor, without isolating or factoring its roots individually.

A derivative of a rational function has zero residues at every finite pole. Thus r′/r has no rational primitive. The primitive-extension criterion establishes a transcendental local logarithm with constants Q. Both numerator and denominator nonvanishing conditions remain in the evidence, even when constant.

The certificate does not select a principal branch or identify logarithms of products with sums. Zero is invalid. Constant logs, including a branch-unspecified log(1), require the deferred constant/branch policy. Distinct construction owners cannot be equated because their names or derivatives match.

## Unsupported outcomes

Builders return a typed `unsupported` result with `constant-extension`, `not-rational-multiples` or `first-level-only`. Zero logarithms are invalid input. Domain mismatch, failed verification, arithmetic errors and resource exhaustion retain existing typed algebra errors. There is no guessed zero, heuristic admission, non-elementarity result or general simultaneous/mixed/nested function admission. Deeper *formal* towers remain supported.

## Artifact and resource contract

`differential-field-artifact`, version 1, stores an ordered tower, exact coefficient trees, rules, admission certificates/conditions, selected elements and derivative claims. Scalar coefficients and exponents use canonical integer strings. Field references are table levels; coefficients must refer to the preceding level. There are no callbacks, context objects or serialized trust flags.

Decoding accepts an explicit expected owner/construction. It bounds and validates plain data before interpreting it, reconstructs fresh owners, rejects changed canonical representations, replays admission/derivative verifiers, and compares the full expected construction, not just variable names. An equivalent freshly constructed owner may be used as the expectation; original runtime identity is never serialized. Replaying never invokes `differentiate`, `buildExponential` or `buildLogarithm`. Formal constructors and verified arithmetic still reconstruct values.

Separate caller-supplied bounds govern tower height, artifact depth, nodes and bytes. Tests use height 8, depth 64, 100,000 nodes and 16 MiB, with arithmetic limits work 20 billion, allocation 1 trillion, 2,048 integer bits and degree 256. There are no application defaults or hidden algebraic degree ceilings. A small `ExecutionContext.exhaust` method makes additional safeguard failures sticky like the existing limits. Work, allocation, exact size checks and verification use the same request context. Artifact traversal rejects cycles, forward references, holes, accessors, hidden properties and incompatible values. Traversal counts bytes conservatively before string construction; encoding reserves scratch and validates its final data tree.

All derivative/admission/replay entry operations start fresh operation scopes. No new proof cache or cross-operation trust was introduced. Native BigInt and recursive arithmetic remain synchronous; greater depth can be expensive even for small expressions.

## Acceptance and evidence

- All 138 existing core tests retained, including old scalar/primitive/decision codecs and isolation.
- 40 new tests cover exact derivatives, arithmetic laws, large coefficients, nested coefficient differentiation, five-level towers, honest constants, admissions, rational-multiple batches, conditions, mutations, immutable snapshot ownership, fresh replay and exhaustion.
- Replay tests disable all three function/derivative producers while decoding successfully.
- The full initial core run passed 176 tests; final additions/accounting corrections passed all 40 new tests plus isolation. Combined current coverage is 178 tests.
- Incremental TypeScript, scoped lint, compartment/OOE and diff checks are required. Final results and serial measurements are recorded in the milestone dossier.
- No Playwright gate applies: application behavior and mathematical display are unchanged. Repository lint/build remain gates for a later separately authorized source commit.

## Handoff

Next work needs a reviewed lower-field algorithm scope: broader dependency/constant-field admissions and the rational differential equation, limited-integration and logarithmic-derivative obligations used by transcendental integration. No automatic exp/log integration is enabled by this foundation. Parameters, algebraic constants, parser lowering and public representation/adoption are deferred. Roadmap sequencing remains subject to change when necessary.

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

Commit authorization (2026-09-30): the user separately authorized this verified milestone commit. No push or next-gate implementation is authorized.
