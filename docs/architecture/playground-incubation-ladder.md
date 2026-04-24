# Playground Incubation Ladder for Calcwiz

Status: guidance note

Current sequencing update, 2026-04-24:
- External compute remains a valid incubation lane, but it is parked after the `PGL5+` SSH VM hardening proof.
- The SSH proof is preserved; provider-host expansion is deferred rather than rejected.
- Near-term Playground work should improve the incubation system, non-remote evidence quality, and graduation discipline before remote execution resumes.

Purpose: define how Calcwiz can explore frontier capabilities such as aggressive symbolic search, external compute, vector-heavy workflows, and integration patterns without contaminating the stable calculator architecture.

Source context:
- `C:\Users\ahmed\Downloads\Calcwiz Playground  Incubation Ladd.txt`

This note is intentionally architectural rather than aspirational. It exists to answer:
- what Playground is
- what Playground is not
- how it relates to the current kernel-first Calcwiz architecture
- how experiments move from idea to bounded prototype to adoption
- what rules prevent incubation from turning into a second hidden system

---

## Why this exists

Calcwiz has two valid but competing needs.

### 1. Stable product growth

The main calculator needs:
- predictable behavior
- bounded execution
- trustworthy exact output
- honest stop reasons
- maintainable architecture
- regression safety

### 2. Frontier experimentation

Calcwiz also needs room for ideas that may be powerful before they are trustworthy enough for the main app:
- deeper symbolic-search strategies
- semi-bounded planner experiments
- remote or external compute
- higher-dimensional vector workflows
- experimental transformation systems
- hybrid symbolic/numeric procedures
- reusable integration and embedding patterns

Without a formal incubation model, one of two failure modes becomes likely:
- the stable app becomes too conservative and promising ideas never get real pressure-testing
- experimental logic leaks into production architecture and quietly creates a second system

The Playground / incubation ladder is meant to prevent both.

---

## Core conclusion

Calcwiz should treat Playground as a **level-based incubation system**, not as:
- a new production core
- a parallel solver runtime
- a hidden dependency source for app behavior
- an “advanced mode” that bypasses the stable architecture by convenience

The stable architecture remains:
- one runtime kernel
- reusable bounded algebra cores
- thin orchestrators
- thin adapters
- UI as presentation only

Playground is a proving ground for future capability. It is not an authority layer.

That distinction is the most important thing in this note.

---

## Relationship to current Calcwiz architecture

The repo already has a clear architecture direction:
- `src/lib/kernel/*` is the single runtime authority
- shared algebra capabilities are being extracted into bounded reusable cores
- orchestrators compose those cores into staged solving flows
- adapters translate runtime output into app-facing result surfaces

The Playground must respect that direction.

### Stable layers stay authoritative

The following continue to own product behavior:
- kernel/runtime policy
- stable algebra cores
- staged orchestrators
- app-facing adapters
- result rendering and UX contracts

### Incubation remains subordinate

Playground may:
- reuse stable layers
- compare alternate strategies
- host experiments that are too risky for immediate product use
- produce evidence for or against future adoption

Playground may not:
- become a second stable runtime
- own product-facing contracts
- define backdoor execution paths for the main app
- quietly replace stable stages with experimental logic

This is how Calcwiz can become more ambitious without losing trust.

---

## The one-way dependency law

This is the governing rule for the whole model.

### Allowed direction

Incubation code may import stable code from the product architecture when reuse is useful or necessary, especially:
- `src/lib/kernel/*`
- stable algebra cores under `src/lib/*`
- orchestrators and adapters where the experiment is explicitly comparing against product behavior
- stable shared contracts, types, and render helpers

### Forbidden direction

Stable product code must **never** import from Playground or any incubation level.

In plain language:
- incubation may depend on stable code
- stable code may not depend on incubation code

### Why this law matters

This law prevents the most dangerous contamination path:
- “the experiment works, so let’s just call it from the app”

That move feels fast, but it would:
- blur architectural authority
- bypass bounded contracts
- weaken trust in exact behavior
- make future cleanup harder
- create a second hidden system under the main one

### Exceptions

Default policy: none.

If a future exception is ever proposed, it should be treated as an architectural escalation, not as a routine implementation detail.

---

## Graduation rule

A successful experiment does not become a product feature by direct reuse.

