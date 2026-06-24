# EQUATION-CARDANO-FERRARI-GENERATED-HANDOFF-AUDIT1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Decision

Generated and wrapper Cardano/Ferrari remain non-live. The live formula surface is:

- top-level direct degree-3 selected-target polynomials through `cubic-cardano`;
- top-level rational equations whose safe denominator clearing produces degree 3 through `cubic-cardano`;
- top-level direct degree-4 selected-target polynomials through `quartic-ferrari`;
- top-level rational equations whose safe denominator clearing produces degree 4 through `quartic-ferrari`.

Do not add `cubic-cardano` or `quartic-ferrari` to generated-handoff route order, generated branch family lists, composition/carrier/mixed algebraic branch handoff, exp/log generated handoff, trig generated handoff, or wrapper back-substitution until the prerequisites below exist and are verified.

## Live Repo Evidence

### Route Planning

- `src/lib/equation/target-shape/route-plan.ts` includes `cubic-cardano` and `quartic-ferrari` in top-level polynomial/rational plans.
- `GENERATED_HANDOFF_ROUTE_ORDER` deliberately excludes both formula families.
- Generated-handoff route-plan tests cover polynomial generated branches, quartic generated branches, and target-denominator generated branches so formula normalization cannot accidentally become live there.

### Shared Generated Branch Handoff

- `src/lib/equation/parameterized/generated-branch-handoff.ts` accepts caller-provided family lists, intersects them with generated-handoff route plans, and records skipped-family evidence.
- Its success carrier is intentionally narrow: branch equation, winning family, `exactLatex`, optional global `exactSupplementLatex`, and solution strings extracted by `solutionExpressionsFromExactLatex`.
- That carrier cannot preserve `branchReadback`, structured `caseMath`, detail sections, compact definition cards, route-local symbols, answer-domain metadata, or case-local facts.

### Current Wrapper Users

- `composition.ts`, `carrier.ts`, `carrier-elimination.ts`, and `mixed-algebraic-branches.ts` use `solveGeneratedBranchEquations` and then rebuild finite solution lists from extracted solution expressions.
- `exp-log-generated-handoff.ts` has a separate generated handoff limited to `linear`, `polynomial`, `rational`, and `carrier`.
- `trig.ts` still blocks nonlinear cubic/quartic trig arguments at the non-affine-argument boundary rather than generating formula handoff branches.

### Regression Coverage

- `generated-branch-handoff.test.ts` proves explicitly supplied `cubic-cardano` and `quartic-ferrari` families are skipped and never attempted in generated handoff.
- `route-plan.test.ts` proves generated-handoff polynomial and target-denominator plans exclude both formula families.
- `composition.test.ts` proves `sqrt(z^3+z+1)=b` and `sqrt(z^4+z+1)=b` stop without generated formula attempts.
- `exp-log.test.ts` proves `ln(z^3+z+1)=b` and `ln(z^4+z+1)=b` stop without generated formula attempts.
- `trig.test.ts` proves `sin(z^3+z+1)=b` and `sin(z^4+z+1)=b` remain outside generated formula handoff.

## Why It Stays Blocked

### Real Formula Output Is Conditional

Real Cardano and Real Ferrari are not unconditional finite branch lists. They depend on case-local conditions such as `Delta>0`, `Delta=0`, `Delta<0`, `p=0`, `q=0`, `p!=0`, `p<0`, resolvent choices, multiplicity, and radicand inequalities. The current generated branch handoff can only aggregate global supplements and extracted solution expressions.

Flattening a Real formula case answer into `target in {...}` would turn conditional rows into unconditional roots, which is mathematically wrong.

### Complex Formula Output Has Route-Owned Definitions

Complex Cardano and Ferrari branch rows depend on route-owned definitions:

- Cardano: `A`, `B`, `C`, `p`, `q`, `Delta`, `R`, `U_k`, omega multipliers, and denominator facts such as `R!=0`.
- Ferrari: `A`, `B`, `C`, `D`, `p`, `q`, `r`, `P`, `Q`, `Delta`, `R`, `U`, `Y`, `S`, `F_sigma`, branch signs, and facts such as `U!=0` and `S!=0`.

Wrapper output must either preserve those definitions under back-substitution or introduce a new local definition namespace. The current handoff string-extracts root expressions and discards definition ownership.

### Scoped Facts Need A Carrier

Wrapper transformations add their own facts:

- radical and square-root wrappers add nonnegative radicand facts;
- absolute-value wrappers add sign branch facts;
- logarithmic wrappers add argument positivity and base facts;
- exponential wrappers add inverse-domain facts;
- rational wrappers add denominator exclusions;
- trigonometric wrappers add range, periodic-parameter, angle-unit, and branch-family facts.

Formula routes add leading-coefficient, denominator, discriminant/case, resolvent, branch-cut, and radicand facts. These cannot all be merged into a single global `exactSupplementLatex` array without losing which facts apply to which row.

