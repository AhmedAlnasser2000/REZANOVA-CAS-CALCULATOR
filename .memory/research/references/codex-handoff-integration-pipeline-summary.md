# Integration Pipeline Handoff Summary

milestone: INTEGRATION-PIPELINE-HANDOFF-CAPTURE0  
date: 2026-06-26  
primary_agent: codex  
primary_agent_model: gpt-5-codex  
contributors: [claude]  
recorded_by_agent: codex  
recorded_by_agent_model: gpt-5-codex  
verified_by_agent: codex  
verified_by_agent_model: gpt-5-codex  
attribution_basis: handoff

## Source

- Verbatim snapshot: `.memory/sources/2026-06-26__codex-handoff-integration-pipeline.md`
- Original local source: `<local-source>/codex-handoff-integration-pipeline.md`
- SHA-256: `c1a117e0cd3306ccf2d001ded392bb58c1b61581895a2638044b7ed4de231929`
- Bytes: `19897`

## What The Handoff Is

This handoff is a full-picture north-star for Calculus symbolic and numeric integration, not approval to implement every layer in one pass. It describes a five-layer end state:

- Layer 1: Rubi-style rule-based integration, translated into Calcwiz-native MathJSON infrastructure and loaded in tiers.
- Layer 2: Risch-Norman or heuristic transcendental integration for useful elementary cases beyond static rules.
- Layer 3: full transcendental Risch decision procedure, deferred until required algebraic and field-extension infrastructure exists.
- Layer 4: algebraic integration, including Euler substitutions, pseudo-elliptic detection, and genus/special-function recognition.
- Layer 5: numeric fallback for definite integrals only, with adaptive Simpson-style validation and no fake symbolic antiderivatives.

## Calcwiz Interpretation

- The immediate gate is `classifyIntegrandForm()`, added before any Rubi rule expansion. It should classify the integrand root form once and route to the applicable integration family instead of appending every new rule as another sequential top-level strategy.
- The classifier should be a bounded structural profiling pass over the integrand AST. Do not overread the handoff as requiring literal constant-time classification for every nested expression.
- Rubi work must be tiered. Start with Section 1 algebraic/polynomial/monomial forms, then add later sections only after focused verification evidence.
- The rules are a knowledge base to translate, not a library to install or copy into runtime. Keep Playground/source mirrors as reference context only.
- The primary rule source should be the open RuleBasedIntegration integration-rule PDFs, with the Mathematica Rubi repository as implementation reference. If SymPy Rubi is needed as a translation aid, mirror the exact source separately under the source-mirror policy.
- The current local SymPy mirror exists at `playground/sources/mirrors/sympy`, but the captured tree does not contain `sympy/integrals/rubi/`; do not claim that directory exists in this repo.
- Keep Equation work out of this lane. The intended integration lane lives in `src/lib/symbolic-engine/integration/`, `src/lib/calculus/engine/`, and, only when UI/workspace effects are explicitly scoped, `src/lib/calculus/workspace/`.
- Preserve the current public Calculus result contract unless a later milestone explicitly changes it. New internal methods or metadata should adapt back to existing `IntegralResolution`, candidate metadata, Display, History, OOE, and Tauri surfaces.
- Every rule that returns an antiderivative must continue through the existing verification/backcheck path. Tier-1 Rubi slices should prefer exact verification; numeric-confidence acceptance needs its own explicit policy.
- Lazy tier loading is an end-state direction, but current integration dispatch is synchronous. Dynamic imports require a later async/worker boundary milestone before they can be introduced safely.

## First Safe Milestones

1. `INTEGRATION-FORM-CLASSIFIER1`: add the classifier as an internal, tested, behavior-preserving route profiler. It may record route family evidence, but existing outputs should remain stable.
2. `RUBI-TIER1-SECTION1-AUDIT0`: map IntegrationRules Section 1 against existing direct, affine-linear, substitution, derivative-ratio, and partial-fraction coverage. Identify which algebraic/binomial/trinomial cases add real value without duplicating current rules.
3. `RUBI-TIER1-SECTION1`: translate the first narrow audited rule family into Calcwiz-native MathJSON rules with verification tests and controlled failure metadata.
4. Later Rubi tiers, Risch-Norman, full Risch, Euler/algebraic integration, and definite numeric fallback should remain separate prerequisite-gated milestones.

## Do Not Hallucinate Later

- Do not treat the handoff as a completed roadmap approval for all five layers.
- Do not say the local SymPy mirror currently contains a Rubi port directory.
- Do not import or execute external Rubi/SymPy code from stable runtime.
- Do not bypass the classifier and grow a long sequential rule chain.
- Do not widen public strategy/result schemas, worker boundaries, or workspace behavior as part of the classifier unless explicitly scoped.
- Do not let integration work touch the parallel Equation lane or unrelated Display work.
