# Codex Prompt: Incubation Infrastructure Upgrade — Area Synthesis, Source Security, Dev-Only Labs Runners, and Truth-First Math Policy

## Purpose

We are preparing a major upgrade to Calcwiz’s incubation process.

This is no longer just a “Playground” or a loose “incubation system.” The intended direction is:

# Incubation Infrastructure

This should become a durable project infrastructure layer, similar in importance to the existing Memory infrastructure.

- **Memory Infrastructure** preserves what Calcwiz knows.
- **Incubation Infrastructure** governs how Calcwiz safely learns, compares, synthesizes, prototypes, visually inspects, and graduates ideas.

The goal is to make Calcwiz’s research-to-product pipeline stronger, safer, more repeatable, and more useful for both the project owner and future contributors.

This prompt redefines the previous draft after the latest repository change:

# `PGL-VIS1` now exists

The repo now has a developer-only interactive Labs console, so the Incubation Infrastructure plan must account for visual experiment execution.

That does **not** mean Playground is now a public product feature.

It means approved local Playground runners can be executed visually in development mode only, behind explicit flags and strong boundaries.

---

## Critical Instruction: Verify Repository State First

Before implementing anything, inspect the current repository state and reconcile this prompt with what already exists.

Do **not** blindly implement this prompt.

Read at minimum:

1. `AGENTS.md`
2. `.memory/PROTOCOL.md`
3. `.memory/INDEX.md`
4. `.memory/current-state.md`
5. `.memory/world-canon.md`
6. `.memory/decisions.md`
7. `.memory/open-questions.md`
8. latest relevant `.memory/journal/YYYY-MM/*.md`
9. latest relevant `.memory/sessions/YYYY-MM/**`
10. `playground/README.md`
11. `playground/records/INDEX.md`
12. `playground/manifests/*.yaml`
13. `playground/sources/README.md`
14. `playground/sources/INDEX.md`
15. `playground/sources/metadata/*.yaml`
16. existing Labs files under `src/lib/labs/`
17. existing Labs UI files, especially `src/components/LabsPanel.tsx`
18. existing dev-runner bridge tooling, if present
19. `package.json`
20. `tools/*source*mirror*.mjs`
21. `tools/*labs*.mjs`
22. current CI and release workflow files
23. any existing `playground/area-studies/` or similar folder, if present

If the repo already contains part of this infrastructure, do not duplicate it. Audit and strengthen missing pieces.

If this prompt conflicts with the repo, prefer the repo state and record the discrepancy in the completion report and memory.

---

## Current Reality To Preserve

The current repo appears to have these important foundations:

- `.memory/` is a durable recall and workflow infrastructure layer.
- `playground/` is a level-based incubation area.
- `playground/sources/` is a controlled source-mirror registry.
- FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, and SymEngine are registered source mirrors.
- FriCAS context research exists as isolated context research only.
- Source mirrors are context only, not dependencies.
- Stable `src/` code must not import or read source mirrors.
- Stable product code must not directly depend on raw Playground experiments.
- Useful ideas must graduate by extraction/rewrite into stable Calcwiz-native architecture.
- `INCUBATION-LABS0` created a one-way Labs catalog from Playground metadata.
- `PGL-VIS1` now adds a developer-only interactive Labs console.

Preserve all of that.

---

## Important New Reality: `PGL-VIS1`

The previous draft assumed that Labs was mainly read-only or that interactive Playground execution was still future work.

That is no longer fully accurate.

The latest repo state now includes:

- a developer-only interactive Labs console
- runner-gated equation input
- runner-gated expression input
- runner-gated corpus-case input
- visible experimental result envelopes
- visual execution for `sym-search-planner-ordering`
- an `expression-baseline-probe` Playground record/manifest/lab
- a Vite dev-runner bridge gated by:
  - `VITE_SHOW_LABS=1`
  - `VITE_ENABLE_LAB_RUNNERS=1`

This means Incubation Infrastructure now has a controlled visual experiment loop.

The correct framing is:

> PGL-VIS1 provides dev-only approved local runner execution. It is not normal-user Playground execution, not source-mirror execution, not remote execution, not product math behavior, and not stable adoption.

