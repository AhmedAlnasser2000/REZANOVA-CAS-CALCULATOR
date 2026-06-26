# Formula Presentation Render Scheduler Roadmap

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Context

Calcwiz now has live Real Exact formula wrappers for algebraic, exp/log, and trig composition families that can feed generated degree-3/4 equations into Cardano and Ferrari. That capability is mathematically valuable, but large formula answers can still make the app feel sluggish.

The active issue is a Display/UI rendering problem, not an OOE compute problem. OOE can launch, cancel, stale-drop, and commit solver results correctly, but once Display receives a huge `caseMath` answer, the browser main thread can still spend too long mounting MathStatic nodes, laying out large formula rows, and keeping a large DOM surface alive.

`FORMULA-PRESENTATION-PIPELINE2` made heavy formula cases compact-first, but user QA showed that expansion still mounts too much at once and some compact previews still carry too much raw LaTeX text. The next lane should stabilize formula rendering before widening wrapper capability further.

## Sequencing Decision

Current wrapper formula work is paused behind Display stabilization. Existing live wrappers remain supported:

- Real one-layer square-root, absolute-value, square-power, odd-power, higher even-power, nth-root, exp/log, and trig formula wrappers stay live.
- New wrapper widening is deferred until Display can progressively render huge formula answers without blocking typing, navigation, or editor restart flows.
- Deferred wrapper widening includes broader rational/radical wrapper completion, nested or mixed wrappers, Complex wrapper policies, target-in-base exp/log formulas, and any broader generated route-order expansion.

## Roadmap Gates

### 1. FORMULA-PRESENTATION-PIPELINE3

Goal: make compact formula summaries truly cheap.

- Remove large raw LaTeX previews from compact summaries.
- Show only plain counts, group labels, and a short reason such as `Formula cases paused for responsiveness`.
- Ensure compact summaries mount no formula-row MathStatic nodes, no condition MathStatic nodes, and no hidden heavy formula DOM.
- Keep Copy Result, To Editor, History replay, and canonical exact LaTeX unchanged.
- Preserve global Valid When facts for whole-result facts such as denominator exclusions, wrapper facts, leading coefficient facts, and exp/log domain facts.

### 2. DISPLAY-CASE-ROW-SCHEDULER1

Goal: progressive row rendering with cancellation.

- Add a Display-owned row render queue for expanded heavy `caseMath` answers.
- Render row shells first, then render one formula row or a small batch per animation frame.
- Track a display render revision so new input, tab retarget, collapse, editor restart, or result replacement cancels stale row queues.
- Show lightweight progress such as `Rendering formula cases 2/8`.
- Keep row-local guards row-local: expanded rows still render `formula | when condition`.
- Do not route this through OOE; this is UI rendering work after a solver result has already committed.

### 3. DISPLAY-CASE-ROW-BUDGETS1

Goal: handle giant individual rows, not only many rows.

- Estimate row cost from formula LaTeX length, condition LaTeX length, grouped-branch count, and known expensive formula shapes.
- If one row is too large, keep that row collapsed behind a per-row `Show formula row` action.
- Render cheap rows first and defer oversized rows until explicitly requested.
- Add a CPU-time budget such as render for a small slice, yield to the browser, then continue if the display revision is still current.

### 4. DISPLAY-CASE-VIRTUALIZATION1

Goal: keep expanded giant answers from staying heavy while offscreen.

- Mount only visible and near-visible formula rows in very large `caseMath` answers.
- Preserve scroll position and row shells while unmounting offscreen heavy MathStatic nodes.
- Use this only after the row scheduler exists, because variable-height math rows make virtualization risky without stable shells.

### 5. DISPLAY-DETAIL-MATH-BUDGETS1

Goal: extend the same protections to details.

- Apply lazy row rendering and cancellation to opened math-heavy detail sections.
- Keep cheap prose details eager.
- Do not let collapsed detail sections pre-render hidden formulas.

## Validation Targets

Manual stress cases:

- `sin((z^3+z+1)/(z-m))=b`
- `ln((z^4+z+1)/(z-m))=b`
- `sqrt[4](z^4+z+1)=b`
- `(z^4+z+1)^6=b`
- `x^3+p*x^2*q+x=1`
- `sqrt(x+1)=x-1`

Expected behavior:

- Heavy answers first show a cheap compact summary.
- Expanding heavy answers renders progressively and remains cancelable.
- Typing and navigation remain responsive while rows are pending.
- Global Valid When facts remain visible and distinct from row-local formula guards.
- Copy Result remains canonical before, during, and after progressive expansion.

## Stop Conditions

Do not resume new wrapper widening until the Display lane can prove:

- heavy answer expansion does not freeze the app;
- stale row rendering is canceled when input or workspace context changes;
- giant single rows are protected by per-row budgets;
- collapsed math-heavy details do not mount hidden heavy math;
- existing formula wrapper outputs remain semantically unchanged.

