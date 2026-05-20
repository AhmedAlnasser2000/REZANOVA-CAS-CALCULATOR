# FriCAS Top Research-To-Prototype Candidates

milestone: FRICAS-CTX0  
date: 2026-05-01

## 1. Capability Facts For Algebra And Calculus

- Source lesson: FriCAS algorithms are guarded by domain/category capabilities.
- Calcwiz translation: small typed readiness facts for polynomial, rational, domain/range, derivative, integration, limit, and vector/matrix readiness boundaries.
- Measure: future milestones can stop with a named missing prerequisite rather than adding local workaround logic.

## 2. Polynomial-Core Readiness Map

- Source lesson: polynomial categories and factorization capabilities are foundational.
- Calcwiz translation: document and test which polynomial operations are ready: normalize, degree, factor, gcd, cancel, square-free, resultant placeholder.
- Measure: calculus/solving milestones can declare exact polynomial substrate needs.

## 3. Integration Candidate Result Object V2

- Source lesson: FriCAS integration uses richer internal result objects and strategy layers.
- Calcwiz translation: extend internal candidate metadata for antiderivatives, required assumptions, verification confidence, and failure class without changing visible result origins.
- Measure: future integration expansions become explainable and bounded.

## 4. Definite Integral Hazard Notes

- Source lesson: definite integration must understand poles and path safety.
- Calcwiz translation: stronger `domain-range-core` interval hazard classes and user detail notes.
- Measure: unsafe numerical fallback stops become more precise.

## 5. Local Series Prototype

- Source lesson: local series are a principled route for many limits.
- Calcwiz translation: Playground prototype for bounded Taylor/local-equivalent expansion of elementary forms already in `CALC-LIM3`.
- Measure: covers selected challenge cases without becoming a general series engine.

## 6. Tiny Grobner Feasibility Lane

- Source lesson: Grobner normal forms provide exact elimination and membership.
- Calcwiz translation: Playground-only prototype for small rational-coefficient polynomial systems.
- Measure: solves or classifies a tiny corpus with clear term-order and bounded-size limits.

## 7. Vector/Matrix Core Readiness Gate

- Source lesson: matrix operations should be gated by coefficient-domain capability.
- Calcwiz translation: audit current numeric Matrix/Vector modes and define the smallest reusable vector/matrix core boundary before exact rational matrix work.
- Measure: Calcwiz can clearly say which Matrix/Vector behavior is product-only numeric workflow, which behavior is reusable core, and what must exist before determinant/rank/echelon/inverse become exact algebra substrates.

## 8. Function Registry And Domain Facts

- Source lesson: elementary/special function knowledge is centralized.
- Calcwiz translation: bounded function metadata table for domain, derivative, inverse derivative, local equivalent, and integration hooks.
- Measure: fewer duplicated function facts across calculus/domain cores.

## 9. Source-Context Challenge Corpus Process

- Source lesson: FriCAS input files are valuable regression examples.
- Calcwiz translation: keep context corpora under Playground and promote only proven shipped cases into golden tests.
- Measure: future research has evidence without turning every external example into a product promise.

## 10. Decomposition Vocabulary

- Source lesson: regular chains and factorized Grobner preserve solution-branch structure.
- Calcwiz translation: only vocabulary and stop reasons first; prototype much later.
- Measure: branch-core roadmap can distinguish simple branch sets from algebraic decompositions.