Future Incubation Infrastructure must preserve this distinction.

---

## PGL-VIS1 Boundaries To Preserve

The following rules must remain true:

- Labs remains hidden unless explicitly enabled.
- Runner controls remain hidden unless explicitly enabled.
- Runners are approved and registered, not arbitrary.
- Stable runtime Labs code imports only stable generated/typed metadata and runner contracts under `src/lib/labs/*`.
- Stable runtime code must not import raw `playground/` experiment code.
- Dev-runner bridge execution is development-only.
- Release builds must not expose runner execution.
- Labs runs must not enter normal calculator history.
- Labs runs must not enter stable result provenance.
- Labs results must be labeled experimental/developer-only.
- Labs execution must not call source mirrors.
- Labs execution must not run FriCAS/SymPy/Maxima/Sage/Giac/SymEngine mirrors.
- Labs execution must not run remote/SSH/provider jobs unless a future milestone explicitly reopens that lane.
- Labs execution must not become a product solver backend.

This is now part of Incubation Infrastructure security.

---

## Core Reframing

The old model was:

> Study an external engine, such as FriCAS, then decide what Calcwiz might learn from it.

The new model is:

> Study a Calcwiz capability area across multiple sources, compare the sources, extract patterns, evaluate fit against Calcwiz, synthesize one Calcwiz-native bounded design, and then optionally prototype it through Playground/Labs under controlled conditions.

The durable unit of research is **not an external engine**.

The durable unit of research is a **Calcwiz capability area**.

Examples:

- polynomial core
- rational functions
- simplification
- assumptions/domain logic
- branch and periodic-family handling
- complex numbers
- inequalities
- exact linear algebra
- symbolic integration
- limits
- graphing
- IntelliSense / semantic math editing
- external compute
- expression IR
- profiles and policy routing

External systems are sources of evidence and inspiration, not identities to inherit.

---

## Current Source Mirrors

The source-mirror family is expected to include, or already includes:

1. FriCAS
2. SymPy
3. Maxima
4. SageMath
5. Giac / XCAS
6. SymEngine

Potential future graphing/workflow references:

7. GeoGebra
8. Desmos

These should be treated as research context.

They are not product dependencies.

They are not runner backends.

They are not source-code donors by default.

---

## Expected Source Roles

### FriCAS

Best for:

- deep CAS power
- algebraic generality
- typed mathematical structures
- symbolic integration / Risch-related depth
- exact algebraic capability
- broad CAS architecture lessons

Use it for:

- understanding deep symbolic power
- capability atlases
- domain/category modeling lessons
- integration and algebraic structure inspiration

Do not use it as:

- Calcwiz’s parent architecture
- a hidden runtime
- a direct code source by default
- a product identity template
- a Labs execution backend by default

### SymPy

Best for:

- modern symbolic API shape
- expression trees
- assumptions
- simplification
- Python-facing user workflows

Use it for:

- clean symbolic behavior
- assumptions-facing designs
- readable APIs and user-side CAS ergonomics

Avoid:

- blindly importing Python-object-model assumptions into Calcwiz
- using it as a runtime dependency by default

### Maxima

Best for:

- classic CAS behavior
- symbolic solving tradition
- calculus tradition
- historical CAS simplicity relative to FriCAS

Use it for:

- mature symbolic behavior examples
- classic simplification and solve patterns

Avoid:

- inheriting legacy UI/interaction assumptions without translation

### SageMath

Best for:

- ecosystem orchestration
- broad math environment packaging
- wrapping many engines
- platform lessons

Use it for:

- future module/distro orchestration
- multi-backend thinking
- ecosystem growth lessons

Avoid:

- turning Calcwiz into a giant wrapper around external engines

### Giac / XCAS

Best for:

- calculator-style CAS realism
- performance-oriented symbolic computation
- handheld/embedded tradeoffs
- practical solve/simplify behavior

Use it for:

- calculator-CAS pragmatism
- fast symbolic workflows
- compact practical behavior

Avoid:

- inheriting constraints that conflict with Calcwiz’s PC-first workbench vision

### SymEngine

Best for:

- minimal fast symbolic core
- efficient expression representation
- lightweight symbolic engine boundaries

