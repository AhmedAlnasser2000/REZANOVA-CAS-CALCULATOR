## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Gate 1

- gate_id: LINEAR-ALGEBRA-WORKSPACE-REPAIR-GATE1
- gate_type: ui
- status: verified-user-approved-for-commit

## Scope

- Repaired Matrix/Vector workspace keypad overrides through the existing `KeypadPanel` and workspace keypad router; no second keyboard was introduced.
- Matrix now receives Matrix-specific operation rows including basis, coordinates, change/solve, LU/PLU solves, characteristic polynomial, matrix power, transpose, adjoint, and spectral/profile controls while retaining numeric rows, cursor movement, EXE, templates, and base symbols.
- Vector now receives Vector-specific operation rows including projections, unit, Gram-Schmidt, span/independence, orthogonality, distance, area/volume controls, dot/cross/norm, numeric rows, cursor movement, EXE, and templates.
- Added parser/normalizer aliases for keypad-emitted forms including `diagonalize(...)`, `transpose(...)`, `adjoint(...)`, `dot(...)`, and `gramSchmidt(...)`; legacy `diag(...)` remains accepted as a diagonalization alias.
- Repaired scalar-cell keyboard movement at cell edges:
  - Enter commits and advances; Shift+Enter moves backward.
  - ArrowRight/ArrowLeft move to neighboring cells only at cell edges.
  - ArrowUp/ArrowDown move within the same Matrix column.
- Revalidated visible scalar drafts when Domain or Parameter substitution selectors change, so Real/Complex and stored-value mode no longer leave stale invalid cell feedback or uncommitted drafts.

## Evidence

- `npx vitest run src/lib/navigation/menu.test.ts src/lib/linear-algebra/editor-parser.test.ts` — pass: 17 tests.
- `npx vitest run --config vitest.ui.config.ts src/app/workspaces/LinearAlgebraEditorSource.ui.test.tsx` — pass: 6 tests.
- `npx tsc -b --pretty false` — pass.
- `npm run build` — pass, with existing large-chunk warnings.
- `npx playwright test e2e/linear-algebra-scalar-substrate.spec.ts --project=chromium` — pass after sandbox escalation for local preview port binding.
- `git diff --check` — pass.
- `npm run test:file-sizes` — pass.

## Manual checklist for user approval

### What is achieved now

- Matrix and Vector use the same app keypad component, but the visible rows are now workspace-specific instead of generic calculator/calculus rows.
- Matrix and Vector scalar cells are navigable without manually clicking each neighboring box.
- Domain and Parameters selector changes re-check the visible cell draft immediately.

### Manual app steps

1. Open Linear Algebra > Matrix.
2. Inspect the keypad:
   - base layer should show Matrix operations including `basis`, `change`, `lu`, `plu`, `char`, `A†`, plus `7/8/9`, arrows, `EXE`, templates, comma, and `i`;
   - Shift should show `diagz`, `coords`, `solve`, `lusolve`, `plusolve`, and matrix `pow`;
   - Ctrl should show `nrank`, `cond`, `adj`, `pinv`, `definite`, and `svd`.
3. In Matrix A cells, type a value, move the caret to the end, press ArrowRight, then ArrowLeft, ArrowDown, and ArrowUp.
4. Type `i` in Real mode and commit; confirm the guidance appears. Change Domain to Complex; confirm the guidance clears without needing to retype.
5. Store a variable `a=5`, type `a` in a Matrix cell, switch Parameters to Use Stored Values, and confirm the source cell still displays `a` with a resolved preview and `Used: a=5`.
6. Open Linear Algebra > Vector.
7. Inspect the keypad:
   - base layer should show Vector operations including `u`, `v`, `proj_u`, `proj_v`, `unit`, `gram`, `orth_u`, `dot`, `cross`, `norm`, `orth_v`, numeric rows, arrows, `EXE`, templates, comma, and `i`;
   - Ctrl should show `parallel`, `distance`, `area`, `triArea`, and `volume`;
   - Matrix-only keys such as `basis` and `char` should not appear.
8. In Vector u cells, press ArrowRight/ArrowLeft at cell edges and confirm focus moves between components.

### Expected results

- No generic `d/dx` or unrelated calculus keypad rows appear in Matrix or Vector.
- Matrix gets an 8-row keypad because it needs the extra system/spectral row; Vector stays at 7 rows.
- Cell arrow movement only jumps cells at the edge; normal in-cell caret movement remains MathLive-owned.
- Selector text and row/column/length controls stay readable, and wide Matrix/Vector cards do not overflow the panel.
- This gate does not address runtime proof/presentation bugs yet; those remain Gate 2.

## Gate 2

- gate_id: LINEAR-ALGEBRA-WORKSPACE-REPAIR-GATE2
- gate_type: ui
- status: verified-awaiting-user-approval-for-commit

## Scope

