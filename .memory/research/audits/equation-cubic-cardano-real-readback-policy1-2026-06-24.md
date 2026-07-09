# EQUATION-CUBIC-CARDANO-REAL-READBACK-POLICY1 Audit Note

Date: 2026-06-24
Repo: `/home/ahmed/Downloads/Calculator`
Status: complete
Gate type: Real-domain Cardano readback policy

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verdict

Real Cardano readback policy is now specific enough to plan a live implementation milestone, but this gate is documentation-only.

No production route skeleton, route order, tests, source code, Display schema, History schema, OOE behavior, app-state, Tauri behavior, or visible solver behavior changes in this milestone.

`EQUATION-COMPLEX-POWER-READBACK-UNIFICATION1` removed the remaining Complex notation clash: symbolic Complex branches now use `PrincipalRoot_n(r)\omega_k`, while Real output keeps real radicals. Real Cardano must therefore stay entirely in real notation and must never use Complex `PrincipalRoot` as an intermediate shortcut.

## Shared Definitions

For a direct selected-target cubic
`a*x^3+b*x^2+c*x+d=0`, with selected target `x`:

- Global fact: `a\ne0`.
- Define `A=b/a`, `B=c/a`, `C=d/a`.
- Define the depressed cubic substitution as `x=y-A/3`.
- Define `p=B-A^2/3`.
- Define `q=2A^3/27-AB/3+C`.
- Define `\Delta=(q/2)^2+(p/3)^3`.
- The readback should use these compact symbols instead of repeatedly expanding `a`, `b`, `c`, and `d`.

The global `Valid When` block may include `a\ne0`. Discriminant and degeneracy conditions are case-local facts, not global facts.

## Case Readback Policy

Future Real Cardano output must present mutually exclusive real cases. It must not show `\Delta>0`, `\Delta=0`, and `\Delta<0` together as global validity facts.

The preferred no-schema-change representation is a compact case-style answer string plus a `Real Cardano Cases` detail section. If existing Display cannot render the case rows clearly, the implementation milestone must stop and document the missing presentation prerequisite rather than emitting a misleading branch list.

### `\Delta>0`

Show the single real root using real cube-root notation:

`x=-A/3+\sqrt[3]{-q/2+\sqrt{\Delta}}+\sqrt[3]{-q/2-\sqrt{\Delta}}`.

Required case fact:

- `\Delta>0`.

Do not use `PrincipalRoot_3`, `U_k`, complex `\omega_k`, or a Cardano denominator fact in this case.

### `\Delta=0`

Split repeated-root readback into two subcases:

- Triple root case:
  - Conditions: `\Delta=0`, `p=0`, and `q=0`.
  - Answer: `x=-A/3`.
  - Multiplicity detail: root has multiplicity 3.
- Double-root case:
  - Conditions: `\Delta=0` and `p\ne0`.
  - Distinct roots:
    - `x=-A/3+3q/p`, simple root.
    - `x=-A/3-3q/(2p)`, double root.

For v1, the visible answer may list distinct roots and put multiplicity in a detail section. Do not invent a new multiplicity schema in `REAL-ROUTE1` unless that milestone explicitly includes one.

### `\Delta<0`

Use the real trigonometric casus irreducibilis form:

`x_k=-A/3+2\sqrt{-p/3}\cos(1/3\arccos((3q/(2p))\sqrt{-3/p})-2\pi k/3)`,
with `k=0,1,2`.

Required case facts:

- `\Delta<0`.
- `p<0`.

The formula uses exact radian constants. It must not depend on the app angle-unit setting.

Do not expose Complex intermediate radicals, `PrincipalRoot_3`, `RootOf`, implicit-root notation, or decimal fallback as Real Exact closure.

## Presentation And Facts Policy

- Global facts: only facts valid for every displayed case, currently `a\ne0`.
- Case facts: discriminant and degeneracy conditions must remain attached to their own case rows or case detail lines.
- Definitions detail: use `A`, `B`, `C`, `p`, `q`, and `\Delta`.
- Multiplicity: describe in detail text for v1; distinct-root answer rows may dedupe repeated roots.
- Branch ordering for `\Delta<0`: preserve `k=0,1,2`.
- Formula-size stops remain honest. If the compact case output cannot fit the route's safety limits, stop with a formula-size boundary rather than falling back to `RootOf`.

## Validation And Route Evidence Policy

Future `EQUATION-CUBIC-CARDANO-REAL-ROUTE1` must:

- reuse the n-degree symbolic polynomial substrate;
- reuse the `cubic-cardano` route family unless a later trace audit proves a separate family is needed;
- record route details with `{ degree: 3, algorithm: 'cardano', domain: 'real' }`;
- include exact symbolic or construction-based validation evidence for each emitted case form;
- keep generated-handoff Cardano disabled until transformed-cubic facts and validation are audited separately;
- prove mode-level boundaries: Complex Cardano stays compact, symbolic Complex powers stay `PrincipalRoot_n(r)\omega_k`, Real output never contains `PrincipalRoot` or `RootOf`, and direct Real odd-power output such as `u^3=a` stays radical-style.

## Implementation Sequencing Recommendation

`EQUATION-CUBIC-CARDANO-REAL-ROUTE1` should implement all three discriminant cases together for direct symbolic cubics. A partial `\Delta>0`-only route should not claim general symbolic Real Cardano unless it is explicitly scoped as a sign-known/numeric-coefficient route.

If implementation discovers that current Display surfaces cannot represent case-local facts clearly without schema work, stop and create a presentation prerequisite milestone instead of shipping misleading global facts.
