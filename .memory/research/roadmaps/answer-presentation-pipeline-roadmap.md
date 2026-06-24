# ANSWER-PRESENTATION-PIPELINE-ROADMAP0

Date: 2026-06-24
Status: active roadmap

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Purpose

Define the next answer-readback architecture after `ANSWER-PRESENTATION-SOURCE-MIRROR-AUDIT0`.

The source-mirror audit found a consistent model across SymPy, Maxima, FriCAS, Giac/Xcas, SymEngine, SageMath, and GeoGebra: answers stay as expression objects, output forms, visitors, rich representations, or template-aware expression nodes until a central presentation stage renders them. Calcwiz should converge on the same shape using its existing MathJSON and Symbolic Primitives, not by making LaTeX string normalization smarter every time a solver emits a new branch shape.

## Core Decision

Calcwiz needs a producer-side answer presentation pipeline before more local readback patches.

The pipeline is Equation-owned first:

- solvers produce structured presentation items;
- items carry MathJSON nodes where available;
- Symbolic Primitives normalize expression nodes recursively;
- one shared Equation presentation renderer turns those items into LaTeX;
- the existing LaTeX normalizer remains final polish and compatibility fallback;
- Display renders the already-presented result and does not become a CAS.

## Non-Goals

- No Display-side algebra or Display parsing.
- No History, app-state, Tauri, OOE, or schema changes in the roadmap.
- No Rust migration for MathJSON, readback, expression trees, symbolic dispatch, or presentation.
- No broad rewrite of all existing result producers at once.
- No `RootOf`, implicit-root notation, symbolic principal-branch Complex roots, or rectangular radical coordinate policy.
- No Calculate algebra-action bridge; Calculate `Simplify`, `Factor`, and `Expand` remain product actions until a dedicated bridge milestone.

## Target Internal Shape

The first implementation should introduce a small internal Equation presentation IR, likely under:

```text
src/lib/equation/presentation/
```

Candidate types:

- `EquationAnswerPresentation`
- `EquationPresentationContext`
- `EquationPresentationItem`
- `EquationFiniteRootItem`
- `EquationFiniteSetItem`
- `EquationFamilyItem`
- `EquationApproximationItem`
- `EquationFactGroupRef`

Minimum context:

- solve target;
- variable-role map / target analysis;
- domain intent;
- complex exact form;
- output style / exact-vs-decimal surface intent;
- reserved identifiers such as the imaginary unit;
- source labels and route tags when already present.

Minimum finite-root item:

```text
target
node?
fallbackLatex
source
facts?
branch metadata?
```

The IR should not be a public Display schema. It is a producer-side rendering seam that can adapt back to current `DisplayOutcome` fields while migration is in progress.

## Render Pipeline

Expected flow:

1. Solver route produces `EquationAnswerPresentation`.
2. Finite roots and branch expressions keep MathJSON nodes when possible.
3. Node-backed expressions run through `simplifyMathJsonNodeOrOriginal`.
4. The presentation renderer turns nodes/items into LaTeX.
5. The safe LaTeX readback normalizer applies final local polish.
6. Existing `DisplayOutcome.exactLatex`, `branchReadback`, supplements, facts, details, and approximation fields are produced as compatibility surfaces.

Important boundary: routes can still own solver judgment, facts, source labels, stop reasons, and branch semantics. The presentation seam owns the repeated act of turning structured answers into displayable output.

## Milestone Sequence

### 0. `ANSWER-PRESENTATION-PIPELINE-ROADMAP0`

Status: this roadmap.

Scope:

- docs/memory only;
- commit the source-mirror audit and roadmap together;
- lock that source-mirror-style expression-aware presentation is the next readback strategy;
- no code changes.

### 1. `ANSWER-PRESENTATION-IR1`

First implementation milestone.

Status: implemented first slice on 2026-06-24.

Scope:

- add the internal Equation presentation IR and renderer adapters;
- support finite root/set answers first;
- adapt back to current `DisplayOutcome` fields;
- migrate only one or two known noisy finite-root producers.

Recommended first consumers:

1. polynomial/complex carrier follow-on finite roots, especially `(x^2+x)^2-(x^2+x)-1=0`;
2. parameterized quadratic/polynomial finite root branches, where nodes already exist or can be preserved cleanly.

Actual first consumers:

1. polynomial/complex carrier follow-on finite roots;
2. parameterized quadratic/polynomial finite root branches.

Success criteria:

- visible output for migrated producers comes from presentation items, not raw route-built final LaTeX;
- node-backed nested radicals are normalized through the recursive simplification primitive before rendering;
- raw `exactLatexOverride` remains fallback only when decomposition or presentation-item rebuilding is unsafe;
- no Display schema change.

### 2. `ANSWER-PRESENTATION-ROOT-SET-PARITY1`

Broaden the IR to all root-set readback paths already using `EquationRootSet`.

Likely consumers:

- factorable explicit product roots;
- expanded exact-rational factorable roots;
- algebraic isolation finite roots;
- exact-rational special-form roots.

Success criteria:

- root representation remains the canonical internal source for exact finite roots;
- facts/supplements/details still render exactly as before;
- branch rows and exact sets share the same presentation item source;
- fallback remains available for legacy strings.

### 3. `ANSWER-PRESENTATION-COMPLEX-PARITY1`

Move complex finite roots and complex special-form branches through the IR.

Scope:

- honor `complexExactForm`;
- keep `cis` explicit only for cis mode;
- keep rectangular/polar high-degree fallback as exact trig branch notation until rectangular radical coordinates are implemented;
- do not introduce symbolic principal-branch roots.

Success criteria:

- notation policy is centralized in presentation context;
- complex routes stop assembling final branch LaTeX independently when nodes/branch metadata exist.

### 4. `ANSWER-PRESENTATION-FAMILY-PARITY1`

Add non-finite family presentation items only after finite roots are stable.

Likely surfaces:

- periodic `k` families;
- representative branches;
- finite discovered family rows;
- future implicit/deferred roots.

Non-goal:

- Do not parse existing prose/detail sections for math facts.

### 5. `ANSWER-PRESENTATION-DISPLAY-COMPAT-CLOSEOUT0`

Audit-only closeout after enough producers migrate.

Questions to answer:

- Which raw exact LaTeX bypasses remain?
- Which are necessary compatibility surfaces?
- Can Display branch extraction be simplified because producers now supply structured presentation?
- Are there any cases where route-owned final LaTeX is still semantically required?

## Migration Rules

- Migrate one producer family at a time.
- Keep route tests and manual QA fixtures for every migrated producer.
- Preserve current facts, supplements, details, source labels, stops, and schemas.
- Prefer MathJSON nodes already held by producers; do not add broad LaTeX-to-MathJSON parsing in v1.
- Fail closed to legacy LaTeX when presentation item rebuilding is unsafe.
- Do not let final-answer polish become algebraic solving.

## Manual QA Seed Cases

Use these after implementation milestones, not for this roadmap-only commit:

- `(x^2+x)^2-(x^2+x)-1=0` with Complex On.
- `ax^2+bx+c=0` solved for `x`.
- `F=ma` solved for `m`.
- `x^5=32` with rectangular, polar, and cis Complex exact forms.
- `(x+a)^12=b`.

## Current Risks

- Some producers still only hold final LaTeX.
- Some exact overrides are semantically meaningful and should fail closed.
- Moving too many producers at once would make parity failures hard to isolate.
- If Display starts parsing arbitrary math, ownership is wrong; the structure must come from producers.

## Expected Outcome

After this roadmap and the first implementation slices, recurring answer-readback problems should shift from repeated string-patch bugs to explicit producer migration gaps. That is the durable source-mirror-aligned shape.