- Repaired conditional Matrix case presentation and proof authority so `rank(A)`, `rref(A)`, and `[a]u=[1]` can display visible comma separators before conditions without breaking canonical MathJSON proof.
- Changed empty-set presentation in symbolic Matrix system cases from `emptyset` wording to `\varnothing`.
- Fixed explicit ordered-unknown Matrix parsing for forms such as `A[u;v]=[e;f]`; bare `e` and `f` are treated as formal parameters rather than Euler/function-state accidents.
- Fixed symbolic mixed-entry inverse evidence such as `A^{-1}` for `[[u,v],[3,2]]`, preserving visible fractions and determinant conditions without proof mismatch.
- Fixed complex adjoint presentation/proof mismatch by using scalar-owned canonical LaTeX for exact complex entries while still rendering top-level symbolic division as explicit fractions.
- Fixed complex Vector named-function dispatch for dot, orthogonality, angle, and Gram-Schmidt so those routes no longer fall through to scalar parse errors. Complex angle remains titled `Principal line angle`.
- Added a small `editor-list-split.ts` helper so semicolon inline-vector parsing does not push `editor-parser.ts` over the file-size cap.
- Ratcheted MathJSON coverage for the newly exposed proven Matrix conditional leaves; coverage is now 491 leaves, 491 proven, 0 exempt, 0 missing.
- Added order-independent V4 leaf-path test coverage because V4 is now a current committed canonical-result version; future-version validation now uses V5 instead of treating V4 as future.

## Evidence

- `npx vitest run src/lib/linear-algebra/scalar-wire.test.ts src/lib/linear-algebra/editor-parser.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/editor-dispatch-named-values.test.ts src/lib/linear-algebra/symbolic-matrix.test.ts src/lib/linear-algebra/symbolic-matrix-systems.test.ts src/lib/linear-algebra/symbolic-vector.test.ts src/lib/linear-algebra/symbolic-vector-editor.test.ts` — pass: 66 tests.
- `npm run build` — pass, with existing large-chunk warnings.
- `npx playwright test e2e/linear-algebra-symbolic-systems.spec.ts e2e/matrix-symbolic-arithmetic.spec.ts e2e/vector-symbolic-complex.spec.ts --project=chromium` — pass: 9 tests after sandbox escalation for local preview/browser access.
- `npm run test:result-contract` — pass: 18 files, 126 tests.
- `npm run test:canonical-result-v2-enforcement` — partial pass after sandbox escalation: frozen-producer enforcement and focused `v2-contract`/`mathjson-coverage` Vitest pass, but the wrapper stops at `test:display-contract-inversion` because an unrelated committed `src/lib/statistics/core.ts` owner-assembly fingerprint is stale (`88b887a606f6171917ab:1` -> `96f4e72ff0d24bc2a1c5:1`). Gate 2 intentionally did not refresh that Statistics-owned baseline.
- `npm run test:file-sizes` — pass: 1989 files, 5 baseline caps.

## Mixed worktree note

- The checkout still contains unrelated Notebook changes, untracked Notebook files, and untracked `test-results/`. Gate 2 intentionally leaves those lanes unstaged.
- `.memory/current-state.md` was not updated for this gate because the broad operating posture did not change; Gate 2 is a narrow Matrix/Vector repair and this session dossier plus the July 16 journal carry the verified evidence.

## Manual checklist for user approval

### Matrix

1. Open Linear Algebra > Matrix with Domain `Real`, Parameters `Symbolic`.
2. Set `A=[a]`; run `Au=[1]`.
   - Expected: two cases; one shows `\varnothing, u=0` or equivalent empty-set case for `a=0`; the nonzero case shows `u=[1/a]`; no struck/ugly empty-set wording.
3. Set `A=[u]`; run `rank(A)` and `rref(A)`.
   - Expected: cases show a visible comma separator before `u≠0` and `u=0`; no cramped condition merge.
4. Set `A=[[a,b],[c,d]]`; run `A[u;v]=[e;f]`.
   - Expected: it runs in Matrix, treats `u,v` as unknowns and `e,f` as parameters, and does not show “outside Matrix/Vector structured forms.”
5. Set `A=[[u,v],[3,2]]`; run `A^{-1}`.
   - Expected: no canonical proof mismatch; result shows fractions over `2u-3v` with a nonzero-determinant condition.
6. Switch Domain to `Complex`; set `A=[[1,i],[a,1-i]]`; run `adjoint(A)`.
   - Expected: no proof mismatch; complex entries render cleanly such as `-\imaginaryI` and `1+\imaginaryI` rather than awkward `0-...` forms.

### Vector

1. Open Linear Algebra > Vector with Domain `Complex`, Parameters `Symbolic`.
2. Set `u=[1,i]` and `v=[i,1]`.
3. Run `u·v`.
   - Expected: answer `0`; no scalar parse error.
4. Run `orthogonal(u,v)`.
   - Expected: `Orthogonal`; no scalar parse error.
5. Run `∠(u,v)`.
   - Expected: title `Principal line angle`; no canonical proof mismatch.
6. Run `gramSchmidt(u,v)`.
   - Expected: successful Vector result; no “Unsupported Matrix/Vector editor expression” and no scalar parse error.
