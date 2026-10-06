# GRAPHING-UI1: adaptive Graph layout, menu light dismiss and native app-wide UI scale

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

- Date: 2026-10-06. Second gate of the approved plan GRAPHING-PERF1 → GRAPHING-UI1 → PTX4 → Move 33. The user reported the Graph page cramped (a centred card, not the window) and cropped at the bottom at 100 % zoom, and menus that close only from their own button.
- **The gate was widened by the user's decision** after the desktop smoke exposed that UI scale (CSS `zoom` on single elements) behaves differently in WebKit and Chromium and that a hand-made toolbar overflow froze the page at 115 %: after researching established practice (VS Code / Electron zoom factor, Tauri `setZoom`, Material 3 window size classes, container queries, priority-overflow toolbars, WCAG reflow) the user chose to fold an **app-wide native UI scale** into this gate.
- Outcome: **verified** (backend + ui + desktop).

## Delivered

- **Native UI scale (whole app).** Desktop: the setting is the webview's native zoom (`getCurrentWebview().setZoom`, permission `core:webview:allow-set-webview-zoom`), steps 80/90/100/110/125/150/175/200 %, Ctrl/Cmd + = / − / 0 step the same setting (`src/app/runtime/useNativeUiScale.ts`; Tauri's own zoom hotkeys stay off). Web: the control is replaced by a hint to use the browser's zoom. Saves from before (100/115/130/145) map to the nearest step (`src/lib/app-state/ui-scale.ts`). Every CSS `zoom` and every `… / var(--page-ui-scale)` compensation is gone (shell page and calculator shell zoom, Notebook height and image resize, the Graph resizer), so CSS pixels, viewport units, media queries, measured sizes and pointer positions agree everywhere; the tab strip now scales with the rest.
- **Layout by Material 3 size classes** (`graph-size-class.ts`; compact < 600, medium < 840, expanded < 1200, large < 1600, extra-large): the page fills the window (no 1668 × 900 cap); the expression list docks and can be dragged (240 px to half the workbench) from expanded up and is a drawer that starts closed below; the Both view is side by side from medium and stacked (Real above Complex, horizontal divider) when compact, each split remembered (session surface V6 optional `layout { railWidth, bothSplit, bothStackSplit }`). Very short windows (≤ 520 px tall) drop the page header and status bar and keep a 240 px minimum, scrolling vertically beyond it (user decision).
- **Narrow components:** expression rows put their actions under the expression when the list is under 300 px (an `is-rail-narrow` class from the remembered width; a container query here measurably slowed typing); Complex pane chips step aside when the pane is under 560 px (container query on the panel).
- **Deterministic toolbar overflow** (`graph-toolbar-overflow.ts`, `GraphToolbar.tsx`, page 973 → 860 lines): an inert hidden row measures every control at its natural width; the level is a pure function of those widths and the bar width — view chip, Theme, Accessible colors, 1:1, Grid & Axes into "…", then icon-only Auto-Fit/Analyze, then (compact) Undo/Redo into "…". It cannot oscillate.
- **Menus** (`src/components/useLightDismiss.ts`): outside press, Escape (focus to the trigger), Tab out, one open at a time; a dismissing press on `[data-graph-dismiss-swallow]` (SVG viewport, Complex canvas, Three viewport) is swallowed. Applied to Add item, Grid & Axes, the curve style popover, the "…" menu and the New Equation Example picker.

## Deviations and findings

- **Engines disagree on viewport units inside a zoomed element** (WebKit divides `vh` by the zoom, Chromium does not) and on measured vs layout sizes; this, not the Graph code, made the page ~230 px short in the desktop app. Native zoom removes the class of problem rather than compensating for it.
- **Root cause of the 115 % freeze:** the old overflow measured the live bar, hid a control, re-measured and restored it when its estimate was a few pixels off, every frame (Fluent UI shipped the same loop). The rewrite never measures what it decides.
- **WebKit's WebDriver places synthetic clicks without the page zoom**, so the desktop smoke now runs at 100 % (Ctrl+0), tests the zoom by keys and measurements, and restores the person's own step at the end.
- Hover already sweeps the trace (hidden callout), so the swallow check asserts the callout stays hidden after the dismissing press and appears on the next press.

## Open

- **Graph typing feedback is about 3 ms slower** at 4× CPU throttle (HEAD 44.7–51.2 ms, UI1 47.9–54 ms, budget 50 ms), with run-to-run noise of the same size. The user chose to commit and record it in `open-questions.md` for a later profiling pass; preview (≈0.1 s) and settle (≈0.2 s) are unchanged or better.
- Next, at the user's request: a discussion of piecewise (several curves per item, wider capabilities), then PTX4 and Move 33.
- `docs/assets/screenshots/settings-display-live-preview.png` still shows the old UI-scale chips.