Use it for:

- future Rust-kernel thinking
- fast representation design
- minimal core lessons

Avoid:

- reducing Calcwiz into only a low-level symbolic library

### GeoGebra

Best for:

- linked algebra/geometry/graphing workflows
- multi-view math interaction
- educational graph/CAS/geometry integration

Use it for:

- graphing/workbench UX
- linked visual and symbolic analysis
- future geometry/graphing studies

Avoid:

- copying its identity or becoming education-only

### Desmos

Best for:

- graphing UX
- expression-list workflow
- visual clarity
- accessibility
- shareable graph interaction

Use it for:

- graphing interaction model
- expression-list design
- lightweight visual exploration

Avoid:

- reducing Calcwiz graphing to visual-only behavior without symbolic depth

---

## Important Math Philosophy Correction

Calcwiz should not be described as blindly “exact-first” in all cases.

A better statement is:

# Calcwiz is truth-first and exact-when-appropriate.

Or:

# Calcwiz is exact-first where mathematically appropriate, but honesty-first always.

This distinction matters.

Some mathematical problems:

- have no solution
- are undefined under current domain assumptions
- have no elementary closed form
- require numerical approximation
- require branch or domain conditions
- produce infinite periodic families
- produce piecewise/sawtooth behavior
- require assumptions before simplification is valid
- are too broad for the current bounded surface

Examples:

- `sin(x) = 1` does not produce a single finite result. It produces a periodic exact family such as `x = π/2 + 2πk`, or in degree mode, `x = 90 + 360k`.
- This is a periodic-family result. It is exact, but not a finite exact list.
- “Sawtooth” is more appropriate for inverse/direct trig compositions such as `arcsin(sin(x))`, `arccos(cos(x))`, or `arctan(tan(x))`, where principal ranges and repeated piecewise windows matter.
- `sqrt(x^2)` should not silently become `x` over the reals; it is `|x|`.
- `ln(a*b)` may need branch/domain assumptions.
- Some integrals have no elementary antiderivative.
- Some equations should return “no real solution” or “unsupported exact closure” rather than fake exactness.

Therefore, every incubation proposal should classify expected outputs using a truth/honesty taxonomy.

Suggested result taxonomy:

```text
exact finite result
exact family result
exact conditional result
piecewise / branch result
no-solution result
undefined / domain-invalid result
approximate numeric result
verified numeric result
guided unresolved result
unsupported current surface
research-only / deferred
```

This should inform synthesis, proposal design, tests, runner result envelopes, and stop reasons.

Do not let the phrase “exact-first” justify mathematically false simplifications or over-promising.

Use:

> exact where valid, structured where infinite/conditional, numeric where appropriate, and honest when unsupported.

---

## Why This Upgrade Matters

The user wants to analyze many systems for a specific domain and then combine the best parts.

Example for polynomials:

- performance idea from SymEngine or Giac
- algebraic generality from FriCAS
- API clarity from SymPy
- classical symbolic behavior from Maxima
- orchestration/platform lessons from SageMath
- boundedness, stop reasons, profiles, and UX from Calcwiz

The desired result is not a clone of any engine.

The desired result is a Calcwiz-native synthesis.

This is the key principle:

> Borrow lessons, not identity. Combine strengths, not code. Translate everything into the smallest honest Calcwiz-native design.

---

## Multi-Step Synthesis Method

The user proposed a stronger method called Double/Multi-Step Synthesis.

Codex should formalize it.

The recommended full method is:

```text
0. Scope and prerequisite check
1. Isolated source notes
2. Source-vs-source comparison
3. Pattern extraction
4. Calcwiz-fit evaluation
5. Final synthesis
6. Calcwiz-native proposal
7. Incubation/adoption decision
```

Each step must stay distinct.

---

## Step 0 — Scope and Prerequisite Check

Before reading mirrors, define the exact capability area.

Examples:

```text
AREA-POLY0: Cross-engine polynomial-core synthesis
AREA-SIMPLIFY0: Cross-engine simplification synthesis
AREA-COMPLEX0: Complex-number foundation synthesis
AREA-INEQ0: Inequality/domain-constraint synthesis
AREA-GRAPH0: Graphing and visual math workflow synthesis
AREA-INTELLISENSE0: Math IntelliSense and semantic editing synthesis
```

