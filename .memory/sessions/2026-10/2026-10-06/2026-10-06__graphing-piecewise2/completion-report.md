# GRAPHING-PIECEWISE2: piecewise you can read, colour and trust, plus a Graph examples gallery

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

- Named GRAPHING-PIECEWISE2: GRAPHING-PIECEWISE1 is the 2026-07-19 gate (structured piecewise branches); this gate was planned under that name by mistake and renamed before its commit.

- Date: 2026-10-06. Inserted by the user before PTX4 after GRAPHING-UI1 (`1714930e`): "piecewise curves all shown with the same color… we should let users change them", "massively improve piecewise conditioning", the gap warning was unclear, and the branch menu looked poor.
- The user chose all four "many curves" directions — (a) per-branch looks, (b) mixed curve kinds and conditions on y, (c) several curves per branch, (d) slider-parameter conditions — and this first gate as Stage 1 + 2 (clarity and control, correctness), which delivers (a). (b)–(d) follow as PIECEWISE3/3.
- Design decisions by the user: conventional math-brace layout plus typing cases directly; distinct branch colours by default; keep the Apply button; extras: coverage strip, drag to reorder, an Examples menu; and (mid-gate) a Graph examples gallery folded into the gate, which asks "add to this graph / open in new graph tab" when the graph is not empty. Later the user found an Examples menu inside the piecewise editor inconsistent; it was removed and the gallery stays reachable from Add item → Examples… and the empty-graph "Browse examples" (a toolbar entry left for a later gate if wanted).
- Outcome: **verified** (backend + ui).

## Delivered

- **Per-branch style.** Optional `branchPresentation` on a piecewise item (keyed by branch ID, `otherwise` for the otherwise branch), stored beside the mathematics and stripped from sampling and undo projections, so a recolour never resamples. Branches without an override take the item's style in successive palette colours (colour-vision mode respected). Paths and per-branch endpoint batches (`<item>:endpoint:<branch>:open|filled`) carry the branch; the SVG and Three renderers style by branch; the trace callout names the branch ("Branch 2 · …") in its colour; the row swatch shows every branch colour; the style popover opens per branch with a Default reset.
- **Brace editor** (`GraphPiecewiseEditor.tsx`, replaces the old form): one brace over the rows, value · *if* · condition, an otherwise row (faint until used), drag handle (Alt + ↑/↓), per-branch menu (move, duplicate, default colour, remove), Cancel and Apply (enabled only when the draft is valid and differs), and a **coverage strip** (each branch's drawn intervals in its colour, hatched gaps, filled/open ends, exact labels; pressing a segment focuses its branch).
- **Gap note**: an information note that says where nothing is drawn ("Nothing is drawn for −5 < x ≤ 0."; view edges open-ended, single points as "x = 0", exact labels where known) with an **Add otherwise** action; overlap warnings name branches by position.
- **Typing**: `cases` / `piecewise` (and `otherwise`) inline shortcuts in Graphing fields start a two-row brace.
- **Correctness**: `ptxIsolateRealZeros` (`src/lib/graphing/ptx/isolate.ts`) isolates every zero, discontinuity and identically-zero range of a condition's g = left − right by interval branch-and-bound (monotone + sign change proves a zero; undecided pieces are counted). `solveComparison` uses it for every non-polynomial condition (polynomials keep the exact solver; the 400-point scan is only a fallback and anything undecided marks the condition unresolved). Exact closed forms (rational and quadratic surds) travel from the root solver as `form` (LaTeX + MathJSON) and labels (`√2`) into evidence (`exactValues`), the gap note, the strip, and Analyze; z² = c now prefers the surd form.
- **Analyze**: piecewise functions get interval enclosures once their boundaries are solved, so roots are Krawczyk-proved; a structured boundary report (`detail.boundary`: continuous / jump with size / removable / vertical asymptote / one-sided, with limits) and cards such as "Jump of 1 at x = 0 · left 0 · right 1 · value 1"; holes, poles and vertical asymptotes inside each branch.
- **Gallery** (`graph-examples.ts`, `GraphExamplesGallery.tsx`): 4 categories, 21 examples, all plain LaTeX through the normal classifier; opened from Add item → Examples… and "Browse examples" on an empty graph; new graph tabs through `openGraphTab` in the workspace-instances runtime.

## Deviations and findings

- **Wrong root fixed:** for `x if x < 0, x + 1 if x ≥ 0` Analyze reported an exact root at x = 0 (the excluded end of branch 1, where x + 1 is drawn); this predates the gate. A root next to a boundary now counts only if the function is 0 at the boundary, and an exact root only where its branch is drawn. The same class may affect piecewise **intersections** across a jump; not changed here.
- **Item IDs after restore or example load** now continue after the highest `<tab>.item.N` in the session (`graphFirstFreeItemNumber`); before, a restored session could reuse `item.1` for its blank row.
- The branch editor dropped `otherwise` (a 1-branch + otherwise item hid itself on edit); fixed: drafts carry `otherwiseLatex` and 1 branch + otherwise is valid.
- Comparisons in rebuilt LaTeX are written `\le`, `\ge`, `\ne` (were `<=`).
- The piecewise draft actions moved out of the controller into `useGraphPiecewiseDrafts.ts`, and `GraphExpressionRow` out of the page (page 860 → under 560 lines, controller under 850).
- `README.md` keeps the user's old branch-editor screenshot file but no longer describes the old editor.

## Zero stretches and coinciding curves (folded in at the user's request)

- **Found by the user:** a curve that is identically 0 on a stretch (the triangle's `0 otherwise`) reported a root at every sample — 302 roots and as many dots along the axis in −8 ≤ x ≤ 8; the same for any such function (|x| − x 201, max(0, x − 1) 226, ⌊x⌋ 25) and for two curves lying on top of each other (a crossing per sample). The sampled root finder counted every grid point at exactly 0.
- **User decision:** fold the fix into this gate; keep tracing exactly as it is (no snapping to a stretch's ends — a stretch may run far or forever out of view), and show such places as an overlay.
- **Delivered:** `ptxRealZeroStretches` / `ptxRealCoincidences` (`ptx/features.ts`) turn runs of zero samples into stretches with bisected ends (inclusive where the value there is 0); `ptxRealRoots` no longer counts samples inside a run; differences equal to rounding read as 0. Analyze emits one `root` (or `intersection`) finding per stretch with `detail.interval` and no coordinates — so never a dot or trace snap — and cards read "Zero for x ≤ −2 · every point here is a root" or "Same curve for x ≥ 0". The selected curve's stretches are drawn by `ptx/ptx-stretch-layer.ts` as a soft band in its colour along the axis (or along the curve for coinciding curves), with end circles at ends inside the view and a label over the visible middle; ends at the view's edge stay open-ended in the wording.
- **Coinciding curves of any kind** (`ptxCurveCoincidence`): a path against an equation (parametric, polar or y = f(x) against implicit), two implicit equations (including complex loci), or two parametric curves (sampled against the other's fine polyline) give one `intersection` finding with `detail.shared` points; crossings inside the shared part are dropped, real crossings keep full precision (the circle meets y = 1 at ±√3 to the last digit — an early version that snapped values near 0 lost 7 digits there and was reverted). The band follows the selected curve's drawn path within ~0.6 of the shared points' spacing, labelled "Same curve".
- **Strict extrema only**: three or more equal samples are a flat stretch and give no extremum (the triangle lists only its peak); two equal samples still bracket a true extremum between them.
