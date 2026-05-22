# AREA-ASSUMPTIONS0 Synthesis

## Findings

The study confirms that assumptions are not a single feature and not an integration-only concern.

Calcwiz already has strong local discipline: rational functions preserve denominator constraints, equations validate candidates, calculus stops unsafe definite integrals, limits detect some real-domain one-sided failures, branch-core tracks bounded branch families, and simplify-policy records trust/preserved facts. The risk is that these facts remain local and therefore drift as more algebra/calculus/table/graphing surfaces appear.

External mirrors agree on the deeper point: serious symbolic systems carry domain and assumption context. They disagree on how: FriCAS uses typed domains, SymPy uses assumptions and sets, Maxima uses global assumptions/sign queries, SageMath uses parent/domain orchestration, Giac/XCAS uses practical solve/singularity assumptions, SymEngine keeps lightweight predicates, and GeoGebra stresses visible CAS/graph workflow correctness.

## What To Carry Forward

- Facts should be request-scoped and result-attached.
- Denominator exclusions should be structured data.
- Branch/principal-range choices should be explicit when they matter.
- Trust level should travel with readable/equivalent forms.
- Interval hazards should distinguish proof from sampling.
- Unsupported fact propagation should stop honestly.
- Source mirrors are evidence, not architecture parents.

## What Not To Inherit

- FriCAS's full domain/category runtime.
- SymPy's public assumptions API breadth.
- Maxima's global mutable session assumptions.
- SageMath's multi-backend orchestration identity.
- Giac/XCAS's broad calculator-CAS parity target.
- SymEngine-only minimalism that ignores product readback needs.
- GeoGebra's graph-first product workflow.

## Capability Boundary

Recommended boundary:

- `ASSUMPTIONS-CORE0` owns typed facts, fact merging, trust labels, source-operation tags, and display-safe summaries.
- Existing algebra/equation/calculus/table/display modules continue owning their current behavior.
- Consumers attach or read facts through narrow adapters.

Deferred:

- global user-facing `assume(...)`
- broad inequality solving
- complex branch-cut theorem proving
- graphing behavior changes
- general piecewise engine
- feature parity with any mirror

## Decision

Recommended next move: `ASSUMPTIONS-CORE0`.

Reason: `DOMAIN-FACTS0` would be too narrow because branch/principal-range and trust facts are already active blockers across rational readback, inverse functions, limits, and future graphing. `BRANCH-POLICY0` would be too narrow because denominator exclusions and real-domain interval hazards are equally important. A small shared typed fact substrate is the bounded core that lets both narrower concerns become consistent without committing to a broad assumptions engine.
