# EQUATION-REPRESENTATION1 — Representation Specification

Date: 2026-10-03
Status: implemented and backend-verified on 2026-10-03; private foundation only, with no production caller and no solving yet.
Gate: backend only, one milestone. Stage 4 of the [roadmap](equation-reconstruction-roadmap.md).

Dependencies: [`EQUATION-EXACT-ALGEBRA1`](equation-exact-algebra1-spec.md) and [`EQUATION-ALGEBRAIC-NUMBERS1`](equation-algebraic-numbers1-spec.md). No dependency, schema, workspace or production caller is added.

## Outcome

This gate builds the native representation that every solving slice uses:
- an expression graph;
- relation problems;
- transform records with a replayable proof log and an independent verifier;
- termination tools;
- the solution-set algebra with the outcome taxonomy;
- a pure-data MathJSON reader and writer;
- a strict wire codec.

User decisions (2026-10-03):
- the full elementary vocabulary now;
- a builder API plus a pure-data MathJSON reader, with no Compute Engine import;
- commit, push and PR automatically when green.

## Implemented contracts

All new code is under `src/lib/symbolic-engine/equation/core/representation/`.

### Digest (`digest.ts`)

- Pure-TypeScript SHA-256, checked against the FIPS 180-4 vectors.
- It gives store-independent canonical keys and state hashes.
- The core imports nothing outside itself, so it cannot use `node:crypto`. The digest is also host-independent.

### Expression graph (`expression.ts`)

**Nodes.** `ExpressionStore` hash-conses every node, so equal expressions have one id. Node kinds:
- `number`: an exact `Rational`;
- `symbol`: a Unicode identifier;
- `constant`: π and i;
- `algebraic`: a RootOf stored by canonical identity;
- `add` and `mul`: n-ary;
- `pow`: base and exponent nodes;
- `apply`: exp, log, sin, cos, tan, asin, acos, atan and abs.

Each node records its digest, its exact tree size (a `bigint` progress measure), its height, and whether it is *total*. Total means defined, finite and real for every assignment of its symbols, in both ℝ and ℂ.

**Canonicalization preserves value and natural domain.** Builders only do these things:
- flatten sums and products;
- order commutative arguments by digest;
- fold pure-number arithmetic exactly. This covers rationals, integer powers, powers of i, special values (exp 0, cos 0, sin 0, tan 0, asin 0, atan 0, log 1, acos 1) and |rational|;
- merge coefficients of identical terms;
- merge integer exponents of one base only when they share a sign;
- apply (xᵃ)ⁿ = x^(an) only when a > 0, or when a < 0 < n;
- apply exp(u)^w = exp(wu) only when w is an integer or u is a real number.

A zero coefficient drops a term only when the term is total. Otherwise `0·t` stays, keeping t's domain.

Nothing cancels: x/x, x⁰, 0⁰, log(eˣ), √(x²) and 1/(1/x) stay as written. Every domain-sensitive rewrite belongs to a recorded transform.

**Semantics.**
- `pow` with exponent p/q means the real root in a real problem (odd q allows a negative base), and the principal value in a complex problem.
- `log` is natural.
- The constant e is stored as exp(1).

**Vocabulary through the builders.** `sub`, `neg`, `div`, `sqrt`, `root`, `logBase` and the function shortcuts.

**Queries.** Post-order traversal, free symbols, `rebuild` and `substitute`. All of them use explicit stacks, so depth costs only budget. Measured cases:
- a 20,000-deep composition and a 10,000-term sum;
- 200 levels of sharing, whose tree size exceeds 2²⁰⁰ while the node count stays linear.

**Algebraic numbers** (`root-identity.ts`).
- `RootCatalog` identifies a RootOf by its minimal polynomial and its index among that polynomial's deterministically isolated roots. Real roots are matched by exact comparison. A complex disk is refined until it meets exactly one catalog disk (the catalog disks are closed and pairwise disjoint).
- Two isolations of √2 are therefore one node, and rational roots become numbers.
- `minimalPolynomial` validates untrusted coefficients as primitive, with a positive leading coefficient, and irreducible (by factorization).

### Exact evaluation (`evaluate.ts`)

Number-only subgraphs evaluate to a `Rational` or a RootOf through gate-3 arithmetic. The results cover:
- integer powers;
- positive real k-th roots: an order-preserving correspondence between the positive roots of m and of m(xᵏ);
- real odd roots of negative numbers;
- principal square roots of negative numbers;
- |z| = √(z·z̄) for non-real z.

