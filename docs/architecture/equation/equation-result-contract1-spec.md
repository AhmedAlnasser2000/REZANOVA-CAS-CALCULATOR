# EQUATION-RESULT-CONTRACT1: Canonical-Result V6 for Equation Outcomes (gate 13)

Date: 2026-10-04
Status:
- **Part A (the shared V6 contract)**: implemented and verified on 2026-10-04.
- **Part B (the Equation adapter)**: implemented and verified on 2026-10-04, in the same PR. This completes the gate. The adapter has no production caller until adoption.

Gate: shared result contract plus the Equation adapter. Stage 13 of the [roadmap](equation-reconstruction-roadmap.md).

Dependencies: every Equation core gate through [`EQUATION-PROOF-PERFORMANCE1`](equation-proof-performance1-spec.md). Precedent: [`INTEGRATION-RATIONAL-RESULT-CONTRACT1`](../calculus/integration-rational-result-contract1-spec.md) (V5). No dependency, schema migration, workspace, worker or production caller is added. No file under `src/lib/calculus/new-integration/` is edited. **No code from the old Equation engine is used.**

## Why a new version

AGENTS.md requires a new canonical-result version before a producer emits semantics that V2–V5 cannot express, and forbids carrying them in titles, prose or labels. The design's gap audit lists what the new Equation engine needs:
- RootOf with isolation data;
- periodic families over k ∈ ℤ;
- parametric sets;
- case trees on parameters;
- a six-outcome taxonomy without partial results.

V6 adds them before adoption, as V5 did before New Integration.

## User decisions (2026-10-04)

- **Scope**: every set kind the core produces (12 kinds). Later kinds, such as the complement of a family over ℂ, stay in the ledger.
- **Non-answers**: typed in V6. One outcome field holds all six outcomes, each with its typed reason (and owner gate for "incomplete").
- **Presentation**: a separate gate, `EQUATION-PRESENTATION1`, after this one: 2√3, numeric order of complex roots, distributing −(1 − e), asin/atan residues. V6 carries canonical, not pedagogical, LaTeX.
- **AGENTS.md**: V6 is added to the approved-version sentences, under the same rules.
- **Delivery**: one PR with two commits.

## The V6 document (`src/types/calculator/canonical-result-v6-types.ts`)

`CanonicalResultDocumentV6` is the V2 document with `version: 6` and an `equation-outcome` primary:

| Field | Meaning |
| --- | --- |
| `domain` | `real` or `complex` |
| `targets`, `parameters` | distinct symbols; a target is never a parameter |
| `roots` | root binders, each with a fresh symbol (below) |
| `outcome` | `solved{set}`, `empty`, `undecided{reason}`, `incomplete{owner, reason}`, `unsupported{reason}`, `stopped{stop}` with stop ∈ work, allocation, cancelled, result-size |
| `provenance` | `independent` verification for answers, `not-applicable` for non-answers, and the transform rules used; derivations stay outside the document, as in V5 |

`outcomeKind` (from V2) is `success` exactly for `solved` and `empty`. Non-answers are `error` documents, but their meaning is the typed outcome, not the error text.

**Root binders**: an algebraic number is never a custom `RootOf` head inside a math leaf. It is declared once and referenced by its symbol:
- `real-algebraic`: an integer polynomial in the binder's symbol, with rational bounds lo < root < hi (or lo = hi);
- `complex-algebraic`: the same polynomial, with a rational disk (re, im, radius);
- `indexed-real-root`: the index-th real root (1 = smallest) of a polynomial whose coefficients carry parameters, with optional rational bounds;
- `isolated-real-root` (added by `EQUATION-CERTIFIED-NUMERICS1`, schema 7, real domain only): the unique zero of an expression in the binder's symbol with rational bounds lo < zero < hi. The expression is defined and strictly monotone on [lo, hi] and changes sign there. Readers re-check this certificate (`core/numeric/isolated.ts` `certifyIsolated`), as they re-check the isolation of algebraic binders.
- `isolated-real-point` (added by `EQUATION-CERTIFIED-NUMERICS1` PR B, schema 7, real domain only): one binder per certified solution of a square system, `{ symbols, equations, box }`. It declares one fresh symbol per coordinate (answers reference these), the system written in them (as many equations as symbols, each symbol used) and a rational box (lo < hi per coordinate) in which every equation is defined and continuously differentiable and the Krawczyk test proves exactly one solution. Readers re-prove the Krawczyk test (`core/numeric/krawczyk.ts` `certifyPoint`).

