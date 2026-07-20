# REZANOVA Graphing risk register

Parent gate: `GRAPH-ARC-REBASE-AND-AUTHORITY-DESIGN1`

| Risk | Failure mode | Architectural control | Proof gate |
| --- | --- | --- | --- |
| Parser ambiguity | bare/mixed coordinate input is silently given the wrong relation | bare x-expression only becomes explicit-y; bare y or mixed x/y requires an explicit relation; structured IR and source retention | parser fixtures and visible controlled errors |
| Relation misclassification | `x=g(y)`, implicit, polar, or inequality is forced through y sampling | discriminated relation union and classifier exhaustiveness; no source-string route switching | relation matrix tests and scene goldens |
| False discontinuity bridges | finite endpoints connect across poles/domain holes | screen-space finite transition/jump/domain checks, explicit segment offsets, no-bridge canary | `1/x`, tangent, nested rational semantic canaries |
| Incorrect inequality topology | fill leaks, inverts, or overclaims completeness | distinct boundary/region geometry, cell budgets, validator levels, visible inconclusive stop | strict/inclusive and implicit-region Playwright evidence |
| Piecewise authority drift | guided rows and direct entry produce different or string-concatenated math | both produce one structured branch/condition contract; stable branch IDs and condition validator | round-trip and boundary tests |
| Slider stale work | older preview flashes after later drag or analysis overloads pointer events | parameter revision in every sample; latest-only commit; preview/settle lanes; analysis after settlement | rapid-drag stale-drop probe and Playwright trace |
| OOE cancellation leak | tab close leaves workers/buffers/jobs active | workspace runtime context, active-job registry cancellation, checkpoints and terminal cleanup | close/cancel runtime probe and repeated mount test |
| Renderer contamination | Three.js becomes scene/math/document authority | private adapter import ratchet; headless/SVG precede Three; governor interface only | import scan, snapshot parity, compartment test |
| Generated-LaTeX regression | Graph facts store or reparse formatted output | exact values originate as producer-owned standard MathJSON; V2 adapter then shared printer | V2 enforcement, display inversion, MathJSON/printer ratchets |
| History scope leakage | Graph jobs create replay cards/tickets or fake projects | active OOE jobs have workspace identity but no History launch ticket; session document only | History diff guard and close-job test |
| Notebook scope leakage | export or plot entry becomes Notebook block/media | no Notebook touchlist in first arc; exports remain files | seam diff inspection and non-goal check |
| Surface Protocol leakage | Graphing is falsely advertised through hostless public surface | preserve `graphing: false`; Graph page is app-local | Surface Protocol fixture remains unchanged |
| Surface overclaiming | clipped, singular, or budget-truncated meshes look complete | explicit `z=f(x,y)` authority; domain breaks; mesh/contour budgets and visible truncation evidence | bounded-radical, pole, contour, and budget Playwright evidence |
| Complex overclaiming | local numeric findings are presented as global facts, non-holomorphic maps receive analytic claims, or principal branches masquerade as all sheets | typed exact/local evidence, bounded search regions, explicit holomorphic status, certified cuts, vector branch addresses, visible completeness limits | family corpus, non-holomorphic stops, bounded-solver, and sheet-loading tests |
| Riemann visualization fiction | camera motion changes mathematical sheets or a fake bridge implies a truthful 3D embedding | analytic continuation alone changes sheet; explicit seam correspondences; no bridge where the four-dimensional relationship cannot be embedded faithfully | continuation loop, camera invariance, seam readback, and 2D fallback evidence |
| WebGL context loss | blank page, lost document, leaked resources | governor retains renderer-neutral current scene; SVG fallback; rebuild and deterministic disposal | forced loss/restore Playwright evidence |
| Accessibility failure | canvas-only controls/tracing are unreachable or meaningless | expression rail and controls remain DOM; keyboard trace alternative, accessible summaries, reduced motion | keyboard, screen-name/role and reduced-motion UI tests |
| Grid label overload | labels flicker/collide or polar labels repeat everywhere | screen-space budgets, hysteresis, selected ring/ray priorities | zoom sequence and polar label semantic canaries |
| Performance regression | sampling, labels, rendering, or export block UI/memory | explicit time/sample/vertex/pixel budgets, preview/settle quality, worker lanes, transferable runtime arrays | benchmark ceilings and long-task/memory evidence per gate |
| Dependency capture | Graph imports private Equation/Calculus internals and freezes their design | only reviewed public pure seams; Graph owns orchestration and evidence | compartment/dependency tests and import review |
| Duplicate authority | document, surface, worker, and renderer each retain conflicting revisions | document/viewport/parameter revisions are explicit and results must match all applicable keys | reducer/job/commit property tests |

No risk is mitigated by screenshots, string manipulation, a second command bus, a universal AST, or retaining parallel legacy implementations.

## Verified through Move 23

- Renderer contamination is ratcheted: production source and a negative fixture prove Three imports are accepted only under the private adapter directory; the Graph page and app startup retain dynamic boundaries.
- WebGL context loss is exercised in Chromium: the current SVG scene appears with a non-destructive notice, context restoration rebuilds from renderer-neutral state, and switching back to 2D removes the Three canvas and disposes its listener/resource ownership.
- Camera and accessibility evidence covers named DOM controls, keyboard focus/reset, canonical snaps, projection, Unity-style pointer navigation, selected pivot behavior, non-passive wheel ownership, independent pane defaults, and view-only revision semantics.
- Analysis overclaiming is structurally bounded: exact polynomial/domain facts and numerically validated local findings have distinct evidence; denominator exclusions are not automatically poles, non-finite samples are not automatically asymptotes, and unsupported/inconclusive work retains explicit stops.
- `graph.analyze` has an independent retained worker/cooperative fallback, capability/host/shell identities, revision matching, cancellation, runtime probe, Graph compartment fact, and validated Canonical Result V2 boundary. It imports no Equation-private implementation.