It graduates by:
1. proving value in incubation
2. gaining explicit scope and known limits
3. making its stop reasons legible
4. identifying the correct stable architectural home
5. being extracted or rewritten into that stable layer
6. acquiring stable tests, contracts, and product-facing behavior there

This means:
- Playground discovers and pressure-tests ideas
- stable architecture adopts only the bounded form of those ideas

That is the difference between incubation and architectural drift.

---

## Levels

The ladder is intentionally more precise than “experiment or ship.”

### Level 0 — Research

Purpose:
- explore wild ideas
- sketch algorithms
- compare theoretical approaches
- learn what might be interesting

Typical properties:
- messy
- heuristic
- incomplete
- expensive
- often not yet bounded

Good examples:
- alternate symbolic-search strategies
- transform-chain exploration
- remote compute spike code
- high-dimensional vector sketches

Question answered:
- is this idea interesting enough to deserve more time?

### Level 1 — Feasibility

Purpose:
- determine whether the idea works repeatedly on real examples

Typical properties:
- repeated example coverage
- visible value over current product behavior
- first sense of success and failure zones
- some measurement of usefulness

Question answered:
- does this actually work, and is it worth continuing?

### Level 2 — Bounded Prototype

Purpose:
- turn a promising experiment into something constrained and explainable

Typical properties:
- explicit input/output shape
- known scope
- known limits
- known stop reasons
- stable-ish behavior on a bounded surface
- first meaningful testability

Question answered:
- can this become safe enough to reason about?

### Level 3 — Integration Candidate

Purpose:
- decide whether the bounded prototype deserves a real place in product architecture

Typical properties:
- proposed stable ownership layer
- adoption cost and risk understood
- trust model clarified
- performance/cost envelope better understood

Possible outcomes:
- adopt into a stable algebra core
- adopt into an orchestrator stage
- adopt into an optional advanced workflow
- keep experimental
- reject from adoption

Question answered:
- what should this become, if anything?

### Level 4 — Adopted

Purpose:
- move the capability into stable Calcwiz architecture

Typical properties:
- rewritten or extracted into the correct stable layer
- no app dependency on Playground code
- bounded behavior declared
- tests and contracts added in product code

Question answered:
- is this ready for controlled adoption?

### Level 5 — Mature Shipped Capability

Purpose:
- represent features that are no longer experimental wins but part of Calcwiz itself

Typical properties:
- documented
- regression-tested
- bounded where promised
- trusted enough to compose with other stable systems

Question answered:
- has this become a real product capability?

---

## Promotion philosophy

The ladder should be treated as a promotion system, not just a labeling system.

Important principle:
- experiments are not simply “rejected” or “shipped”
- they move through levels as they earn the right to become more trusted

This matters because many good ideas are valuable before they are product-safe.

Examples of legitimate outcomes:
- an idea dies at Level 0
- an idea proves feasibility but never becomes bounded enough to ship
- an idea remains permanently experimental because it is useful for research but not for product trust
- an idea becomes a bounded prototype and eventually graduates

The model is flexible on purpose.

---

## What belongs in Playground

Strong candidates include:
- aggressive symbolic-search and planner experiments
- heuristic ranking over already-shipped solver cores
- external compute / SSH-backed symbolic workflows
- vector and high-dimensional numerical experiments
- experimental integration and embedding shapes
- hybrid symbolic/numeric procedures too risky for immediate product use
- performance comparison harnesses for alternate math strategies

These fit because they may provide value before they have a product-grade trust model.

---

## What does not belong in Playground

The Playground must not become:
- a junk drawer for random unfinished code
- a shortcut place to ship features without stable extraction
- a hidden stable dependency source
- a replacement for ordinary product modules
- a second runtime authority competing with the kernel

The following are especially dangerous:
- “temporary” product patches that live in Playground but affect stable behavior
- UI surfaces that bypass the stable product workflow for convenience
- registration paths where the main app dynamically discovers and calls Playground logic

If any of those appear, the model has started drifting.

---

## Recommended repo boundary

The safest first implementation is a top-level area such as:

```text
playground/
  README.md
  level-0-research/
  level-1-feasibility/
  level-2-bounded-prototypes/
  level-3-integration-candidates/
  templates/
  manifests/
  records/
```

