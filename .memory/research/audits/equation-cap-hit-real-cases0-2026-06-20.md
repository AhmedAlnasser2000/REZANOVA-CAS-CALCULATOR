# EQUATION-CAP-HIT-REAL-CASES0

Date: 2026-06-20

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

- Audit/readiness milestone only.
- Looked for real/default cap-hit evidence after `EQUATION-CAP-HIT-EVIDENCE1`.
- Used scratch probes under `.task_tmp/equation-cap-hit-real-cases0/`; no scratch files are durable or product inputs.
- No production code, cap constants, solver behavior, tests, UI, OOE, Display, History, app-state, Tauri, Exact/Isolate semantics, graphing, step-by-step, or source-mirror behavior changed.

## Question

`EQUATION-CAP-HIT-EVIDENCE1` proved current cap paths exist and classified cap families. This audit asks the next, stricter question:

- Do we have real/default examples proving the default selected-target peel depth or generated branch-count caps are too low?
- Or are the current failures mostly algorithm, readback, and semantic boundaries that should route to capability milestones?

## Method

- Reused existing solver seams from `src/lib/equation/**`.
- Ran a scratch `vite-node` probe over current default solver settings.
- For selected-target peel depth, tried a visually deep affine/quotient shell around a supported trig carrier:
  - `((((((\sin(z)+a)/(b+c)+d)/(p+q)+r)/(s+t)+u)/(v+w)+x)/(m+n)+j)=y`
  - The default solver succeeded through the current generated-handoff route.
  - Re-running with scratch `maxPeels: 12` produced the same success class.
- For branch count, reused current composition and mixed-algebraic public seams and the existing cap evidence:
  - the current two-periodic composition case remains under default caps and succeeds;
  - mixed generated branch-count remains a source guard with earlier mixed carrier-count stops usually firing first.

## Real/Default Evidence Matrix

| Case | Entry point | Fixture | Default observed result | Classification | What it means |
| --- | --- | --- | --- | --- | --- |
| Selected-target deep affine/quotient shell | `solveSelectedTargetIsolationEquation` | nested affine/quotient shell around `\sin(z)` | success through `trig` generated handoff | no default cap hit found | Current normalization and route search can handle visually deep shells; do not raise `DEFAULT_MAX_PEELS` from this evidence. |
| Symbolic polynomial degree | `solveParameterizedPolynomialEquation` | `z^3+a=0` | `target-power` stop | algorithm-boundary | Degree-2 symbolic coefficient solving is the current algorithm boundary. |
| Rational cleared degree | `solveParameterizedRationalEquation` | `1/(z-a)+1/(z-b)+1/(z-c)=d` | `cleared-degree-limit` stop | algorithm-boundary | LCD clearing can exceed supported polynomial closure; this is not a simple cap knob. |
| Factorable polynomial degree | `solveParameterizedFactorablePolynomialEquation` | `(z-a)(z-b)(z-c)(z-d)(z-e)=0` | `degree-limit` stop | algorithm/readback-boundary | Requires factoring/root representation/readback policy, not blind degree expansion. |
| Algebraic power degree | `solveEquationAlgebraicIsolation` | `x^5=a` | `unsupported-power-degree` stop | algorithm-boundary | Degree 5 power roots need explicit algebraic-power semantics. |
| Formula-size/readback | `solveEquationAlgebraicIsolation` | `a x^3+b x+c=0` | `formula-size-limit` stop | readback-boundary | The cap protects truth/readability; raising it would expose unwieldy exact formulas. |
| Mixed carrier count | `solveParameterizedMixedAlgebraicEquation` | three independent square-root carriers | `branch-limit` stop | semantic-boundary | More carriers require mixed-carrier semantics and branch facts. |
| Composition depth | `solveParameterizedCompositionEquation` | `\sin(\sqrt{|z-a|})=b` | `nested-composition` stop | semantic-boundary | Deeper composition needs capability/readback semantics, not just larger branch caps. |
| Composition two-periodic under cap | `solveParameterizedCompositionEquation` | `\sin(\tan(z))=a` | success under current defaults | under-cap companion | Current default periodic-parameter support covers this known companion case. |
| Composition generated branch count | composition branch generator evidence | configured sentinel only so far | no real/default hit found | unproven recalibration candidate | Keep the guard; collect a real default branch-count hit before raising. |
| Mixed generated branch count | mixed branch helper guard | source guard; earlier carrier count usually stops first | no real/default hit found | static guard | Do not expose internals only to force a fixture. |

## Findings

- The real/default examples we currently have mostly reinforce the earlier classifications: degree, formula-size, mixed-carrier, and composition-depth stops are algorithm/readback/semantic boundaries.
- The selected-target peel-depth cap remains a possible future tuning candidate in theory, but this audit did not find a clean default-depth cap hit. A visually deep shell normalized and solved under defaults.
- Generated branch-count caps remain possible future tuning candidates in theory, but current public fixtures do not prove a default cap problem. The known composition two-periodic case succeeds under defaults, and mixed generated branch count is usually shadowed by earlier carrier-count semantics.
- Therefore `EQUATION-CAP-HIT-REAL-CASES0` does not justify raising any cap.

## Recommendation

Do not start an implementation cap-raise milestone yet.

Next useful paths:

- Add user-real blocked equations to a small real-case corpus when they appear, then rerun this audit style.
- Prioritize substrate work when choosing implementation:
  - factoring/product decomposition;
  - higher-degree root representation policy;
  - branch/domain/exclusion facts;
  - compact readback/implicit-root policy;
  - Exact/Isolate answer-mode semantics.
- Treat selected-target peel depth and generated branch counts as watchlist items, not active implementation work.

## Verification

- Scratch probe: `npx vite-node .task_tmp/equation-cap-hit-real-cases0/probe.ts` - passed.
- Durable verification is recorded in the session dossier.