The scope file must define:

- area id
- area title
- why this area matters to Calcwiz
- current Calcwiz state
- current known gaps
- source mirrors to inspect
- whether any source is planned only rather than active
- in-scope questions
- out-of-scope questions
- likely affected stable layers
- expected math-output taxonomy
- prerequisite status
- synthesis mode: lite / standard / full
- whether a Labs runner may later be useful
- expected deliverables

Prerequisite status should use values like:

```text
ready
ready-with-adapter
blocked-by-missing-core
bounded-workaround
playground-only
research-only
defer
```

---

## Step 1 — Isolated Source Notes

For each source mirror, analyze only the selected domain.

Do not compare yet.

Do not mention Calcwiz adoption yet except in a small “possible relevance” note if needed.

Each source note should capture:

- source engine
- studied domain
- inspected files/docs/modules
- whether inspection was static-only or sandboxed
- how this domain works in that engine
- representation choices
- algorithms/methods observed
- public/user-facing behavior
- strengths
- weaknesses
- edge handling
- performance implications
- correctness/stability implications
- what seems transferable
- what seems too engine-specific
- what must not be copied
- source-path references

At this stage, write:

> “This engine appears to do X.”

Do not write:

> “Calcwiz should do X.”

---

## Step 2 — Source-vs-Source Comparison

This step compares external sources with each other.

Do not primarily compare them to Calcwiz yet.

Questions:

- Which source has the clearest representation?
- Which source has the most practical algorithm?
- Which source handles edge cases best?
- Which source has the best performance lesson?
- Which source has the best user/API behavior?
- Which source is too heavy?
- Which source is too narrow?
- Which ideas recur across systems?
- Which unique ideas are worth preserving?

The comparison should separate dimensions:

```text
representation
algorithms
API/user behavior
architecture
performance
correctness
edge handling
tests/benchmarks
domain/assumption handling
visual/UX implications if relevant
```

Do not compare unlike things as if they were equal. For example, do not directly compare FriCAS’s full algebraic domain system against SymEngine’s minimal expression core without noting that they solve different layers of the problem.

---

## Step 3 — Pattern Extraction

After the source comparison, extract source-independent patterns.

Example for polynomials:

```text
Pattern A: domain-aware polynomial representation
Pattern B: lightweight expression-to-polynomial extraction
Pattern C: modular factorization pipeline
Pattern D: calculator-style bounded factor-first solving
Pattern E: backend delegation/orchestration
Pattern F: exact coefficient normalization
```

This step is important because Calcwiz should not adopt “FriCAS” or “SymPy.” It should evaluate patterns.

For each pattern, record:

- source inspirations
- problem solved
- benefits
- costs
- where it appears
- whether it is algorithmic, architectural, representational, UX-facing, runner-related, or testing-related
- whether it looks bounded
- whether it risks overgeneralization

---

## Step 4 — Calcwiz-Fit Evaluation

Now compare extracted patterns against Calcwiz.

This is where Calcwiz enters fully.

Questions:

- Does this pattern fit Calcwiz’s truth-first / exact-when-appropriate philosophy?
- Can it be bounded?
- Does it preserve honesty?
- Does it fit existing stable architecture?
- Which layer would own it?
  - kernel
  - algebra core
  - symbolic core
  - numeric core
  - orchestrator
  - adapter
  - UI
  - Playground only
- Does it require a missing substrate?
- Does it need complex numbers?
- Does it need inequalities?
- Does it need assumptions?
- Does it need exact linear algebra?
- Does it need graphing?
- Does it need verified numerics?
- Does it need profile behavior?
- Does it need a Labs runner to test?
- What is the smallest safe version?
- What stop reasons are needed?
- What tests would prove it?

This step should explicitly detect missing Calcwiz capabilities.

---

## Step 5 — Final Synthesis

This is the “super idea” phase.

The synthesis must be one coherent design argument, not a collage.

Bad synthesis:

> Take FriCAS type system, SymPy assumptions, Giac performance, Sage orchestration, and SymEngine expression core.

