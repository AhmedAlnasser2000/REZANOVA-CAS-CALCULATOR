# GRAPHING-PIECEWISE2 verification

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

## Evidence (2026-10-06/07)

- **Static:** application TypeScript clean in Graphing (Codex's uncommitted `src/lib/modes`, `src/lib/calculus`, `src/lib/result-contract` errors only); ESLint 0 errors on `src/app/graphing`, `src/lib/graphing`, `src/components`, `src/app/runtime`; file sizes within caps (`GraphWorkspacePage.tsx` 860 → about 560, `useGraphWorkspaceController.ts` 994 → about 845; `AppMain.tsx` unchanged at 3304 lines).
- **Unit (Graphing lib + app, 440+):** isolator (√2 proved, all 7 crossings of sin x = 0.3, zeros 10⁻⁶ apart, touching (x − 1)², floor steps and its zero range, 1/x pole, budget → undecided); conditions (sin x > 0.99999 slivers, ⌊x⌋ > 1 and ⌊x⌋ = 1 edges exactly on the steps, (x − 1)² > 0, closed forms ±√2); analysis (jump size and limits, hole, pole → vertical asymptote, pole inside a branch, Krawczyk-proved cos root, closed-form √2, no fake root at an excluded end); coverage wording; branch colours, overrides, stripping from sampling/undo, scene branch keys; draft move/duplicate/remove/otherwise; gallery: every example classifies, every Real/2D example samples to `complete` with no stop reasons, replace/add and item numbering.
- **UI:** Graphing UI 45 (including the new `GraphPiecewiseEditor.ui.test.tsx` 4 and the updated page tests); `useLinearAlgebraTableShellRuntime` (6) fails in the working tree from Codex's uncommitted Matrix/Vector work, not this gate.
- **Playwright** (dev server while iterating, then the production build): new `e2e/graphing-piecewise2.spec.ts` (branch colours by stroke, gap note "Nothing is drawn for −5 < x ≤ 0.", Add otherwise → three colours and no gap, per-branch restyle, Alt+↑ reorder changes which branch wins and keeps the colour, typing `cases`, Analyze "Jump of 1 at x = 0 · left 0 · right 1 · value 1", gallery at 1280×720 and 1920×1080 in all four categories, add-to-graph and open-in-new-tab); updated `graphing-piecewise`, `graphing-minimum-visible`, `graphing-ptx3`, `graphing-fix2` for the callout's "· branch N" and the new wording.
- **Performance** (production build, 4× CPU, 4 runs): first preview 87–98 ms, settled 193–216 ms, editor feedback 47.9–53.6 ms — the same as GRAPHING-UI1's recorded open question (49.5–52.8 ms); this gate adds no main-thread cost. On the dev server (React development build) the same spec reads ~80 ms, which is not comparable.
- **Screenshots** inspected: brace editor with strip and gap note (now `docs/assets/screenshots/graphing-piecewise-brace-editor.png` in the README), Add otherwise, gallery, examples loaded (triangle in three colours, folium, domain colouring, slider family), Analyze jump card.
- **Zero stretches (folded in):** analysis tests — the triangle gives exactly two root stretches [−5, −2] and [2, 5] (ends included, outer ends open-ended) and no point roots; |x| − x → 0..5, ⌊x⌋ → 0..1 (1 excluded), |x| with x → one coincidence 0..5. Chrome: the triangle shows two bands labelled "Zero for x ≤ −2" / "Zero for x ≥ 2", no dots along them, the trace reads "(−4.5…, 0) · otherwise" where the pointer is, Analyze lists two stretch cards; |x| with y = x shows a band "Same curve for x ≥ 0". New e2e test in `graphing-piecewise2.spec.ts`.
- **Coincidence and extrema:** `analysis/coincidence.test.ts` (8: implicit/implicit, implicit/parametric, polar/implicit, implicit/explicit, explicit/implicit parabola, factored implicit, parametric/parametric — one shared part each, no crossings inside, shared points on the curve to 1e−6; ±√3 exact to 13 digits); strict-extrema test (triangle: only the peak; a peak exactly between two samples still found). Chrome: implicit circle with the parametric upper half shows "Same curve" along exactly the upper half, the crossings with y = 1 keep their dots.
- **Isolated tree (HEAD 674184e7 + only this gate's 64 files):** `tsc -b` 0 errors; full unit suite 615 files pass, 10 fail — the same 10 fail identically on a clean HEAD copy (derivative workbench, print hygiene, history replay, table, symbolic matrix systems/spectral: committed work since `1714930e`, not this gate); full UI suite 89 files pass, 1 fails (`useLinearAlgebraTableShellRuntime`), also failing on clean HEAD. Graph suites with the boundary ratchet all pass (contracts 16, parser 53, sampling 132, scene 11, OOE 54, GPU 60, workspace runtime 28+28); file sizes within caps; memory protocol passes.
- **Desktop** (`test:desktop-smoke`, debug binary built from the isolated tree): no failures — layout, menu/Escape, UI scale 1440 → 960 and restored, screenshots present.
- **Playwright on the isolated tree's production build:** every `graphing-*` spec and `qa1-smoke`: 140 passed, 37 skipped (WebKit-only GPU specs), 1 failed — the new same-curve test clicked before the circle was selectable; the selection now waits for the scene and retries, and the piecewise/PTX/minimum-visible specs then passed 53/53. The performance spec passed in that run (editor feedback 47 ms).

