## Attribution

primary_agent: codex
primary_agent_model: gpt-5.5
contributors: []
recorded_by_agent: codex
recorded_by_agent_model: gpt-5.5
verified_by_agent: codex
verified_by_agent_model: gpt-5.5
attribution_basis: live

# EQUATION-REAL-WRAPPER-COVERAGE-BUNDLE1 Handoff

## Status

Planning was stopped by user request before code edits for this bundle. This dossier records the intended work and boundaries so the next session can resume deliberately. No runtime behavior, solver route, Display schema, History path, OOE path, app-state path, Tauri path, or copy contract was changed for this bundle in this handoff.

Current worktree note at handoff time:
- `git status --short --branch` reported `## main...origin/main [ahead 2]`.
- One unrelated dirty file was present: `src/lib/symbolic-engine/integration.test.ts`.
- That unrelated symbolic-engine file was not touched for this handoff and should remain out of scope unless the user explicitly asks for coordination.

## Wrapper Roadmap

The current Real wrapper roadmap is:

1. `EQUATION-REAL-WRAPPER-COVERAGE-BUNDLE1`
2. `EQUATION-REAL-MIXED-RADICAL-WRAPPER-BUNDLE1`
3. `EQUATION-REAL-NESTED-WRAPPER-SUBSTRATE1`
4. `EQUATION-REAL-NESTED-ALGEBRAIC-WRAPPER-FORMULA1`
5. `EQUATION-REAL-MIXED-EXPLOG-WRAPPER-FORMULA1`
6. `EQUATION-REAL-MIXED-TRIG-WRAPPER-FORMULA1`

The user wants major wrapper milestones to be structured as internal gates/checkpoints with evidence, then committed once as one named milestone unless they explicitly request separate commits. Gates are not automatic commit boundaries.

## Display Roadmap Closeout

Display is no longer intended to block wrapper coverage work. Formula Viewer foundation, compact source cards, row budgets, detail-section budgeting, virtualization, replay `\substack` cleanup, and viewer-local math sizing are sufficient to resume wrapper implementation. Future Display polish remains normal UX backlog rather than a wrapper prerequisite.

The expected wrapper/display posture for new heavy formula outputs:
- Source Equation result cards stay compact-first when formula answers are large.
- Full heavy inspection belongs in the session-only Formula Viewer tab.
- Formula Viewer remains Display/UI infrastructure only; it is not a solver, OOE route, persisted schema, History migration, or app-state/Tauri change.
- Global `Valid When` facts stay separate from row-local `when` guards.

## Planned Bundle Scope

`EQUATION-REAL-WRAPPER-COVERAGE-BUNDLE1` should expand Real Exact one-layer wrapper formula coverage in one major milestone. It targets two high-value gaps:

- Rational carrier wrappers.
- Single-root affine radical wrappers.

It should keep Complex wrappers, mixed/two-radical forms, nested wrappers, and broad generated route widening deferred.

## Gate 1: Rational Wrapper Coverage

Goal: add or lock Real Exact one-layer linear-fractional wrapper support for forms like:

- `(z^3+z+1)/(z-m)=b`
- `(z^4+z+1)/(z-m)=b`
- `(a*(z^3+z+1)+c)/(d*(z^3+z+1)+e)=b`
- `1/(z^4+z+1)=b`

Policy:
- Treat the wrapper as a target-free linear-fractional expression in an inner selected-target expression `F`.
- Coefficients and RHS must be target-free.
- Generate an equivalent equation in `F`.
- Preserve denominator exclusions.
- Delegate generated degree-3 equations to Real Cardano and generated degree-4 equations to Real Ferrari.
- Preserve existing low-degree rational behavior where it already wins.
- If existing top-level rational formula normalization already covers a planned example, add regression coverage rather than duplicating route-local machinery.