Good synthesis:

> Calcwiz should implement a bounded domain-aware polynomial substrate with exact rational coefficient normalization, shared division/GCD readiness, factor-first solving, explicit readiness facts, and future extension points for Gröbner/elimination while keeping broad algebraic domains deferred.

The final synthesis should answer:

- what common patterns appeared across engines?
- where did sources disagree?
- which ideas combine well?
- which ideas conflict?
- what does Calcwiz need that no source provides directly?
- what should Calcwiz avoid?
- what is the smallest bounded Calcwiz-native design?
- what output taxonomy should it support?
- should it have a Playground runner?
- should that runner be visualized through Labs?
- what should remain research-only?

The final design must be simpler than the sum of the sources.

---

## Step 6 — Calcwiz-Native Proposal

The proposal translates the synthesis into implementable Calcwiz terms.

It should include:

- summary
- intended milestone name
- stable owner layer
- proposed interfaces/contracts
- minimal bounded implementation
- expected result types
- stop reasons
- domain/branch assumptions
- profile behavior if relevant
- UI/readback behavior if relevant
- Labs runner behavior if relevant
- test plan
- benchmark families
- migration path
- non-goals
- blockers
- risks
- next incubation step

The proposal should not automatically mean stable adoption.

---

## Step 7 — Incubation / Adoption Decision

Every area study should end with a decision:

```text
research-only
defer
create prerequisite milestone
create Level 0 experiment
create Level 1 feasibility study
create Level 2 bounded prototype
promote to integration candidate
create dev-only Labs runner
propose stable rewrite/adoption
retire
```

No endless research.

Every study must have an exit.

---

## Synthesis Modes

Not every task needs the full process.

Codex should implement or document three modes.

### Lite Synthesis

Use for tiny tasks:

- wording
- small UI hint
- small IntelliSense suggestion
- small badge/readback refinement
- small diagnostic

Deliverable:

```text
problem
evidence
decision
risk
```

No large source comparison.

No Labs runner unless the change is specifically about Labs.

### Standard Synthesis

Use for medium tasks:

- one subsystem affected
- 2–3 sources relevant
- moderate architecture risk
- bounded implementation likely

Deliverables:

```text
scope
source notes
short comparison
Calcwiz-fit evaluation
proposal
risks
```

Labs runner optional only if visual execution would clarify the experiment.

### Full Synthesis

Use for foundational areas:

- polynomial core
- simplification
- assumptions/domain logic
- complex numbers
- inequalities
- symbolic integration
- exact linear algebra
- graphing
- expression IR
- external compute
- semantic math editing / IntelliSense

Deliverables:

```text
00-scope.md
01-source-notes/*.md
02-cross-source-comparison.md
03-pattern-extraction.md
04-calcwiz-fit-evaluation.md
05-synthesis.md
06-calcwiz-native-proposal.md
07-benchmark-families.md
08-risks.md
```

A full synthesis may recommend a dev-only Labs runner, but should not implement it unless the milestone explicitly includes that.

---

## Missing Capability Policy

Sometimes an area study will discover that Calcwiz does not yet have a required foundation.

Examples:

- no complex-number core
- no inequality core
- no general assumptions system
- no exact matrix algebra
- no full branch-cut semantics
- no verified numeric backend
- no graphing core

Do not force adoption in these cases.

Use a prerequisite gate.

If a study finds a missing substrate, classify it as:

```text
blocker
bounded-workaround
playground-only
deferred
```

### Blocker

Use when the missing substrate is necessary for safe adoption.

Example:

```text
Complex branch-aware simplification requires COMPLEX-CORE0 before stable adoption.
```

### Bounded Workaround

Use when Calcwiz can safely support a restricted subset.

Example:

```text
Use real-domain-only bounded log/radical behavior and preserve conditions; defer complex branch behavior.
```

### Playground Only

Use when the idea is worth testing but not safe for stable code.

Example:

```text
Prototype inequality simplification as Level 0/1 research without product adoption.
```

### Deferred

Use when the idea is valuable but not urgent.

Example:

```text
Full regular-chain-based inequality solving is recorded but deferred.
```

