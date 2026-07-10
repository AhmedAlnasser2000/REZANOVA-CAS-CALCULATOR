# Statistics Workspace Consolidation Roadmap

Status: approved for staged implementation on 2026-07-10.

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
  - user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Product Target

Statistics should serve school, upper-school, and introductory university students without becoming a professional statistics or research environment. The guided experience consolidates the current leaves into four visible sections:

1. `Data & Summary`: one dataset with List and Frequency Table representations, descriptive summaries, and frequency results.
2. `Probability`: one distribution surface with Binomial, Normal, and Poisson selectors.
3. `Inference`: a distinct procedure-oriented surface because sources, assumptions, confidence intervals, and tests form a different learning workflow.
4. `Relationships`: one paired dataset with Regression, Correlation, and eventually a truthful combined result.

The approved prototype is the visual direction, not a license to replace runtime contracts. The production implementation must keep one Statistics runtime, one OOE authority, and one result authority.

## Achieved Before Consolidation

`STATISTICS-GUIDED-CONTROL-STABILITY1` is implemented and verified locally, pending explicit commit approval:

- The dataset textarea owns raw draft text, so trailing commas and in-progress separators are not rewritten by parsed state.
- Parsed dataset values remain available to existing request builders.
- Raw draft text survives workspace-tab surface capture and restore.
- Shell auto-focus now reacts to a stable Guide route key rather than fresh metadata object identity.
- Probability, Inference, Regression, and Correlation secondary inputs retain focus after state updates.

## Locked Boundaries

- Keep capability ID `statistics.evaluate` unchanged.
- Keep `statistics-worker-runtime` primary and `statistics-runtime` fallback behavior unchanged.
- Keep OOE launch, cancellation, stale-drop, diagnostics, and History ticket ownership unchanged.
- Preserve all existing request kinds and legacy `StatisticsScreen` values for parser, Guide launch, History, and replay compatibility.
- Introduce visible section mapping separately from compatibility route identity.
- Keep `DisplayOutcomeShell` as the only committed result authority; do not create a second result engine inside the guided workspace.
- Do not merge Statistics with Calculate, Table, Graphing, or another workspace.
- Do not edit active Linear Algebra, CI, release, seam-selector, or unrelated memory-session files.

## Implementation Sequence

### 1. STATISTICS-SECTION-NAVIGATION1

Create the four-section guided navigation and a compatibility mapper from existing screen IDs:

- `dataEntry`, `descriptive`, and `frequency` map to `Data & Summary`.
- `probabilityHome`, `binomial`, `normal`, and `poisson` map to `Probability`.
- `inferenceHome` and `meanInference` map to `Inference`.
- `regression` and `correlation` map to `Relationships`.

Old Guide links, History records, hotkeys, parser hints, and replay seeds must still open the correct subsection. This gate changes navigation and view state only; it does not redesign every form.

### 2. STATISTICS-DATA-SUMMARY1

Merge Data Entry, Descriptive, and Frequency into one data workspace:

- One raw dataset draft with explicit validation and valid-value count.
- A List/Frequency Table segmented representation control.
- One source-of-truth synchronization model with intentional conversion actions.
- Summary and Frequency result choices without duplicated dataset cards.
- Clear population versus sample labels for variance and standard deviation.

The current dataset and frequency-table request kinds remain executable and replayable.

### 3. STATISTICS-PROBABILITY1

Render Binomial, Normal, and Poisson through one distribution form shell:

- Distribution selector controls which parameter fields appear.
- Event controls use student language such as Exactly, At most, At least, Density, and Cumulative, while serializers retain current PMF/PDF/CDF vocabulary.
- Parameter validation is local and field-specific.
- One generated request preview is available without competing with the form.

No new distribution is added in this gate.

### 4. STATISTICS-RELATIONSHIPS1

Merge Regression and Correlation around one paired dataset:

- One x/y table with stable row focus, add/remove behavior, and clear labels.
- Regression and Correlation selectors reuse the same points.
- Legacy regression/correlation replay loads that shared paired dataset and selects the corresponding analysis.
- The `Both` result ships only with a typed composite request/result path, serializer/parser support, validation, replay evidence, and one OOE launch. It must not be simulated by hidden duplicate jobs or stitched-together stale results.

### 5. STATISTICS-INFERENCE1

Rebuild the existing one-sample mean flow in the common form grammar while preserving its distinct conceptual section:

- Procedure and data-source controls.
- Confidence Interval/Hypothesis Test goal selector.
- Contextual fields for confidence level and null value.
- Visible assumptions and plain-language interpretation beside exact statistical facts.

Additional inference procedures wait for the curriculum audit below.

### 6. STATISTICS-GUIDED-EXPRESSION1

Implement the approved Guided/Expression mode without duplicating ownership:

- Guided mode emphasizes the consolidated form.
- Expression mode exposes the existing MathLive request editor.
- Both modes build the same canonical runtime request and commit through the same result shell.
- Switching modes preserves compatible in-progress work and never auto-runs.

This gate must explicitly account for the existing top display/editor composition before moving or suppressing any surface.

### 7. STATISTICS-CONSOLIDATION-POLISH1

Complete responsive, keyboard, accessibility, and compatibility verification:

- Desktop and mobile Playwright screenshots for all four sections.
- Focus-order, label, segmented-control, table-row, and no-overflow checks.
- Legacy History replay and Guide launch coverage for every old screen ID.
- OOE snapshot, stale-drop, stop, and pending-ticket regressions.
- Existing Statistics canary widened from direct structured input to include guided-control coverage.

## Curriculum Expansion After UX Stabilizes

### School foundation

- Mean, median, mode, range, quartiles, interquartile range, outlier fences, variance, and standard deviation.
- Raw lists, frequency tables, grouped-data basics, weighted mean, and clear sample/population distinctions.
- Bar chart, histogram, box plot, and scatter plot when a bounded chart surface is approved.

### Upper-school probability

- Counting principles, permutations, combinations, conditional probability, independence, expected value, and z scores.
- Binomial, Normal, and Poisson remain the core distributions; inverse probability and range events should precede adding more families.

### Introductory university

- Sampling distributions and standard error.
- One- and two-sample means, one- and two-proportion procedures, paired means, chi-square basics, and bounded one-way ANOVA.
- Simple linear regression inference, residual interpretation, and correlation cautions.

### Explicit non-goals

- Generalized linear models, multilevel/mixed models, survival analysis, research-grade Bayesian workflows, advanced time series, structural equation models, power-study suites, and professional data-cleaning pipelines.
- Research notebooks, publication tables, statistical programming, arbitrary model formulas, or package ecosystems.

## Gate Discipline

Each implementation milestone receives its own user approval before commit. Every gate must pass focused unit/UI tests, TypeScript, lint, file-size validation, path-scoped diff checks, and real-app Playwright verification. Shared-shell edits require neighboring-workspace regression evidence. Any overlap with another active agent stops at the conflicting file until that agent checkpoints.