Either algebraic kind may carry a `form`, a closed form proven by the producer to equal the root.

**Sets**: `finite`, `intervals`, `cofinite`, `union`, `case-tree`, `periodic-set`, `interval-family`, `root-set`, `periodic`, `parametric`, `reduced-form` and `unconfirmed`, mirroring the core. Endpoints are a value or a typed ±∞; conditions are typed (`nonzero`, `positive`, `nonnegative`, `in-domain`, `equal`, `not-equal`).

## Validation (`src/lib/result-contract/validation-v6.ts`)

- **Bounds**: the shared node, depth and byte limits. A document beyond them fails validation, and the producer reports the outcome as `stopped: result-size`, a resource condition, never as an invalid answer.
- **The V2 base fields** are validated by the V2 validator, as V5 does.
- **Math leaves** (`equation-math-latex.ts`):
  - every leaf is in a restricted standard grammar:
    - integers;
    - bound symbols;
    - Pi, ExponentialE, ImaginaryUnit;
    - Add, Multiply, Negate, Divide, Rational, Power, Sqrt, Root;
    - Exp, Ln, Log;
    - Sin, Cos, Tan and their inverses;
    - Abs;
    - LambertW (branches 0 and −1);
  - `canonicalLatex` must equal the deterministic structural projection of the leaf.
- **Binding and scope**:
  - root symbols, family parameters (k) and interval-family parameters are fresh;
  - free parameters of a parametric set are free targets;
  - values may use parameters, roots and their own bound parameters, but never a target (except free targets and reduced-form relations);
  - case conditions use parameters and roots only;
  - set variables are the targets, in order;
  - interval kinds are real only;
  - binder polynomials have integer coefficients and positive degree;
  - isolation bounds are rational constants.
- **Consistency**: `outcomeKind` follows the outcome; owners are `EQUATION-…` gate names or `unassigned`; provenance matches the outcome.

As with V5, validation proves nothing mathematical. Isolation correctness, set equality and completeness are producer obligations; the Equation adapter replays every document (part B). A schema-valid document is never an imported proof.

## Shared wiring (part A)

- **Routing and authority**:
  - `validation-router.ts` routes version 6;
  - `native-result.ts` has a V6 authority overload (`success` or `error`);
  - `producer-version-registry.ts` admits version 6 (no route or selector is registered until adoption).
- **Consumers**:
  - the generic consumer returns `unsupported-semantics` (a V6 read model is required);
  - normalization refuses to flatten V6;
  - runtime transfer actions on V6 are rejected;
  - the runtime outcome union is unchanged (adoption owns transport);
  - History keeps every version above 4 opaque (unchanged).
- **Coverage**: the MathJSON coverage collector walks V6 leaves under `primary.equationOutcome[*]`. Coverage exemptions stay empty, and the V1 fingerprints and the 57-route inventory are unchanged.
- **Test updates**:
  - the V2 contract test's "future version" probe moves from 6 to 7;
  - the coverage registry test includes a V6 document.

## Evidence (part A)

`src/lib/result-contract/v6-contract.test.ts`, 19 tests:
- every set kind and every outcome is accepted;
- rejection of:
  - custom heads (a `RootOf` leaf), stale canonical LaTeX, unknown keys and out-of-scope symbols;
  - a captured binder, a duplicate binder, a non-integer binder polynomial, irrational bounds;
  - a non-fresh family parameter, a case condition on a target, a free parameter that is not a target, wrong set variables;
  - a complex interval set, a closed infinite end, an oversize document;
- authority, the consumer refusal, the normalization refusal and coverage leaves;
- the canonical LaTeX projection.

The full result-contract suite passes (21 files, 176 tests), as do the V2 enforcement, display-contract inversion, MathJSON coverage, agent-workflow and memory checks.

