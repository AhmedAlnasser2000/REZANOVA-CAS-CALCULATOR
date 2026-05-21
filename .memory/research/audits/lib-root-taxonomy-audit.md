# LIB-ORG0: Root `src/lib` Taxonomy Audit

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Summary
`src/lib` currently has 78 root-level TypeScript files mixed across math domains, app navigation, formatting, runtime state, and tests. `LIB-ORG0` records the intended owners before code moves. `LIB-ORG1` through `LIB-ORG3` should move files with clean import rewrites and no root-level compatibility shims.

## Move Taxonomy
| Old root path or pattern | New owner folder | Commit phase | Reason |
| --- | --- | --- | --- |
| `src/lib/abs-core*` | `src/lib/algebra/` | `LIB-ORG1` | Absolute-value algebra substrate belongs with algebra/domain cores. |
| `src/lib/algebra-transform*` | `src/lib/algebra/` | `LIB-ORG1` | Algebra transform helpers align with existing transform/branch cores. |
| `src/lib/exact-supplements*` | `src/lib/algebra/` | `LIB-ORG1` | Exact helper behavior is algebra substrate, not root app glue. |
| `src/lib/polynomial-core*` | `src/lib/algebra/` | `LIB-ORG1` | Polynomial core is a reusable algebra substrate. |
| `src/lib/polynomial-factor-solve*` | `src/lib/algebra/` | `LIB-ORG1` | Polynomial factor/solve bridge depends on polynomial algebra primitives. |
| `src/lib/polynomial-roots*` | `src/lib/algebra/` | `LIB-ORG1` | Polynomial root helper is algebra-domain behavior. |
| `src/lib/radical-core*` | `src/lib/algebra/` | `LIB-ORG1` | Radical normalization is an algebra substrate. |
| `src/lib/rational-function-core*` | `src/lib/algebra/` | `LIB-ORG1` | Rational-function core is algebra substrate for later integration work. |
| `src/lib/symbolic-factor.ts` | `src/lib/algebra/` | `LIB-ORG1` | Symbolic factoring adapter belongs with algebra helpers. |
| `src/lib/equation-history*` | `src/lib/equation/` | `LIB-ORG1` | Equation replay/history helpers belong with equation mode logic. |
| `src/lib/equation-navigation*` | `src/lib/equation/` | `LIB-ORG1` | Equation navigation belongs with the equation domain. |
| `src/lib/equation-ux*` | `src/lib/equation/` | `LIB-ORG1` | Equation UX/result helpers are equation-domain presentation. |
| `src/lib/matrix*` | `src/lib/linear-algebra/` | `LIB-ORG1` | Product Matrix adapter should live beside the reusable matrix core. |
| `src/lib/vector*` | `src/lib/linear-algebra/` | `LIB-ORG1` | Product Vector adapter should live beside the reusable vector core. |
| `src/lib/linear-algebra-workbench*` | `src/lib/linear-algebra/` | `LIB-ORG1` | Linear-algebra workbench belongs with Matrix/Vector adapters. |
| `src/lib/calculate-navigation*` | `src/lib/modes/` | `LIB-ORG1` | Calculate navigation is mode scaffolding rather than math substrate. |
| `src/lib/core-mode.ts` | `src/lib/modes/` | `LIB-ORG1` | Core draft state is shared mode scaffolding. |
| `src/lib/adaptive-simpson*` | `src/lib/calculus/` | `LIB-ORG2` | Numeric finite-integral helper belongs to calculus. |
| `src/lib/antiderivative-rules*` | `src/lib/calculus/` | `LIB-ORG2` | Integration primitive rules belong to calculus. |
| `src/lib/calculus-core*` | `src/lib/calculus/` | `LIB-ORG2` | Shared calculus evaluator is the calculus boundary. |
| `src/lib/calculus-eval.ts` | `src/lib/calculus/` | `LIB-ORG2` | Free-form calculus resolver belongs to calculus. |
| `src/lib/calculus-strategy*` | `src/lib/calculus/` | `LIB-ORG2` | Strategy badge mapping is calculus result metadata. |
| `src/lib/calculus-verification.ts` | `src/lib/calculus/` | `LIB-ORG2` | Antiderivative backcheck boundary belongs to calculus. |
| `src/lib/calculus-workbench*` | `src/lib/calculus/` | `LIB-ORG2` | Guided calculus state/workbench belongs to calculus. |
| `src/lib/finite-limit-target*` | `src/lib/calculus/` | `LIB-ORG2` | Directional finite-limit target parsing belongs to calculus. |
| `src/lib/limit-heuristics*` | `src/lib/calculus/` | `LIB-ORG2` | Limit fallback heuristics belong to calculus. |
| `src/lib/format.ts` | `src/lib/display/` | `LIB-ORG3` | Shared LaTeX/approx formatting belongs to display utilities. |
| `src/lib/math-notation*` | `src/lib/display/` | `LIB-ORG3` | Math notation display helpers belong to display utilities. |
| `src/lib/numeric-output*` | `src/lib/display/` | `LIB-ORG3` | Numeric output formatting is display policy. |
| `src/lib/symbolic-display*` | `src/lib/display/` | `LIB-ORG3` | Symbolic readback normalization is display policy. |
| `src/lib/complex*` | `src/lib/numeric/` | `LIB-ORG3` | Complex scalar helper is numeric substrate. |
| `src/lib/discrete-eval.ts` | `src/lib/numeric/` | `LIB-ORG3` | Discrete numeric evaluator belongs with numeric helpers. |
| `src/lib/real-numeric-eval*` | `src/lib/numeric/` | `LIB-ORG3` | Real numeric evaluator belongs with numeric helpers. |
| `src/lib/signed-number.ts` | `src/lib/numeric/` | `LIB-ORG3` | Signed number parser is numeric input substrate. |
| `src/lib/math-engine*` | `src/lib/engine/` | `LIB-ORG3` | Main expression engine is high-traffic orchestration. |
| `src/lib/math-analysis*` | `src/lib/engine/` | `LIB-ORG3` | Input analysis belongs beside the expression engine. |
| `src/lib/semantic-planner*` | `src/lib/engine/` | `LIB-ORG3` | Planner is engine orchestration, not a domain folder. |
| `src/lib/result-guard*` | `src/lib/engine/` | `LIB-ORG3` | Result magnitude guard is engine safety policy. |
| `src/lib/input-canonicalization*` | `src/lib/input/` | `LIB-ORG3` | Raw input cleanup belongs to input utilities. |
| `src/lib/schemas.ts` | `src/lib/app-state/` | `LIB-ORG3` | Runtime persistence schemas belong to app-state helpers. |
| `src/lib/history-schema.test.ts` | `src/lib/app-state/` | `LIB-ORG3` | History schema test follows schemas. |
| `src/lib/settings.test.ts` | `src/lib/app-state/` | `LIB-ORG3` | Settings schema test follows schemas. |
| `src/lib/tauri.ts` | `src/lib/app-state/` | `LIB-ORG3` | Tauri persistence bridge depends on app-state schemas. |
| `src/lib/launcher*` | `src/lib/navigation/` | `LIB-ORG3` | Launcher tree belongs to navigation utilities. |
| `src/lib/menu.ts` | `src/lib/navigation/` | `LIB-ORG3` | Soft menu/keypad metadata belongs to navigation utilities. |

## Expected Root After LIB-ORG3
`src/lib` should be folder-first, with no compatibility shims left behind. Any remaining root files must be explicitly justified as stable package-level entrypoints.