Otherwise the result is typed, never a float:
- `free-symbol`;
- `transcendental`: π, or values that Lindemann–Weierstrass or Gelfond–Schneider prove not algebraic;
- `incomplete-implementation`: principal roots of negative numbers above square roots, and of non-real numbers;
- `undefined`: for example 1/0, 0⁰, log of a nonpositive number in ℝ, asin outside [−1, 1], or i in ℝ.

Undefinedness found anywhere in a graph takes precedence over the other reasons.

### Relation problems (`relation.ts`)

A `RelationProblem` carries:
- relations: =, ≠, <, ≤ (> and ≥ are input forms that become < and ≤ by swapping sides);
- domain: ℝ or ℂ, where order relations require ℝ;
- sorted targets, and parameters (the free symbols that are not targets, derived);
- typed conditions: nonzero, positive, nonnegative, equal, not-equal, in-domain;
- typed generator and constraint slots for later slices;
- a SHA-256 state hash over the canonical content.

The sides of = and ≠ are ordered by digest, and every list is sorted and deduplicated. The hash is independent of store ids.

### Transforms and proof logs (`transform.ts`)

A `TransformRecord` carries:
- the rule id and the input state hash;
- outputs: state hashes, each with the conditions it adds and removes;
- the equivalence kind (`EQUIVALENT`, `EQUIVALENT_UNDER_CONDITIONS`, `FORWARD_ONLY`, `BRANCH_DECOMPOSITION`);
- obligations (`substitution-check`);
- a lexicographic bigint progress measure, or a `fresh-state` justification.

`verifyProofLog` replays a log independently of whatever produced it:
- every state hash is recomputed from its content;
- chain continuity: each record starts from a reached state;
- output count matches the kind (branches have at least two outputs);
- domain and targets are unchanged;
- exact condition bookkeeping: output = input ∪ added ∖ removed, with no adding of present conditions and no removing of absent ones;
- `EQUIVALENT` steps change no condition;
- `EQUIVALENT_UNDER_CONDITIONS` steps add one;
- `FORWARD_ONLY` steps carry the substitution obligation;
- the measure strictly decreases, or the step reaches a fresh state;
- finally, the rule's own semantic checker passes. An unknown rule is rejected.

The report lists the states that need substitution checks, and the leaves.

This gate ships two rules that exercise the machinery:
- `move-to-zero` (lhs op rhs ⇔ lhs − rhs op 0, `EQUIVALENT`);
- `drop-identical-sides` (t = t and t ≤ t are dropped, adding `in-domain(t)` unless t is total, which makes the step `EQUIVALENT_UNDER_CONDITIONS`).

Real rules arrive with slice 1.

### Search (`search.ts`)

Iterative deepening runs depth 0, 1, 2, … with no depth or node limit. A hash-keyed `VisitedSet` re-expands a state only when it is reached with more remaining depth. Once the bound exceeds the number of distinct reachable states nothing is cut off, so cyclic rule sets end in a proven `exhausted`. Infinite spaces end only by goal, budget or cancellation.

### Solution sets and outcomes (`solution-set.ts`)

**Outcomes.** There are exactly six: `solved` (set plus proof), `empty` (proof), `undecided`, `incomplete-implementation`, `unsupported` and `resource` (stop). There is no partial kind. A type-level test and a runtime guard enforce this, and `resourceOutcome` maps typed stops.

**Set kinds.**
- `finite`: points are tuples of exact numbers, or closed-form expressions such as log 2;
- `union`;
- `case-tree`;
- `periodic`: values in integer parameters, with constraints;
- `parametric`: values in free parameters, with constraints;
- `reduced-form`: a proven-equivalent relation problem;
- `unconfirmed`: candidates, each with all its derivations.

**Normalization.**
- Finite sets: values are canonicalized through the catalog, and expressions that evaluate exactly become numbers. Points are deduplicated exactly and ordered: real values by size, then non-real values by canonical identity, then expressions by digest.
- Unions: flattened, finite parts merged, empty parts dropped, children ordered by canonical key.
- Conditions are canonical.
- Unconfirmed candidates are merged, keeping every derivation.
- Finite membership is exact, or `unknown` when two different closed forms cannot be compared yet.

Operations on families arrive with their slices.

### MathJSON (`mathjson.ts`)

