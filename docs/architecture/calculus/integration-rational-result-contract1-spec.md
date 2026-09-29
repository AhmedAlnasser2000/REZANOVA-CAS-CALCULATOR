# INTEGRATION-RATIONAL-RESULT-CONTRACT1

Started 2026-09-28; updated 2026-09-29. Backend, CRITICAL, root-only. User-approved implementation; no commit or push authorization.

## Contract

Canonical-result V5 is reserved for `rational-antiderivative` primaries with `formal-local-complex` semantics. It carries the integration variable, fresh integration constant, rational part, all-distinct-roots log terms and retained conditions. Each term binds a unique root variable in its monic square-free modulus, reduced weight and polynomial argument; the exact norm is a polynomial in the integration variable. Root ordering, principal logarithms and real-form conversion are not implied.

Ordinary components are producer-owned standard MathJSON. The dedicated binder supplies the semantics that V2–V4 cannot express. V2 remains the ordinary result and controlled-error format; no version-1 primitive or decision codec changes. Complete derivations remain outside display documents.

`src/lib/calculus/new-integration/result.ts` replays a decision against an explicit native input before projection. Polynomial coefficients and rational values are round-tripped through exact arithmetic; the argument is assembled from checked coefficient projections. A final bounded V5 schema validation and canonical authority check precede return. Root variables and the arbitrary integration constant cannot capture the integration variable or each other.

Schema validation checks bounded structured data, standard restricted arithmetic, polynomial domains, reduced coefficient degrees, monic modulus shape, binding, exact deterministic presentation and log-norm coverage. It does not prove square-freeness, recompute a resultant or prove an antiderivative: those remain mandatory native decision/projection obligations. A schema-valid document is never an imported proof of integration.

## Ownership and consumers

- Kernel production files remain independent of the application and result contract. The isolation test permits direct imports only from the four enumerated New Integration adapters: `exact-math.ts`, `result.ts`, `lowering.ts`, `service.ts`.
- `readRationalPrimitiveV5` validates and projects the typed document. The generic consumer returns `unsupported-semantics`; generic normalization rejects V5 rather than flattening it into an ordinary answer.
- Version routing, runtime validation, canonical authority, producer selectors and mathematical-leaf coverage recognize the extension. V5 runtime transfer actions are rejected.
- Copy rendering expands every root-log term, so the copied expression does not depend on abbreviated on-screen definitions.
- V1 frozen fingerprints and the 57-route inventory are unchanged. MathJSON and compatibility exemptions remain empty. AGENTS acknowledges the existing V4 and approved V5 extensions.

## Verification posture

Focused projection tests cover huge integers, V2 selection, V5 serialization/read models, source conditions, capture, altered norms/targets and exhausted contexts. Existing V1–V4 result-contract tests are retained. Full actual evidence and the pre-existing repository enforcement blocker are recorded in the 2026-09-29 result-contract dossier.

This is the representation prerequisite for adoption. It does not itself activate the workspace or constitute UI verification. The broader roadmap remains subject to change when necessary.

2026-09-29 closeout update: Claude commit `f1abd519` resolves the authority/display blockers; both checks pass. The missing New Integration worker-required runtime probe is implemented and passes. Final signoff is pending the Calculate V2 return-type compile error in that commit; see the dated dossier continuation. No integration commit or push.

Final 2026-09-29 posture: complete and verified; user authorized commit. Earlier blocker notes above are historical and resolved. See the final dossier entry for the bounded Calculate type repair, authority/display evidence and five real-app browser scenarios. No push or old Calculus retirement.
