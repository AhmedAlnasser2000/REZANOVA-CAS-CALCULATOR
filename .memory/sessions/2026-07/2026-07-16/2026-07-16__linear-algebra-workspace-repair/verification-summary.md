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