The reader is pure data with an explicit stack. It reads:
- numbers: safe integers, decimals by their shortest text, `{num}` with exponents and repeating digits such as `0.(3)`, and `Rational`;
- the symbols `Pi`, `ExponentialE`, `ImaginaryUnit`, `Half` and `GoldenRatio`;
- `Add`, `Subtract`, `Negate`, `Multiply`, `Divide`, `Power`, `Square`, `Sqrt`, `Root`, `Exp`, `Ln`, `Log` (base 10 or given), `Lb`, `Lg`;
- the six trig functions, of which sec, csc and cot are reciprocals, and the three inverses;
- `Sinh`, `Cosh` and `Tanh` by their exponential definitions;
- `Abs`, `Delimiter` and `RootOf`;
- relations, chained relations and `And`.

An unknown head or constant gives `unsupported` naming it. Malformed input gives `invalid`. The writer emits the same subset, and round trips are identity on ids.

### Wire (`wire.ts`)

Versioned private JSON for expressions (a node table), relation problems, proof logs, solution sets and outcomes. Decoding is strict:
- exact key sets, with no accessors;
- canonical integers and rationals;
- every node is rebuilt through the builders and must come out exactly as encoded, so unsorted or unreduced input is rejected;
- no duplicate nodes and no forward references;
- minimal polynomials are validated;
- state hashes are recomputed and must match;
- outcome and stop names come from closed lists.

## Acceptance evidence

`node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2`: 16 files / 111 tests pass, including 40 new representation tests:
- **Hash-consing.** `x + 2y` and `2y + x` are one id; nesting flattens; 1/2 + 1/3 = 5/6; 9007199254740991·3 is exact. x/x, x⁰, log(eˣ), √(x²) and 0⁰ do not simplify, and `log x − log x` keeps x's domain.
- **Deep graphs.**
  - A 25-level composition, a 20,000-deep chain (built, traversed and substituted) and a 10,000-term sum, which is order-independent.
  - A tiny budget gives a typed `work` stop; 2^(10³⁰) gives a typed `allocation` stop.
- **Evaluation.**
  - (√2)² = 2, √2·√8 = 4, and √2+√3 has minimal polynomial x⁴−10x²+1.
  - ∛−8 = −2 in ℝ; √−4 = 2i in ℂ; |3+4i| = 5.
  - π+1, log 2 and 2^√2 are transcendental; 1/0, log(−1) in ℝ and 0⁰ are undefined.
- **Transforms.**
  - A two-step chain verifies and replays identically through the wire.
  - These are each rejected: a tampered `from`, measure, kind, added condition, state hash, record order and state content; an unknown rule; a `FORWARD_ONLY` step without the obligation; and in the wire form, a wrong hash, a wrong measure and a reordered node.
- **Search.**
  - The cyclic pair A↔B ends `exhausted`.
  - The depth-3 target 1→2→4→5 is found in an infinite space.
  - Typed `work` and `cancelled` stops.
  - The gate rules driven by search produce a verifiable log.
- **Solution sets.**
  - √2 from two different intervals is one point.
  - Unions built in different orders have equal canonical keys.
  - Exactly six outcome kinds, with a type-level guard against a partial kind.
  - All six outcomes round-trip through the wire.
- **MathJSON.**
  - These equations from the old baseline read correctly: `||x−1|−2| = 3`, `e^{2x} − 5eˣ + 6 = 0` (where `Power(ExponentialE, x)` and `Exp(x)` converge) and `sin(cos x) = 1/2`.
  - `Zeta`, `Gamma`, `Infinity`, `NaN` and `Element` are `unsupported` with their names.
  - 20,000-deep input reads without recursion.
  - Writer and wire round trips are stable across stores.

TypeScript, scoped ESLint, compartment boundaries, OOE boundaries and file sizes pass. The isolation test and the no-caps ratchet pass over the new folder.

## Known follow-ups (not caps)

- Principal roots of negative numbers above square roots, and of non-real numbers, are `incomplete-implementation` in evaluation. Slice 3 (radicals) completes them.
- Solution-set nesting (case trees, unions) is still walked recursively in normalization, keys and wire. Expressions, MathJSON and traversal use explicit stacks. Before the parameters gate produces deep case trees, those walks move to explicit stacks too.
- Finite-set deduplication of closed-form expression values compares them by canonical identity. Slices must emit canonical closed forms, or exact numbers, for solutions.

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