Do not create a new core milestone for every tiny missing piece. Create a prerequisite milestone only when multiple meaningful proposals depend on the missing substrate.

---

## Security Problem: Source Mirrors Are Untrusted

External repo clones may contain malicious, harmful, or unsafe code.

Important distinction:

- cloned code is usually inert if only read statically
- risk increases when anything executes:
  - install scripts
  - builds
  - tests
  - package lifecycle scripts
  - IDE tasks
  - language server plugins
  - submodules
  - CI jobs
  - copied scripts

Therefore, source mirrors must be treated as untrusted by default.

---

## Source Mirror Security Policy

Codex should add or strengthen a security policy for `playground/sources/`.

Suggested file:

```text
playground/sources/SECURITY.md
```

It should define security tiers.

### Tier 0 — Registered Only

Metadata exists. No local clone.

Allowed:

- metadata
- intended value
- license notes
- contamination-risk notes

Forbidden:

- execution
- build
- dependency install

### Tier 1 — Static Mirror

Local clone exists under ignored mirror path.

Allowed:

- static reading
- grep/search
- source-path citation
- architecture notes
- evidence extraction

Forbidden:

- `npm install`
- `npm test`
- `cargo build`
- `make`
- `python setup.py`
- running examples
- recursive submodule cloning
- opening as trusted IDE workspace
- CI execution
- product dependency
- stable `src` references
- Labs runner execution from source mirror

This should be the default tier.

### Tier 2 — Sandboxed Execution

Only when necessary.

Allowed only in:

- disposable container
- VM
- isolated user account
- no secrets
- no write access to stable Calcwiz tree
- no GitHub write token
- no personal SSH keys
- no unapproved network access

Output copied back only as inert logs/artifacts.

Tier 2 execution is **not** the same as Labs runner execution.

Labs runners are approved local Playground runners. Source mirrors are untrusted external code.

### Tier 3 — Approved Executable Research

Rare.

Requires explicit review and memory record.

Still forbidden:

- product dependency
- code copying by default
- stable adoption without incubation

---

## Source Mirror Security Metadata

Extend source mirror metadata if not already present.

Suggested fields:

```yaml
security_tier: "static-only"
execution_policy: "no-execute"
submodules_policy: "do-not-recurse"
dependency_install_policy: "forbidden-unless-sandboxed"
ide_trust_policy: "open-restricted"
network_policy: "no-network-execution"
secrets_policy: "no-secrets"
allowed_commands: "git status, git log, git grep, static file reads"
forbidden_commands: "npm install, npm test, cargo build, make, python setup.py, arbitrary scripts"
last_security_review: "YYYY-MM-DD"
security_notes: "..."
```

If adding all fields is too heavy for this milestone, add a smaller required subset and document the rest as follow-up.

---

## Labs Runner Security Policy

Because `PGL-VIS1` now exists, this upgrade must also include or document Labs runner security.

Suggested file:

```text
playground/RUNNERS.md
```

or a section in:

```text
playground/README.md
```

Required principles:

- Labs runners are allowlisted, not discovered dynamically from arbitrary files.
- Runner metadata must declare:
  - runner id
  - experiment id
  - input kinds supported
  - whether corpus cases are supported
  - whether custom input is supported
  - output envelope shape
  - experimental/developer-only label
- No runner may execute source mirrors.
- No runner may execute shell commands unless a future explicit milestone approves that.
- No runner may use secrets.
- No runner may call remote/SSH/provider infrastructure by default.
- No runner may write into stable product files.
- No runner may add normal calculator history entries.
- No runner may mutate normal stable app state.
- No runner may become a production solver backend.
- Release builds must not expose the runner bridge.
- Runner bridge endpoints must remain dev-only.
- Every runner must map back to a Playground record/manifest.
- Every runner must have tests.

Recommended runner categories:

```text
local-stable-probe
local-playground-experiment
corpus-comparison
remote-experiment-prohibited
source-mirror-execution-prohibited
```

For now, only local stable probes and local Playground experiments should be allowed.

---

## Structural Organization Proposal

Recommended structure:

```text
playground/
  README.md
  RUNNERS.md

  sources/
    README.md
    SECURITY.md
    INDEX.md
    metadata/
      fricas.yaml
      sympy.yaml
      maxima.yaml
      sagemath.yaml
      giac-xcas.yaml
      symengine.yaml
    mirrors/
      .gitkeep
      # local clones ignored

  area-studies/
    README.md
    INDEX.md
    templates/
      lite-synthesis.md
      standard-synthesis.md
      full-synthesis/
        00-scope.md
        01-source-note.md
        02-cross-source-comparison.md
        03-pattern-extraction.md
        04-calcwiz-fit-evaluation.md
        05-synthesis.md
        06-calcwiz-native-proposal.md
        07-benchmark-families.md
        08-risks.md

  records/
    INDEX.md
    # experiment records

  manifests/
    # experiment manifests

  promotion-reviews/
    # optional later

  adoption-ledger.md
    # optional later
```

Do not overbuild optional parts unless explicitly approved.

---

## Recommended First Infrastructure Milestone

Suggested milestone name:

# INCUBATION-INFRA1

or:

# AREA-SYNTH0+

Possible title:

**Incubation Infrastructure: secure source mirrors, Labs runner rules, area-study synthesis modes, and prerequisite gates**

The exact name can be chosen based on repo naming conventions.

This milestone should likely include:

1. `playground/sources/SECURITY.md`
2. source-mirror metadata security fields or documented follow-up
3. `playground/RUNNERS.md` or equivalent runner policy section
4. `playground/area-studies/README.md`
5. `playground/area-studies/INDEX.md`
6. synthesis-mode templates:
   - lite
   - standard
   - full
7. full-synthesis templates:
   - scope
   - source note
   - cross-source comparison
   - pattern extraction
   - Calcwiz-fit evaluation
   - synthesis
   - Calcwiz-native proposal
   - benchmark families
   - risks
8. missing-capability / prerequisite-gate template
9. memory updates
10. optional validator if lightweight

---

## Boundary Rules For This Upgrade

Do not:

- add product math behavior
- add solver behavior
- add normal user UI feature behavior
- clone new repos unless explicitly approved
- execute source mirrors
- add submodules
- add external runtime dependency
- copy code from source mirrors
- make stable `src` code import from raw `playground/`
- make stable `src` code read source mirrors or area studies
- expose Labs runners in release builds
- allow Labs runners to execute source mirrors
- allow Labs runners to run remote/SSH/provider jobs
- mix Labs runs into normal calculator history/provenance
- claim external-engine parity
- start a full polynomial/simplification/complex/inequality study unless approved

This is infrastructure.

---

## Suggested Validation

If lightweight validation is added, create:

```text
tools/area-studies-core.mjs
tools/validate-area-studies.mjs
tools/validate-area-studies.test.mjs
```

Possible script:

```json
"test:area-studies": "node --test tools/validate-area-studies.test.mjs && node tools/validate-area-studies.mjs"
```

Possible checks:

- `playground/area-studies/README.md` exists
- `playground/area-studies/INDEX.md` exists
- templates exist
- full-synthesis template files exist
- no stable `src` references to `playground/area-studies`
- no area-study files are placed under `playground/sources`
- no source mirror local path is used as runtime dependency
- any real area study includes required files
- no private local paths appear in area-study tracked files

If source mirror security fields are added, update `test:source-mirrors`.

If runner policy is formalized, consider adding or strengthening checks around the Labs runner registry so approved runners stay mapped to records/manifests and do not expose forbidden categories.

---

## Memory Updates

Update memory after implementation.

