# INTEGRATION-EXPONENTIAL-NORMALIZATION1

Approved 2026-10-05. Backend, CRITICAL, root-only. First of three ordered gates before the exponential result contract and New Integration adoption. No dependencies, commits or pushes are authorized by this milestone.

## Contract

Normalize a bounded arithmetic expression of owned Q(x) atoms, exponentials of owned Q(x) arguments, addition/subtraction/multiplication/division and integer powers. An explicit restriction ledger accompanies atoms whose earlier source normalization lost exclusions. Return a checked rational expression, a checked one-family Laurent fraction with its exact rational argument, or an unsupported surviving-family/constant-extension classification. This gate makes no integrability decision and has no application caller.

The representation is a sparse multivariable polynomial fraction over the explicitly supplied Q(x) owner. Coordinates are exact BigInts until bounded conversion to polynomial exponents. Rings and values are registered, immutable and identity-owned. Polynomial terms use descending lexicographic order; zero terms and duplicates are removed and fractions have a monic denominator. Arbitrary common factors are discovered, including expanded factors spanning several exponential families.

## Faithfulness of exponential coordinates

Collect every argument occurrence, including those inside supplied restrictions. Prepend the rational constant 1. Clear rational-function denominators by a checked common multiple, then construct the coefficient matrix over Q. A replayable exact homogeneous linear-system certificate identifies independent pivot columns. The constant column is the first pivot. Every other pivot is therefore independent modulo rational constants. Clear each coordinate denominator separately to produce an integer lattice containing all supplied arguments. Its basis need not be the smallest lattice: reconstruction and independence are the required facts.

The map from this Laurent polynomial ring to the represented functions is injective. To see the nonconstant part, suppose a shortest relation over C(x) among exponentials of rational functions whose pairwise differences are nonconstant. Divide by its first term and differentiate. Minimality forces every remaining rational coefficient c to satisfy c'/c=-h' for a nonconstant rational h. This is impossible: a finite pole of h gives a higher-order pole of h', whereas a rational logarithmic derivative has only simple poles; if h is polynomial, its derivative has a nonzero polynomial part, whereas a rational logarithmic derivative vanishes at infinity. Thus distinct nonconstant exponent classes are linearly independent over C(x). Integer combinations of the nonconstant basis cannot be constant because the coefficient matrix includes 1 and has checked independent pivots.

The remaining constant coordinate represents exp(1/L), L a positive integer. It is transcendental: otherwise its Lth power e would be algebraic, contradicting Hermite's theorem. Polynomial coefficients in that coordinate over Q(x) consequently cannot vanish unless their exact polynomial representation is zero. Grouping a proposed relation by its nonconstant exponent classes proves injectivity of the full working representation. These are fixed theorem rules with concrete matrix/reconstruction hypotheses, not numeric evaluations or a claim to solve arbitrary elementary-function dependency.

Reference: [transcendental number notes, Chapter 3](https://webspace.maths.qmul.ac.uk/f.vivaldi/teaching/ETAD/NotesI.pdf). Surviving constant extensions are still outside the integration backend; this normalizer only preserves and cancels their exact structure.

## Recursive GCD and cancellation proof

Use recursive coefficient-content extraction and primitive pseudo-remainder sequences. Recursion lowers polynomial arity; remainder steps lower the outer degree after the possible initial swap. The base domain Q(x) is a field. No irreducible factorization, numerical evaluation or retry after resource exhaustion occurs.

Each content certificate contains the recursively checked GCD chain of all outer coefficients and a primitive reconstruction. Each pseudo-division records Q, R and the exact leading-coefficient power, checked against the standard identity and strict remainder-degree bound. The terminal primitive polynomial times the recursive content GCD gives the result, normalized by its leading Q(x) coefficient. Checked cofactors prove divisibility of both inputs. The primitive PRS/content chains prove maximality. An additional scaled identity S*A+T*B=lift(d)*terminal, d nonzero, records Bezout evidence over the lower coefficient fraction field. It does not assert that coprime multivariable polynomials generate the unit ideal.

Reference algorithm: [SymPy 1.14 recursive PRS GCD](https://raw.githubusercontent.com/sympy/sympy/1.14.0/sympy/polys/euclidtools.py). Implementation uses the private native kernel; no external source implementation or dependency is adopted.

Every source node retains its own cancellation certificate. Replay derives the node's unreduced polynomial fraction from its children, checks the certificate and normalized output, and checks cross multiplication. A final common monomial shift removes irrelevant exponential units before checking the remaining exponent support. Rational-multiple support is canonically oriented and scaled to GCD-one signed powers; full additive constants remain part of the argument.

## Conditions and replay

Record rational-atom denominators, exponential-argument denominators, every division operand, every nonpositive-power base and every supplied restriction, with node/provenance references. Conditions from canceled families remain. An identically zero divisor/restriction is invalid; zero to zero is invalid. Exponential nonvanishing is known and does not create a new mathematical exclusion.

The separately tagged `exponential-normalization`, version 1 codec stores original flattened source topology, exact atom values, restriction provenance, basis/elimination evidence, recursive GCD evidence, normalized node fractions and classification. It binds values to an explicit expected Q(x) owner, creates fresh polynomial rings and checks the original request, not just its normalized answer. Mathematical integer values use canonical strings. Polynomial terms must already have canonical ordering and no zero/duplicate entries. Decode bounds the whole envelope first and replays verification without normalization, basis or GCD searches. Existing codecs are unchanged.

## Resources and acceptance

All work and scratch allocation use the caller's ExecutionContext; each external operation starts a fresh scope. No new proof cache exists. The adopted finite arithmetic profile remains work 20 billion, allocation 1 trillion, integer bits 2048 and degree 256. Existing differential/artifact bounds govern source traversal and artifacts (height 8, depth 64, nodes 100000, bytes 16 MiB). There is no hidden family-count limit. Exhaustion yields no mathematical result.

Acceptance includes two/three-family hidden factors, rational-function coefficients, constant shifts, fractional ratios, inverse orientation, zero divisors, retained restrictions, exact large numbers, ownership, mutation, fresh limits and producer-disabled artifact replay. Run all retained core tests with two workers, incremental TypeScript, scoped lint, isolation, compartment/OOE, memory/file-size and diff checks. No UI activation or Playwright claim belongs to this backend gate. Actual evidence and representative serial measurements belong in the dated session dossier.
