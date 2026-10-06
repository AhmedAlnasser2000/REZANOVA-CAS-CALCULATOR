<p align="center">
  <img src="docs/assets/branding/logo.png" alt="REZANOVA logo" width="562" />
</p>

# REZANOVA CLASSWIZ CALCULATOR

<p align="center">
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/github/license/AhmedAlnasser2000/REZANOVA-CAS-CALCULATOR" /></a>
  <a href="https://github.com/AhmedAlnasser2000/REZANOVA-CAS-CALCULATOR/releases"><img alt="Latest release" src="https://img.shields.io/github/v/release/AhmedAlnasser2000/REZANOVA-CAS-CALCULATOR?include_prereleases&sort=semver" /></a>
  <a href="https://github.com/AhmedAlnasser2000/REZANOVA-CAS-CALCULATOR/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/AhmedAlnasser2000/REZANOVA-CAS-CALCULATOR" /></a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-Linux-informational" />
</p>

<p align="center">
  <a href="https://github.com/AhmedAlnasser2000/REZANOVA-CAS-CALCULATOR/releases"><img alt="Download AppImage" src="https://img.shields.io/badge/Download-AppImage-4c1?logo=linux&logoColor=white" /></a>
  <a href="https://github.com/AhmedAlnasser2000/REZANOVA-CAS-CALCULATOR/releases"><img alt="Download .deb" src="https://img.shields.io/badge/Download-.deb-4c1?logo=debian&logoColor=white" /></a>
  <a href="https://github.com/AhmedAlnasser2000/REZANOVA-CAS-CALCULATOR/releases"><img alt="Download .rpm" src="https://img.shields.io/badge/Download-.rpm-4c1?logo=redhat&logoColor=white" /></a>
  <a href="https://rezanova-cas.com"><img alt="Try in Browser" src="https://img.shields.io/badge/Try_in-Browser-orange?logo=googlechrome&logoColor=white" /></a>
</p>

<p align="center"><sub>Linux preview builds only — see <a href="#preview-release">Preview release</a>. Windows/macOS are not yet packaged.</sub></p>
<p align="center"><sub>The browser version is the full app, not a limited demo — the only difference is where your work is saved. The desktop app saves to your file system; the browser version saves to that browser's local storage, so work saved in one won't appear in the other.</sub></p>

REZANOVA CLASSWIZ CALCULATOR is an open-source, Linux-first desktop mathematics workbench built with Tauri, React, TypeScript, Rust, and MathLive. It combines textbook-style input with dedicated workspaces for symbolic and numeric calculation, equation solving, calculus, graphing, linear algebra, statistics, geometry, trigonometry, tables, and mathematical notebook authoring.

The project is deliberately **exact-first, bounded, and evidence-oriented**. It does not claim universal computer algebra coverage. Supported routes are intended to return structured answers, conditions, exclusions, branch information, diagnostics, and controlled stops instead of silently pretending that every problem has been solved completely.

`Calcwiz` and `Classwiz` are friendly aliases. The primary public identity is **REZANOVA CLASSWIZ CALCULATOR**.

> **Development note:** the current implementation grew over roughly **four months and a few days, with 2 months intensively and the other 2 intermittent work due to university pressure**. That explains its unusually broad scope, but it is not a claim of production maturity. This repository should still be treated as an advancing preview whose mathematical and platform boundaries are stated openly.

## Project status

