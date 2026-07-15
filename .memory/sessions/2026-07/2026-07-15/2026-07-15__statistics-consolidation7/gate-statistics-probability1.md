# STATISTICS-PROBABILITY1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Backend Gate

- label: backend
- result: verified pass under standing user approval for all seven Statistics commits
- Probability evaluation now uses a Statistics-owned adapter over the typed `@stdlib` Binomial, Normal, and Poisson packages; the Student-t package is installed for Gate 5.
- Exactly, less-than, at-most, more-than, at-least, and independently bounded Between events use one typed event model.
- Binomial and Poisson enforce integer event values and preserve discrete endpoint mass. Normal strict/inclusive endpoints are equivalent, exact point probability is zero, and density is a separate non-probability result.
- Legacy `mode=pmf|pdf|cdf` expressions remain accepted and hydrate the new guided event state.
- Every probability result retains strict V2 authority and proves event notation, probability or density, expected value, and standard deviation as standard producer-owned MathJSON.

## UI Gate

- label: ui
- result: verified pass under standing user approval for all seven Statistics commits
- One Probability surface now contains the distribution selector, event selector, parameter controls, interval-bound controls, and generated request preview.
- Results show mathematical event notation, decimal and percent probability, endpoint meaning, expected value, and standard deviation. Density is explicitly labeled as curve height rather than probability.
- Chromium verified a real discrete interval result, Normal exact-versus-density behavior, focus retention, desktop composition, mobile stacking, and local overflow containment.
- Visual evidence: `.task_tmp/statistics-consolidation7/gate3-probability-desktop.png`, `gate3-probability-mobile.png`, and `gate3-probability-result.png`.

## Verification

- Focused distribution/parser/probability tests passed 28/28; focused core/descriptive coverage passed; Statistics runtime UI passed 11/11.
- TypeScript, production build, focused lint, file-size ratchet, print hygiene, History replay, and display-contract inversion passed.
- Result-contract passed 112/112 after the accepted Statistics probability MathJSON payload baseline update.
- A later full V2-enforcement rerun was externally blocked when concurrent unfinished `matrix.definiteness` registry edits appeared. Frozen-producer enforcement still passed, and the Statistics-era MathJSON/result-contract evidence above predates those external edits.
- Package installation reported the repository's existing npm audit inventory; no broad dependency audit fix was run.

## Handoff

- Continue with `STATISTICS-RELATIONSHIPS1`.
- Keep plots and diagrams excluded through Gate 7.
- Do not push.