Expected implementation seam:
- Prefer reusing existing rational normalization/formula handoff substrate.
- Do not add a second parallel rational-clearing path if the top-level rational formula route already owns the case.
- If a distinct wrapper matcher is needed, it must preserve provenance and validation evidence through the generated formula payload, not flatten formula answers through `exactLatex`.

## Gate 2: Single-Root Affine Radical Coverage

Goal: add Real Exact one-layer affine root wrapper support:

`a*root(F,n)+c=rhs`, with `n=2..12`.

Examples:

- `2*sqrt(z^3+z+1)+c=b`
- `sqrt[3](z^4+z+1)+c=b`
- `a*sqrt[5](z^3+z+1)+c=d`
- `sqrt[4]((z^4+z+1)/(z-m))+c=b`

Policy:
- Coefficient `a`, offset `c`, and RHS must be target-free.
- If `a` is symbolic, preserve `a\ne0`.
- For odd roots, generate `F=((rhs-c)/a)^n`; exact negative outputs are allowed and no nonnegative output fact is emitted.
- For even roots, require `(rhs-c)/a>=0`; exact-negative output stops as real-domain empty; exact zero collapses cleanly to `F=0`.
- Delegate generated degree-3/4 equations to Real Cardano/Ferrari.
- Keep existing bare square-root and nth-root behavior stable.

Expected implementation seam:
- Extend the existing composition carrier/algebraic-wrapper branch substrate rather than adding route-local mini-solvers.
- Preserve wrapper facts and generated branch provenance structurally.
- Keep candidate validation evidence and case-local formula facts attached to the generated payload.

## Gate 3: Shared Readback And Validation Hardening

Goal: make new rational/radical outputs use the same grouped formula readback and Formula Viewer protections as current algebraic, exp/log, and trig wrappers.

Policy:
- Formula-heavy outputs should remain compact in source cards and open in Formula Viewer for full inspection.
- Helper definitions remain scoped to generated branch groups.
- Denominator facts, wrapper facts, generated-branch provenance, and Cardano/Ferrari row-local guards must be preserved.
- If a generated wrapper branch mixes formula payloads with legacy finite-root output in a way v1 cannot present safely, stop honestly instead of dropping solutions or stitching incompatible readback formats.

## Boundaries

Out of scope for this bundle:

- Complex rational/radical wrappers.
- Mixed/two-radical forms.
- Nested wrappers.
- Mixed exp/log wrappers.
- Mixed trig wrappers.
- Broad generated route-order widening.
- `RootOf`, implicit-root output, numeric-only Exact fallback.
- Display/History/OOE/app-state/Tauri persisted schema changes.
- Copy Result / To Editor / History contract changes.

## Verification Plan For Resumption

Focused checks should include:

- Composition/generated formula tests for new rational and affine-root cases.
- Generated formula validation tests for wrapper facts, denominator exclusions, case-local facts, and formula/legacy mixing stops.
- Mode-level tests in Real Exact and Complex Exact boundaries.
- Cardano/Ferrari regression tests to prove top-level and generated formula behavior remains stable.
- Display/Formula Viewer tests for compact source cards and virtualized heavy inspection.
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

Manual app checks should include:

- `(z^3+z+1)/(z-m)=b`
- `(z^4+z+1)/(z-m)=b`
- `(a*(z^3+z+1)+c)/(d*(z^3+z+1)+e)=b`
- `1/(z^4+z+1)=b`
- `2*sqrt(z^3+z+1)+c=b`
- `sqrt[3](z^4+z+1)+c=b`
- `a*sqrt[5](z^3+z+1)+c=d`
- `sqrt[4]((z^4+z+1)/(z-m))+c=b`
- Complex versions of the same shapes should remain unsupported.
- Mixed/two-radical and nested wrapper examples should remain deferred.

## Next-Agent Warning

Do not touch unrelated dirty symbolic-engine integration work unless the user explicitly assigns it. Resume by first rechecking `git status`, then inspect the current composition/rational formula seams before editing. If rational examples already work through top-level normalization, treat Gate 1 as regression hardening rather than new infrastructure.