Why top-level is preferred:
- it is visibly outside the stable `src/` tree
- it makes accidental imports easier to detect
- it helps future lint/CI rules stay simple
- it discourages the idea that incubation is just another product package

### Suggested internal structure

A good hybrid structure is:
- level-first for maturity
- lane folders inside levels for topic area

For example:

```text
playground/
  level-0-research/
    symbolic-search/
    external-compute/
    vectors/
  level-1-feasibility/
    symbolic-search/
  level-2-bounded-prototypes/
    symbolic-search/
  records/
    graduation/
    retirement/
```

That keeps both maturity and topic visible.

---

## Experiment record requirements

Every meaningful experiment should carry lightweight metadata.

Recommended fields:
- owner
- date started
- lane/topic
- current level
- hypothesis
- why this matters
- explicit scope
- out-of-scope cases
- known stop reasons
- success criteria
- promotion criteria
- retirement criteria
- notes on trust, determinism, latency, or cost when relevant

This is how the Playground avoids becoming a pile of untraceable ideas.

---

## Promotion checklist

Before a candidate moves upward, it should answer:
- what hypothesis did it prove?
- what exact examples worked?
- what exact examples failed?
- what scope is explicitly in and out?
- what are the stop reasons?
- what are the performance, trust, latency, and cost characteristics?
- what stable layer should eventually own the adopted form?
- what should be extracted versus rewritten?

If those answers are still fuzzy, the candidate is not ready to move up.

---

## Enforcement recommendations

The one-way dependency law should eventually be enforced by tooling, not just by documentation.

Recommended later enforcement:
- path alias restrictions
- lint rules that disallow imports from `playground/` into stable `src/`
- CI checks that fail on forbidden import direction
- clear top-level README guidance for how to add a new experiment

The rule is too important to rely on memory alone.

---

## Recommended first pilots

### First recommended pilot: symbolic-search incubation

Why this should come first:
- it reuses current algebra cores immediately
- it fits the existing bounded-solver architecture
- it exercises the incubation model without adding remote trust boundaries yet
- it gives high signal with relatively low infrastructure cost

Potential early experiments:
- alternate symbolic-search ordering
- heuristic ranking over transform candidates
- planner comparison harnesses
- broader search with explicit failure classification

### Strong second pilot: external compute / SSH

Why it should be second rather than first:
- it is a very strong Playground candidate
- but it adds trust, cost, fallback, latency, and job-handling complexity
- those concerns can obscure whether the incubation model itself is working

External compute belongs in incubation, but not necessarily as the first proof of the system.

Recommended first move inside that lane:
- foundations first
- provider-neutral runner/job/artifact contracts
- SSH as the expected first future transport
- a local harness proof before any real provider execution

---

## Anti-patterns to avoid

These are the clearest warning signs of drift:
- stable code importing from Playground
- Playground code becoming the easiest place to add product behavior
- no manifest or record for experiments
- unclear level ownership
- experiments graduating without explicit stable extraction
- Playground becoming a vague “advanced features” dump

If any of those start happening, the model should be corrected immediately.

---

## First implementation guidance

The first implementation step should be governance and boundary work, not a giant subsystem.

Recommended order:
1. formalize the rules
2. create the repo boundary
3. enforce the one-way import law
4. add experiment records and templates
5. run one real pilot
6. evaluate whether promotion is working before expanding further

This keeps the Playground from turning into a parallel app before the rules are proven.

---

## Final position

The Playground idea is good, but only under the right framing:

- not a flat sandbox
- not a production core
- not a shortcut dependency source
- yes as a level-based incubation system
- yes as a one-way dependency sink
- yes as a future-feature laboratory whose successes graduate by extraction

That framing is what makes the idea powerful instead of dangerous.

---

## Calculator-visible Playground is a later, separate decision

This note does not treat calculator-visible Playground UI as part of the core incubation ladder.

If Calcwiz later wants Playground to appear visibly inside the calculator, that should be handled through a separate post-`PGL` roadmap rather than being folded into the current incubation milestones.

Reason:
- repo/workflow incubation and calculator-visible experimental UI change different trust boundaries

Recommended interpretation:
- finish proving the incubation model first
- then decide whether a visible Playground surface is worthwhile
- if it is, start with an internal developer/operator console before considering any broader user-facing experimental mode

Related roadmap:
- `.memory/research/pgl-vis-roadmap.md`