### Candidate Validation Is Not Optional

Top-level formula routes solve the input equation directly. Wrapper routes would solve a generated equation, then substitute through one or more inverse carriers. Before live output, the wrapper layer must validate each candidate against the original equation or an equivalent fact-checked chain, including:

- denominator exclusions from both wrapper and formula normalization;
- carrier-domain conditions;
- branch sign conditions;
- case-local Real formula conditions;
- Complex branch/principal-root policy;
- periodic integer-parameter scopes;
- multiplicity and dedupe behavior.

### Display/Copy Contracts Are Not Ready For Generated Cases

Display can render top-level `caseMath` and branch lists, but the generated handoff carrier does not model "case answer produced under a wrapper". Copy Result, To Editor, History, and replay should continue using canonical `exactLatex`, while visible generated formula output may need promoted case rows plus definition/detail cards. That mapping must be designed before live wrapper formulas.

## Wrapper Readiness Matrix

| Surface | Current status | Main blocker before formula handoff |
| --- | --- | --- |
| Top-level direct polynomial | Live for degree 3/4 | None for current scope |
| Top-level rational clearing | Live for cleared degree 3/4 | None for current scope |
| Generated branch shared handoff | Non-live for formulas | Needs structured payload beyond `exactLatex` string extraction |
| Algebraic composition: radicals, powers, abs | Best first wrapper candidate later | Needs scoped facts, candidate validation, and case/branch payload preservation |
| Carrier and carrier-elimination | Later after shared payload | Back-substitution can produce multiple generated equations and inherited carrier facts |
| Mixed algebraic branches | Later after carrier validation | Branch explosion, inherited facts, and dedupe need structured validation |
| Exp/log wrappers | Later after algebraic wrappers | Positivity/base facts and generated equation facts must remain case-scoped |
| Trig wrappers | Last | Periodic families, angle units, infinite families, and nonlinear-argument policy are harder than finite algebraic wrappers |

## Required Prerequisites For A Future Live Handoff

1. A structured generated-formula handoff payload that can carry:
   - finite branch rows;
   - Real case rows;
   - route-owned definitions;
   - global facts;
   - case-local facts;
   - branch-local facts;
   - answer domain;
   - source family and trace evidence.
2. A wrapper candidate-validation layer that records how generated roots were back-substituted and which original-equation checks/facts justify them.
3. A definition namespace policy so Cardano/Ferrari symbols cannot collide with wrapper-local symbols or each other.
4. A Display mapping for generated formula case rows that keeps Copy Result/History/replay canonical while rendering useful visible definition cards.
5. A branch/case dedupe policy that can distinguish equal expressions under different facts from genuinely duplicate roots.
6. A formula-size and branch-count policy for wrapper-expanded outputs before they reach user-visible readback.
7. Route trace evidence that clearly records generated formula attempts, stops, successes, and wrapper validation results.

## Recommended Implementation Order

1. `EQUATION-GENERATED-FORMULA-HANDOFF-PAYLOAD1`: internal payload only. Teach generated handoff to represent structured branch/case payloads without adding live Cardano/Ferrari wrapper attempts.
2. `EQUATION-GENERATED-FORMULA-VALIDATION1`: candidate and fact validation substrate for wrapper back-substitution. Still no broad wrapper formula solving.
3. `EQUATION-ALGEBRAIC-WRAPPER-FORMULA-HANDOFF1`: first live narrow wrapper, likely one-layer radical/absolute/algebraic composition where generated degree 3/4 equations stay finite and validation is straightforward.
4. `EQUATION-CARRIER-FORMULA-HANDOFF1`: carrier and carrier-elimination adoption after the shared payload/validation seams are proven.
5. `EQUATION-EXPLOG-FORMULA-HANDOFF1`: exp/log generated equations after positivity/base facts can be case-scoped.
6. `EQUATION-TRIG-FORMULA-HANDOFF0/1`: audit first, implementation last, because periodic and angle-unit readback interact with formula case output.

## Hard Non-Live Rules Until Then

- Do not add `cubic-cardano` or `quartic-ferrari` to `GENERATED_HANDOFF_ROUTE_ORDER`.
- Do not add formula families to generated branch handoff family arrays in composition, carrier, carrier-elimination, mixed algebraic, exp/log, or trig routes.
- Do not parse Real `caseMath` exact strings into solution-expression sets.
- Do not flatten Cardano/Ferrari definition cards into wrapper-local raw LaTeX.
- Do not emit generated formula `RootOf`, implicit-root notation, or numeric-only Exact fallback.
- Do not change Display, History, OOE, app-state, Tauri, or persisted schemas for this audit.

## Audit Conclusion

The next move is not "turn on Cardano/Ferrari under wrappers." The next move is the generated-formula handoff payload substrate, followed by wrapper candidate/fact validation. After that, algebraic wrappers should be the first live family, with exp/log later and trig last.