## The Equation adapter (part B)

The adapter is two files outside the core, `src/lib/symbolic-engine/equation/result.ts` and `result-read.ts`. They are the only files the core isolation test allows to import the core.

### Projection: `projectEquationOutcome(problem, outcome, limits?)`

1. **Verify.** The core verifier checks the outcome independently first; a failed verification is thrown, never projected.
2. **Write the values.** Values become restricted standard MathJSON from the shared expression graph:
   - each algebraic node or value becomes a binder holding its canonical minimal polynomial and canonical isolation, plus its closed `form` when one is proven;
   - each parametric indexed root becomes an `indexed-real-root` binder, its variable renamed to the fresh binder symbol;
   - binder symbols are `r_1, r_2, …`, skipping targets and parameters.
3. **Fill in the rest.** The outcome is mapped; an `incomplete` reason that starts with an `EQUATION-…:` owner is split into owner and reason. `provenance.rules` lists the transform rules of the proof log.
4. **Validate.** A document beyond the shared node, depth or byte limits is replaced by `stopped: result-size`.
5. **Replay.** The validated document is read back into the problem's store and compared with the original by canonical key, or by value (`sameSet`) when two exact forms differ; kinds, reasons and stops must match.
6. **Authority.** `requireCanonicalResultAuthority` runs last.
7. **Stops.** A typed resource stop during verification or replay becomes the matching `stopped` document.

### Reading: `readEquationOutcomeV6(store, document)`

This is the V6 read model. It validates the document and rebuilds core values:
- **real binders** must isolate exactly one real root of their minimal polynomial between their rational bounds (exact comparisons);
- **complex binders** must carry the canonical isolation disk of one root;
- **indexed roots** are allowed only as whole point values (with one target);
- a `result-size` stop has no core outcome.

### Found and fixed

`decideEquation` could throw a typed resource stop raised while routing, before any slice's handler, instead of returning the `resource` outcome. It now always returns the typed outcome.

## Evidence (part B)

`src/lib/symbolic-engine/equation/result.test.ts`, 81 tests:
- **The corpus:** every one of the 67 corpus cases (all slices; solved, empty and incomplete outcomes) projects, validates, replays, and reads back in a fresh store to the same outcome kind.
- **Focused cases:**
  - cofinite (x/x = 1 over ℂ), intervals, periodic-set (sin x = ½), periodic (eˣ = 2 over ℂ);
  - case-tree (a·x + 1 = 0), parametric (x + y = 1), complex algebraic points (x³ + 2 = 0 over ℂ);
  - interval-family (sin eˣ > ½), root-set (x³ + a·x + b = 0 over ℂ).
- **Kind coverage:** together with the corpus, 10 of the 12 kinds come from real decisions. Reduced forms and unconfirmed sets, which no slice produces yet, are covered by the reader on hand-built documents.
- **Non-answers:** cos x = x is `incomplete` with owner `EQUATION-CERTIFIED-NUMERICS1`; a cancelled decision is `stopped: cancelled`.
- **Bounds:** an answer over a 30-node limit becomes `stopped: result-size`.
- **Tampering, rejected on replay:**
  - a moved isolation interval (no root inside);
  - swapped case sets;
  - a family value without its period term;
  - a forged `outcomeKind`.

## Not in this gate

- Display polish (`EQUATION-PRESENTATION1`).
- Runtime transport, worker, History persistence and UI (`EQUATION-ADOPTION1`).
- Set kinds the core does not produce yet, such as the complement of a family over ℂ (ledger).

## Amendment (`EQUATION-ADOPTION1`, 2026-10-05): assumptions

- The primary may carry `assumptions`: a non-empty list of relations (`eq`, `ne`, `lt`, `le`) whose sides use only the declared parameters. Root binders are not allowed, and orders are real only.
- When present, the outcome describes the solutions for parameter values that satisfy every assumption; cases ruled out by them are omitted.
- The adapter verifies the full outcome first, then the assumed outcome against it (`verifyAssumedOutcome`), and the replay compares the assumptions too.
- See the [adoption specification](equation-adoption1-spec.md).