Likely files:

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/YYYY-MM/YYYY-MM-DD.md`
- `.memory/open-questions.md` if something remains unresolved
- `.memory/research/checklists/YYYY-MM/TRACK-INCUBATION-INFRA1-MANUAL-VERIFICATION-CHECKLIST.md`

Memory should record:

- Incubation Infrastructure is the preferred framing.
- Source mirrors are treated as untrusted context by default.
- PGL-VIS1 exists as a dev-only approved local runner bridge.
- Labs runners are not product features or source-mirror execution.
- Area studies are the preferred cross-engine synthesis method.
- Calcwiz’s math philosophy is truth-first and exact-when-appropriate.
- Missing foundations become explicit gates, bounded workarounds, Playground-only experiments, or deferred notes.

Suggested memory decision:

```text
Calcwiz Incubation Infrastructure now distinguishes source mirrors, area studies, experiment records, dev-only Labs runners, and stable adoption. Source mirrors are treated as untrusted context by default. PGL-VIS1 provides approved local runner execution only behind explicit development flags; it is not product behavior, source-mirror execution, or remote compute. Full synthesis follows a multi-step flow: scope, isolated source notes, source-vs-source comparison, pattern extraction, Calcwiz-fit evaluation, synthesis, proposal, and incubation/adoption decision. Calcwiz’s math philosophy is truth-first and exact-when-appropriate, so periodic families, no-solution cases, undefined domains, approximations, and unsupported surfaces must be represented honestly rather than forced into fake exactness.
```

---

## Manual Verification Checklist

Add a checklist file:

```text
.memory/research/checklists/YYYY-MM/TRACK-INCUBATION-INFRA1-MANUAL-VERIFICATION-CHECKLIST.md
```

It should include:

- what is achieved now
- manual repo inspection steps
- expected results
- source mirror security checks
- Labs runner security checks
- structure checks
- synthesis-mode checks
- missing-capability policy checks
- truth-first math policy checks
- what is explicitly not included

---

## Test Plan

At minimum run:

```bash
npm run test:memory-protocol
npm run test:source-mirrors
npm run test:labs-catalog
npm run test:playground
npm run lint
npm run build
```

If area-study validation is added:

```bash
npm run test:area-studies
```

If runner registry or Labs rules are touched:

```bash
npm run test:unit -- src/lib/labs/runner-registry.test.ts src/lib/labs/catalog.test.ts
npm run test:ui -- src/components/LabsPanel.ui.test.tsx
```

If package scripts or CI/release workflows are changed, run or justify:

```bash
npm run test:gate
```

---

## Expected Completion Report

Codex should report:

1. What repo state was inspected first?
2. What already existed?
3. What was added?
4. How did the implementation account for `PGL-VIS1`?
5. Were any source repos cloned? Expected: no, unless explicitly approved.
6. Were any source mirrors executed? Expected: no.
7. Were any Labs runner permissions expanded? Expected: no, unless explicitly approved.
8. Did stable product code change behavior? Expected: no.
9. Did stable `src` gain any dependency on raw Playground/source/area-study content? Expected: no.
10. Were security policies added?
11. Were runner policies added or strengthened?
12. Were synthesis modes documented?
13. Was the missing-capability gate documented?
14. Was the truth-first math philosophy recorded?
15. Which tests passed?
16. What is the recommended next milestone?

---

## Recommended Next Milestone After This Upgrade

After the infrastructure upgrade, the next useful milestone could be one of:

```text
AREA-POLY0
AREA-SIMPLIFY0
AREA-COMPLEX0
AREA-INEQ0
AREA-INTELLISENSE0
```

The safest first real full synthesis is probably:

```text
AREA-POLY0: Cross-engine polynomial-core synthesis
```

Reason:

- polynomials are foundational
- the repo already has polynomial and rational substrate work
- the problem is bounded enough to test the new synthesis method
- it connects to future integration, factorization, exact algebra, and graphing

Do not start this milestone unless explicitly approved.

---

## Final Instruction

Treat this as a serious infrastructure upgrade.

The purpose is to make Calcwiz safer and smarter at learning from external systems and running internal experiments.

The final guiding principles are:

1. External code is untrusted by default.
2. Source mirrors are context, not dependencies.
3. Dev-only Labs runners are approved local experiment bridges, not product behavior.
4. The research unit is a Calcwiz capability area, not an external engine.
5. Full synthesis separates evidence, comparison, pattern extraction, Calcwiz-fit evaluation, and final proposal.
6. Calcwiz is truth-first and exact-when-appropriate, not fake-exact.
7. Missing foundations become explicit gates, bounded workarounds, Playground-only experiments, or deferred notes.
8. Nothing is adopted because another engine does it.
9. Every adopted idea must be translated into Calcwiz-native bounded architecture.