- **Current version:** `0.3.0`
- **Primary release direction:** Linux-first preview
- **License:** MIT
- **Input and rendering:** MathLive
- **Desktop shell:** Tauri 2
- **Frontend:** React 19 + TypeScript + Vite
- **Current posture:** functional and substantial, but still actively developed and intentionally bounded
- **Graphing:** active production workspace — GPU-drawn (WebGL2) implicit curves, regions, complex planes and surfaces with an exact SVG/CPU fallback, point tracing whose readouts are proved by interval arithmetic where possible, points of interest, asymptotes, piecewise functions, complex mappings and loci, and an adaptive full-window layout.
- **Layout and scaling:** the whole app scales natively (80–200 %, <kbd>Ctrl</kbd> <kbd>+</kbd> / <kbd>−</kbd> / <kbd>0</kbd> on desktop, the browser's own zoom on the web), and Graphing adapts its layout from phone-narrow to ultra-wide windows — see [Layout and UI scale](#layout-and-ui-scale).

Windows and macOS remain plausible Tauri targets, but the current release and verification work is Linux-first.

## What makes REZANOVA different

REZANOVA is not intended to be a thin interface over one expression engine. Its differentiators are the way mathematical capabilities, user intent, evidence, and dedicated workspaces are brought together:

- **Exact-first, guarded mathematics** — symbolic routes are preferred where appropriate, while numerical work is explicit and labelled.
- **Visible mathematical boundaries** — conditions, exclusions, branch restrictions, residual checks, uncertainty, and controlled unsupported cases are surfaced rather than hidden.
- **Target-aware equation solving** — the selected unknown is distinguished from symbolic parameters and stored numeric values.
- **First-class complex mathematics** — bounded exact and numeric complex solving, branch-aware evidence, complex graph mappings, Argand trajectories, domain colouring, and component views are real parts of the current project.
- **Serious symbolic integration work** — direct and rule-based integration is supplemented by bounded Risch–Norman work, Lazard–Rioboo–Trager/Rothstein–Trager-family rational-integration routes, algebraic-function reductions, elliptic/special-function output, and proof-backed non-elementary certificates.
- **Relation-first Graphing** — Graphing is not limited to `y=f(x)` and is not a detached static plot window: implicit curves, regions, parametric, polar, piecewise and complex graphs are first-class, drawn on the GPU, and traced with proved or verified readouts.
- **Adaptive layout and native scaling** — one app-wide scale (like browser zoom) keeps text, controls and layout consistent at every size, and workspaces rearrange themselves for the space they actually get.
- **A real Notebook environment** — rich mathematical documents, pages, images, structured blocks, persistence, revisions, and publication are part of the application rather than an external afterthought.
- **Dedicated workspaces** — Equation, Calculus, Statistics, Matrix, Vector, Geometry, Trigonometry, Table, Graphing, Notebook, Guide, Settings, and History retain domain-specific workflows instead of collapsing into one command prompt.
- **Governed execution** — Order of Execution (OOE) controls launch, host choice, cancellation, stale-result rejection, commit legality, diagnostics, and runtime evidence.
- **Regression discipline** — corpora, canaries, runtime probes, History replay, printer/result contracts, compartment checks, file-size checks, UI tests, and browser tests are treated as product infrastructure.

## Current capabilities

Everything below describes capabilities that exist in the current repository. The bounds matter; this is not a claim of full Mathematica, Maple, SageMath, FriCAS, or industrial-CAS parity.

### Graphing

Graphing is a full workspace opened through **New Graph**: type relations in the expression list and they are drawn, traced and analysed in a Real view, a Complex view, or both side by side. Graph documents are versioned, sampling and analysis run in background workers under OOE governance, and every drawing passes through a renderer-neutral scene, so the same mathematics feeds SVG, GPU, Three.js and headless tests.

**What you can graph**

- explicit `y = f(x)` and `x = g(y)`; implicit equalities such as `x² + y² = 9` or `sin(x − y) = 6x`
- inequality regions (dashed edge when strict, solid when inclusive) and chained conditions such as `x < y ≤ 2`
- parametric curves `(cos t, sin t)` and polar curves `r = 2cos 2θ`, with optional `{0 ≤ t ≤ π}` restrictions
- piecewise functions, typed with `cases` or built branch by branch from **Add item**: the first matching branch is drawn, conditions accept `or` and `≠`, and jumps get open and filled end circles
- point sets, notes, and sliders created from any unknown symbol
- real surfaces `z = f(x, y)` in an interactive 3D view (orbit, pan, zoom; Top/Front/Right/Iso; perspective or orthographic; fly-through)
- complex mappings `f(z)` as continuous domain colouring or four synchronised Re / Im / |f| / arg panels; complex loci (`|z − 1| = 2`, `Arg z = π/4`, rays, discs) on an Argand plane; complex roots of polynomials; and an optional ℂ overlay that shows the real and imaginary parts of `y = f(x)` where it turns complex
- graph-local assumptions; typing `z` switches to the Complex view on its own (with Undo)

**How it is drawn**

- **GPU rendering:** implicit curves, regions, domain colouring, complex loci and surfaces are drawn in WebGL2 shaders. A chip shows whether the view is on the GPU, standard or precise rendering; the CPU path stays the exact reference and fallback, and tracing and Analyze always use the precise CPU evaluation.
- **Faithful implicit curves:** interval arithmetic rules out cells that cannot contain the curve and refines the ones that might, so thin features are not missed; curves that only touch zero, such as `(x − y)² = 0`, and isolated points, such as `x² + y² = 0`, are still drawn; a Plantinga–Vegter test certifies that each cell holds a single simple arc, and crossings such as `x² = y²` are joined through their singular point.
- **Spikes and poles:** interval checks between samples catch spikes narrower than the sampling, and curves such as `tan x` and `1/x` are not joined across their poles.
- **Fast feedback:** a typical preview appears in about 0.1 s and the settled picture in about 0.2–0.3 s, then a polished pass follows; outdated work is cancelled as you type or pan.

**Tracing, points of interest and proofs**

- Click to trace, move to sweep along the curve, or trace from the keyboard. Every readout carries a badge: **exact** (symbolic), **proved** (an interval-arithmetic Krawczyk proof with outward rounding), **verified**, or **numeric**.
- The selected curve shows its points of interest as dots that the trace snaps to: roots, intercepts, extrema, turning points of parametric, polar and implicit curves, curve ends and origin passes, intersections between any two kinds of curve, and region corners.
- Holes and jumps are drawn as open or filled circles; asymptotes — vertical, horizontal and oblique, including `tan`/`sec`/`cot` poles named as multiples of π — are drawn per curve with an Auto / Always / Off setting.
- Regions can be traced along their edge (inside or outside) or anywhere inside.
- Complex traces read out exact `z(t)` positions; Analyze counts zeros and poles of a complex map exactly by the argument principle ("exactly 2 zeros and 1 pole") and proves their locations; double-double arithmetic keeps readouts accurate where ordinary floating point cancels, such as `(eˣ − 1)/x` near 0.

**Analyze**

- a floating Analyze panel lists roots, intercepts, extrema, intersections, domain features and asymptotes with the evidence behind each finding, and can recentre on or pin any of them
- graph-local assumptions, principal branch and cut evidence, and bounded exact or validated complex zero/pole evidence with explicit non-completeness

**The workspace**

- a full-window layout that adapts from phone-narrow to ultra-wide windows (see [Layout and UI scale](#layout-and-ui-scale)): a resizable expression list (a drawer in narrow windows), a Both view with a draggable divider (stacked in compact windows), and a toolbar that folds controls into a **…** menu as it narrows
- menus close on an outside click, <kbd>Esc</kbd> or <kbd>Tab</kbd>, and a click on the graph that only closes a menu never also traces
- four themes (Technical, Paper, Aurora, Luminous), accessible colours, per-curve colour and line style, equal axes (1:1), Cartesian or polar grids with an optional unit circle, undo and redo
- the list width and view splits are remembered with each graph

Still to come in the Graphing program: tracing on 3D surfaces, Riemann sheets and surfaces, export and presentation, durable graph projects, and "Open in Graph" from other workspaces.

<table>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-3d-interactive.png" alt="3D interactive graph of log(sin x) and the line y=x rendered through the Three.js/WebGL2 adapter" />
      <br />
      <sub><b>3D interactive view.</b> <code>log(sin x)</code> and <code>x</code> plotted through the private Three.js/WebGL2 renderer, with orbit/pan/zoom and Top/Front/Right/Iso/Perspective/Fly camera controls.</sub>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-analyze-overlay.png" alt="Analyze overlay listing root, x-intercept, and y-intercept findings with exact-proved evidence" />
      <br />
      <sub><b>Analyze overlay.</b> The floating Analyze panel lists roots and intercepts with an <code>exact proved</code> evidence tag per finding, each with Recenter/Pin actions.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-implicit-relation-trace.png" alt="2D plot of the implicit relation sin(x-y)=6x with a traced coordinate readout" />
      <br />
      <sub><b>Implicit relations.</b> <code>sin(x−y)=6x</code> plotted alongside <code>log(sin x)</code>; click-to-trace reports the coordinate under the cursor.</sub>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-complex-real-split-view.png" alt="Split view showing a real 2D plot of sqrt(x) next to a compact domain-colored complex mapping of sqrt(-z)" />
      <br />
      <sub><b>Real + Complex split view.</b> The real plot of <code>√x</code> sits beside a synced complex mapping of <code>√(−z)</code>, with a live traced-point readout (<code>z</code>, <code>w</code>, <code>|w|</code>, <code>arg</code>).</sub>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-complex-domain-color.png" alt="Full-screen continuous domain-color plane for sqrt(-z) with branch-cut evidence" />
      <br />
      <sub><b>Domain color mode.</b> <code>√(−z)</code> as one continuous hue/lightness-mapped plane, annotated <code>holomorphic; 1 principal cut; standard cyclic phase</code>.</sub>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-complex-2x2-components.png" alt="2x2 component grid for sqrt(-z) showing Re f, Im f, magnitude, and argument panels" />
      <br />
      <sub><b>2×2 components mode.</b> The same mapping split into four synchronized panels — Re&nbsp;f, Im&nbsp;f, |f|, and arg&nbsp;f — each tracking the same traced point.</sub>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-points-of-interest-proved.png" alt="tan(sin x) with grey dots at its roots and extrema and a trace readout tagged PROVED" />
      <br />
      <sub><b>Points of interest and proved readouts.</b> <code>tan(sin x)</code> shows its roots and extrema as dots; the trace readout carries a <code>PROVED</code> badge from an interval-arithmetic proof.</sub>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-tan-asymptotes.png" alt="tan x with dashed vertical asymptotes labelled as multiples of pi and a proved root readout" />
      <br />
      <sub><b>Asymptotes named exactly.</b> <code>tan x</code> with its vertical asymptotes labelled <code>x = π/2</code>, <code>x = 3π/2</code>, …; the curve is never joined across a pole, and the root readout is proved.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-complex-values-overlay.png" alt="log x with the complex-values overlay showing real and imaginary parts for negative x" />
      <br />
      <sub><b>Complex values of a real function.</b> With ℂ on, <code>log x</code> also shows its real and imaginary parts where <code>x &lt; 0</code>; the readout gives <code>f(−4.11) = 0.614 + 1.364i</code>, proved.</sub>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-complex-log-cos-trace.png" alt="Domain colouring of log(cos z) with points marked on the real axis and a pinned verified trace" />
      <br />
      <sub><b>Complex trace on a domain-coloured plane.</b> <code>log(cos z)</code> on the GPU, with special points marked along the real axis and a pinned trace reading <code>z</code> and <code>w</code>, verified.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-piecewise-jump-limit.png" alt="Piecewise function with a jump at x=5 showing open and filled end circles and a limit readout" />
      <br />
      <sub><b>Piecewise jumps.</b> At a jump, open and filled circles show which branch owns the point; tracing the open end reports the one-sided limit (<code>limit 25</code>).</sub>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-piecewise-branch-editor.png" alt="Piecewise branch editor listing branches and conditions with Add branch and Apply branch changes" />
      <br />
      <sub><b>Piecewise branch editor.</b> Branches and their conditions are edited row by row and applied together; an open circle marks the end the next branch does not own.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-piecewise-endpoint.png" alt="Piecewise function x for x<0 and x squared for x>=0 traced at its endpoint (0,0)" />
      <br />
      <sub><b>Branch ends.</b> Tracing a piecewise curve snaps to branch ends such as <code>(0, 0)</code>, with the evidence level shown.</sub>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/graphing-complex-domain-color-polynomial.png" alt="Domain colouring of z + z^4 rendered on the GPU with a traced point readout" />
      <br />
      <sub><b>GPU domain colouring.</b> <code>z + z⁴</code> drawn in a WebGL2 shader (chip: <code>GPU</code>), with <code>z</code>, <code>w</code>, <code>|w|</code> and <code>arg</code> read out at the traced point.</sub>
    </td>
  </tr>
</table>

### Equation solving

Equation is target-aware and preserves non-target symbols as parameters instead of silently consuming them as stored values.

Current Equation work includes:

- explicit selected targets, including case-sensitive symbols and named targets through forms such as `@mass` or `var(mass)`
- affine, linear, quadratic, rational, factorable-polynomial, exponential, logarithmic, trigonometric, composition, carrier, wrapper, and mixed-algebraic families
- guarded direct Cardano and Ferrari routes for cubic and quartic equations
- bounded higher-degree symbolic polynomial handling
- periodic trigonometric families and compact preimage readback
- real inequalities and bounded periodic-inequality routes
- 2×2 and 3×3 systems plus broader structured system/readback work
- candidate validation and extraneous-root rejection
- visible exclusions, conditions, domain facts, and branch facts
- explicit real interval solving when symbolic routes stop
- exact Complex families, including bounded complex wrappers and polynomial routes
- bounded complex-region numeric solving with residual, contour, root-count, cluster, derivative, pole-aware, and local-box evidence
- branch-safe complex pullbacks that fail closed when principal-branch safety cannot be established

Complex support is powerful but not unrestricted: global completeness, broad complex locus/set output, universal `RootOf`-style readback, and formal root certification remain outside the current claim.

### Calculus

Calculus combines guided workflows, exact symbolic routes, controlled numerical assistance, and structured proof/evidence surfaces.

Current user-facing work includes:

- derivatives and derivatives at a point
- partial derivatives
- indefinite and definite integral workflows
- finite and infinite limits
- Taylor and Maclaurin tools
- bounded differential-equation workflows
- piecewise and absolute-value limit handling
- asymptotic leading-term and scale analysis
- MRV-lite and controlled Gruntz-style limit routes
- branch-aware real/complex limit evidence for supported carriers

#### Symbolic integration highlights

The integration subsystem includes more than a lookup table, while remaining explicit about its limits:

- direct primitives and bounded substitution routes
- integration by parts and bounded recurrence families
- a substantial Tier-I/Rubi-style rule surface
- bounded **Risch–Norman** ansatz, correction, Hermite-reduction, logarithmic-derivative, and coefficient-field work
- bounded **Lazard–Rioboo–Trager / Rothstein–Trager-family** rational-integration work
- algebraic genus-0 and selected genus-1 reductions
- elliptic `F`, `E`, and `Π`-family structure where supported
- named special-function output
- proof-backed non-elementary certificate families
- structural antiderivative verification before a result is accepted
- source-backed integration and limit corpora for regression tracking

<p align="center">
  <img src="docs/assets/screenshots/calculus-elliptic-integral-proof.png" alt="Indefinite integral of 1 over the square root of x cubed plus x plus x squared, resolved to an elliptic F term with genus-1 proof evidence" width="85%" />
  <br />
  <sub><b>Elliptic-integral output with proof evidence.</b> <code>∫ 1/√(x³+x+x²) dx</code> resolves to an <code>EllipticF</code> term, with validity conditions, real branch rows, endpoint exclusions, and the genus-1 Legendre change-of-variable proof shown as expandable evidence rather than a bare answer.</sub>
</p>

This is practical bounded progress, **not** a complete Risch algorithm, unrestricted algebraic integration, or universal step-by-step antiderivative engine.

### Linear algebra: Matrix and Vector

Matrix and Vector are separate workspaces with independent runtime identities and bounded exact, symbolic, complex, and numerical routes.

Current Matrix work includes:

- numeric and symbolic matrix expressions
- exact arithmetic and bounded conditional symbolic elimination
- systems, RREF, rank, nullity, pivots, kernel, image, row/column spaces, and linear-map profiles
- determinants, inverses, LU, QR, and multi-right-hand-side solving
- coordinates and change of basis
- characteristic polynomials, eigenvalues, eigenspaces, diagonalisation, and spectral powers within bounded proof-gated families
- definiteness through exact principal-minor analysis where supported
- numerical SVD, pseudoinverse, 2-norm condition number, and numerical rank
- exact and decimal presentation controls with exact structure retained as canonical copy/export truth

Current Vector work includes:

- symbolic and complex vector expressions
- Hermitian dot products
- norms, units, angles, projections, and 3D cross products
- scalar triple products
- span and linear-independence classification
- Gram–Schmidt orthogonalisation
- parallelism and distance
- parallelogram area, triangle area, and 3D volume
- basis selection and dependence evidence

Bounds are route-specific. The current editing model generally accepts matrices and vectors through size 8, while exact elimination is more tightly bounded (commonly through 6×6), and symbolic spectral work is narrower still. Over-cap work stops explicitly rather than silently changing mathematical meaning.

<p align="center">
  <img src="docs/assets/screenshots/matrix-workspace-named-matrices.png" alt="Matrix Workspace showing named matrices A and B set as active Left/Right operands with softkey operations" width="85%" />
  <br />
  <sub><b>Matrix Workspace.</b> Named matrices <code>A</code> and <code>B</code> set as the active Left/Right operands, driven either through the editor or the F1–F6 softkeys (<code>A+B</code>, <code>A−B</code>, <code>A×B</code>, <code>det(A)</code>, <code>A⁻¹</code>, <code>Aᵀ</code>).</sub>
</p>

### Statistics

Statistics is an active desktop workspace rather than a dormant calculator mode. The current UI is accepted for PC/desktop layouts.

Capabilities include:

- raw datasets and frequency tables
- descriptive statistics and frequency summaries
- probability tools
- binomial, normal, and Poisson distributions
- one-sample mean inference
- regression and correlation
- relationship-quality summaries
- structured answer rows and canonical result documents
- visualization contracts and payloads for current/future result surfaces
- OOE-backed runtime requests and replay-aware output

<table>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/statistics-data-summary-descriptive.png" alt="Data and Summary workspace showing a descriptive breakdown of a five-value list, including center, five-number summary, fences, and population/sample spread" />
      <br />
      <sub><b>Data &amp; Summary.</b> A raw list evaluated for size/total, center, five-number summary, range and fences, and population vs. sample spread side by side.</sub>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/statistics-inference-mean-ci.png" alt="Guided one-sample mean confidence interval workflow with sample statistics, precision, and the resulting confidence interval" />
      <br />
      <sub><b>Inference.</b> A guided one-sample mean confidence interval (Student t procedure) showing sample stats, standard error/margin of error, and the resulting interval.</sub>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <img src="docs/assets/screenshots/statistics-probability-binomial.png" alt="Guided binomial probability workflow with distribution facts and a probability-mass bar chart" />
      <br />
      <sub><b>Probability.</b> A guided binomial distribution (n=10, p=0.5, X=3) with exact probability, mean/standard deviation, and a probability-mass visualization with the selected value highlighted.</sub>
    </td>
  </tr>
</table>

### Notebook

Notebook is a document-tab app page for teaching, technical writing, worked examples, and mathematical authoring.

Current Notebook work includes:

- rich Tiptap-based authoring
- headings, paragraphs, lists, sections, dividers, callouts, mathematical blocks, and other structured content
- MathLive-based mathematical input
- page setup, margins, orientation, page breaks, Print Layout, and Draft view
- headers, footers, and page-number fields
- safe local image ingestion, captions, alt text, intrinsic image metadata, crop/rotation/size controls, and floating/in-flow placement work
- outline and Objects & Layers surfaces
- templates and persistent Notebook preferences
- local document library, autosave, revisions, recovery, and Trash flows
- lossless `.cwiznb` document packages
- export-only PDF, editable DOCX, and offline Web publication projections
- schema compatibility across durable document generations with TypeScript/Rust validation

Notebook video support was removed from the current authoring/storage/publication contract after the earlier implementation proved unreliable. Image/object interaction is being consolidated around a single object-frame authority; the README does not claim that this migration is complete.

<table>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/notebook-insert-tab.png" alt="Notebook Insert tab showing Structure, in-text math, separate equation, and media insertion tools" />
      <br />
      <sub><b>Insert tab.</b> Structure, in-text/separate-equation math blocks, and media insertion, alongside the Outline/Objects sidebar and the Text/Math/Evidence quick-add row.</sub>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/notebook-home-toolbar.png" alt="Notebook Home tab showing the rich-text formatting toolbar with font, paragraph, and style controls" />
      <br />
      <sub><b>Home tab.</b> The rich-text formatting toolbar — font, alignment, lists, indentation, and paragraph styles — for authoring around the inserted math.</sub>
    </td>
  </tr>
</table>

### Other workspaces and app surfaces

- **Calculate** — expression evaluation, simplify/factor/expand, `Ans`, stored numeric values, and guarded calculus actions.
- **Trigonometry** — evaluation, identity work, equation solving, triangle tools, angle conversion, and special angles.
- **Geometry** — 2D shapes, 3D solids, triangles, circles, coordinate geometry, and solve-for-missing workflows.
- **Table** — function-table generation with active-variable protection and stored-value details.
- **Variables** — finite real stored numeric values with explicit insertion, editing, clearing, and substitution policy.
- **Guide** — searchable examples, symbols, workspace guidance, and current feature help.
- **Settings** — full app-page settings with category navigation, live previews, scale/high-contrast behavior, History notation preferences, and Notebook preferences.
- **History** — a virtualized replay ledger with timeline grouping, filters, selected-result inspection, canonical result storage, and workspace-specific replay seeds.
- **Formula Viewer** — a dedicated surface for dense formulas that should not be forced into ordinary result cards.

<table>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/calculate-symbolic-expand.png" alt="Calculate workspace expanding (x^5+c+x)^3 into its fully expanded polynomial form" />
      <br />
      <sub><b>Calculate.</b> <code>(x⁵+c+x)³</code> expanded to its full polynomial via the F4 Expand softkey, with <code>c</code> and <code>x</code> tracked as distinct parameters.</sub>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/settings-display-live-preview.png" alt="Settings Display page with UI scale, math size, and high contrast controls next to a live result-card preview" />
      <br />
      <sub><b>Settings.</b> Display controls (UI scale, math/result size, high contrast, notation) update the Live Preview result card and the Setting Impact summary immediately.</sub>
    </td>
  </tr>
</table>

## Layout and UI scale

REZANOVA adapts to the window it is given instead of assuming one screen size.

- **One app-wide scale.** In the desktop app, **Settings → UI Scale** offers 80, 90, 100, 110, 125, 150, 175 and 200 %, and <kbd>Ctrl</kbd> <kbd>+</kbd> / <kbd>Ctrl</kbd> <kbd>−</kbd> / <kbd>Ctrl</kbd> <kbd>0</kbd> (<kbd>⌘</kbd> on a Mac) step through the same setting. The whole app — tabs, workspaces, menus and dialogs — scales together, exactly like browser zoom, so nothing is cropped, misaligned or scaled twice. In the browser version, use your browser's own zoom; Settings points to it.
- **Layouts by window size.** Graphing follows the Material 3 window size classes on the space it actually has: from 840 px wide the expression list sits beside the graph and can be dragged wider; below that it becomes a drawer over the graph; under 600 px the Real and Complex panes stack. Because UI scale is native zoom, a larger scale simply moves a window into a smaller class (a 1440 px window at 150 % behaves like a 960 px one).
- **Controls that fold, not crop.** The Graph toolbar moves its less-used controls into a **…** menu as it narrows, very short windows give the header and status bar's room to the graph, and expression rows rearrange themselves when the list is narrow. Notebook keeps its outline usable and its document header compact in short windows.
- **Remembered per graph.** The expression list width and the Real/Complex split are saved with each graph.

The Graph layout is checked at 1280×720, 1920×1080, 2560×1440 and 1024×768 at 80 % to 200 % zoom in Chrome, and in the packaged Linux app.

## Mathematical honesty and current boundaries

REZANOVA is broad, but its public claims should remain precise:

- It is **not** a complete general-purpose CAS.
- Symbolic algorithms are bounded by supported families, expression growth, degree, matrix size, branch safety, and proof/validation budgets.
- Risch–Norman and LRT/Rothstein–Trager-family work is real but incomplete.
- Complex solving is strong in selected exact and bounded numeric families, not globally complete.
- Graphing supports many 2D, complex, and bounded 3D forms, but Riemann work and the export/presentation closeout remain unfinished.
- Notebook supports rich documents and images; video is not currently supported.
- Statistics is currently a desktop/PC-oriented experience.
- Spreadsheet, a full Variables management page, public plugins, a public SDK, remote compute, and Surface Protocol mounting remain future work.
- The mathematical kernel is not yet Rust-first; most product mathematics remains TypeScript today.
- Arabic/right-to-left localization remains future work.
- Important results should be independently verified, especially in a preview release.

## Architecture snapshot

- **Frontend:** React 19 + TypeScript + Vite
- **Desktop shell:** Tauri 2
- **Math input/rendering:** MathLive
- **3D/accelerated Graphing backend:** private Three.js/WebGL2 adapter
- **Symbolic layer:** Compute Engine plus substantial app-owned algebra, equation, calculus, and result-authority modules
- **Persistence:** Tauri-backed settings, History, calculator memory, Variables, Notebook documents/assets, and browser fallback where supported
- **Execution governance:** Order of Execution (OOE)
- **Validation:** Vitest, Testing Library, Playwright, ESLint, Rust checks, corpora, canaries, runtime probes, boundary validators, and replay fixtures

Architecture at a glance:

- `src/App.tsx` — import shell
- `src/AppMain.tsx` — visual/runtime orchestration root
- `src/app/*` — app pages, workspace views, shell surfaces, routing, and presentation
- `src/lib/graphing/*` — graph contracts, parser, evaluator, sampling, analysis, scenes, OOE, and renderer boundaries
- `src/lib/notebook/*` — Notebook documents, media, persistence, publication, templates, and compatibility
- `src/lib/equation/*` — guarded real/complex equation solving and evidence
- `src/lib/calculus/*` and `src/lib/symbolic-engine/integration/*` — calculus workflows and symbolic integration routes
- `src/lib/linear-algebra/*` — Matrix/Vector exact, symbolic, complex, and numerical cores
- `src/lib/statistics/*` — statistics parsing, calculations, readback, inference, distributions, and visualization contracts
- `src/lib/ooe/*` — runtime traffic control, diagnostics, pilots, jobs, events, and bridge schemas
- `src/lib/compartments/*` — ownership and boundary contracts
- `src/lib/display/*` and result contracts — canonical mathematical presentation and printer policy
- `src/lib/surface-protocol/*` — hostless future integration spine; not mounted publicly
- `src-tauri/*` — desktop shell, Rust integration, persistence, and native commands
- `e2e/*` — browser interaction and visual regression coverage
- `benchmarks/*` — equation, integration, limits, and other corpus ledgers
- `tools/*` — architecture, contract, CI, freshness, and boundary validators

## Project structure overview

```text
.
├─ src/
│  ├─ App.tsx
│  ├─ AppMain.tsx
│  ├─ app/
│  ├─ components/
│  ├─ lib/
│  │  ├─ graphing/
│  │  ├─ notebook/
│  │  ├─ equation/
│  │  ├─ calculus/
│  │  ├─ linear-algebra/
│  │  ├─ statistics/
│  │  ├─ ooe/
│  │  ├─ compartments/
│  │  └─ surface-protocol/
│  ├─ styles/
│  ├─ test/
│  └─ types/
├─ src-tauri/
├─ benchmarks/
├─ e2e/
├─ docs/
├─ playground/
└─ tools/
```

## Getting started

### Prerequisites

- Node.js
- npm
- Rust toolchain
- Tauri system prerequisites for your platform

For Tauri system prerequisites, see:
- https://tauri.app/start/prerequisites/

### Install

```bash
npm install
```

### Run in browser development mode

```bash
npm run dev
```

### Run the desktop app in development

```bash
npm run tauri:dev
```

The default desktop development command disables Tauri's Rust file watcher and runs a Linux preflight that checks WebKitGTK and inotify limits before Tauri starts. If the preflight reports low file-watch limits, run:

```bash
npm run fix:linux-watch-limits
```

Then reopen VS Code or close other watcher-heavy applications and rerun `npm run tauri:dev`.

To enable Rust hot reload when the operating-system watch limits can support the repository:

```bash
npm run tauri:dev:watch
```

### Build

```bash
npm run build
npm run tauri:build
```

## Preview release

REZANOVA CLASSWIZ CALCULATOR is following a Linux-first preview-release path.

- Source builds are available through the commands above.
- Packaged preview artifacts are produced by the `Release Linux` GitHub Actions workflow.
- The first public packages should be treated as early previews, not production-stable releases or claims of full CAS parity.
- Verify important mathematical results independently.

Release documentation:

- [First public preview checklist](docs/release/first-public-preview-checklist.md)
- [Release process](docs/release/release-process.md)
- [Changelog](CHANGELOG.md)

## Validation and testing

The repository uses several layers of verification rather than one test suite alone.

Common commands:

```bash
npm run test:unit
npm run test:ui
npm run test:e2e
npm run test:gate
```

`npm run test:gate` is the strongest broad local command. It includes the primary unit/contract, UI, browser, lint, and Rust checks configured by the repository.

More focused gates include:

```bash
npm run test:graph-contracts
npm run test:graph-parser
npm run test:graph-sampling
npm run test:graph-scene
npm run test:graph-ooe
npm run test:notebook-schema-compatibility
npm run test:notebook-gesture-ratchet
npm run test:history-replay
npm run test:runtime-probes
npm run test:canaries
npm run test:compartments-boundaries
npm run test:surface-protocol
npm run test:ci-gate-alignment
```

The repo also carries source-backed mathematical corpora, workspace freshness checks, file-size ratchets, printer/result-contract checks, and browser canaries.

## Contributing

Contributions are welcome, especially in:

- mathematical correctness and counterexamples
- symbolic and numeric edge cases
- Graphing algorithms and interaction quality
- integration, limits, Equation, Statistics, and Linear Algebra coverage
- Notebook authoring and publication reliability
- accessibility and UI clarity
- performance profiling
- regression tests, corpora, and documentation

Before opening a pull request:

1. inspect the relevant public facade and compartment boundary;
2. preserve exact/approximate and evidence semantics;
3. keep public claims aligned with implemented bounds;
4. run the focused tests for the changed area;
5. run the broad validation gate when practical.

```bash
npm run test:gate
```

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
