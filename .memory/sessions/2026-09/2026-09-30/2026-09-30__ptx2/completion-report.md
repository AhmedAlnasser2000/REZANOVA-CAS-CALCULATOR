# PTX2

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

## Authority and outcome

- Date: 2026-09-30. User-approved plan after GRAPHING-FIX2: gates 2A (parametric and polar tracing), 2B (holes and jumps on ordinary curves; zeros and poles in Complex) and 2C (asymptotes), one commit, no push. Asymptotes show automatically while a curve is selected, with a per-curve choice; the user chose the row's `>` details expander as the home for per-curve display choices, and the ℂ button moved there. Root-only (DIRECT), on `main`; Codex's uncommitted work left unstaged.
- Outcome: **verified** (2A–2C backend + ui).

## Delivered

- **2A, exact parametric and polar tracing:** `PtxSolverPort.curvePoint` gives (x(t), y(t)) and r(θ) points; `ptxRefineParametric` golden-section searches t near the sampled t (a few sample steps) for the point nearest the pointer on screen, level verified. Polar piecewise items refine too. Readouts: `(x, y) · t = …` and `(x, y) · r = … · θ = …`. Region (`≤`) traces now refine onto their boundary curve like implicit curves (they showed raw sampled vertices such as `(3, 4.44089e-16)`).
- **2B, holes and jumps:** `ptxRealDiscontinuities` takes candidates from denominator roots and grid gaps and classifies them from one-sided limits and f(c) as hole, jump or pole. Settled y = f(x) samples emit them as `:endpoint:open|filled` point batches (never during gestures), so they reuse the piecewise rings, snap-on-arrival and `(1, undefined) · limit 2` readouts. Holes of rational functions are exact-proved in Analyze. The root finder change from PIECEWISE-CORE1 and a new rising-magnitude test catch `ln`-type poles. z-map points of interest add complex zeros (dots) and poles (open rings) with named hover readouts; clicking a tile selects its item.
- **2C, asymptotes:** `ptxAsymptotes` finds vertical lines at poles (exact for rational functions; one-sided domain edges such as `ln x` at 0), and end behaviour exactly for rational functions (a new port method `rationalEndBehaviour`: degree comparison and exact division for y = c or y = mx + b) or numerically by settling at x = ±10²…10⁷, rounded to its last stable digit. Analyze's vertical, horizontal and oblique asymptote findings come from it (replacing the degree-≤2 rational code); cards show `x = …`, `y = …`, `y = mx + b`. The Real pane draws dashed lines in the curve's colour with an equation label, following pan and zoom, never traced. Per-curve mode `asymptotes: auto | always | off` (additive optional presentation field): Auto while selected, Always regardless, Off never.
- **Details expander:** y = f(x) rows get a `>` that opens a Display group (Asymptotes Auto/Always/Off, Complex values ℂ). Other rows keep only what applies to them.

## Deviations and findings

- Asymptotes are found for y = f(x) curves only; x = f(y), piecewise, parametric, polar and implicit curves get none yet, and the details choice appears only where lines can appear.
- Numeric end behaviour is judged out to x = 10⁷: very slowly settling or oscillating functions may be reported without a horizontal asymptote.
- Existing tests updated for intended behaviour: the polar readout format, the pole level (exact for rational functions), the `sin(x)/x` sweep (its removable gap is now a ring the trace arrives at), and ℂ reached through "Show item options".
