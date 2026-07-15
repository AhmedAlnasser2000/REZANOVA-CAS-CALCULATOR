# Matrix SVD, Pseudoinverse, and Conditioning Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Result

- milestone: `MATRIX-SVD-PINVERSE-CONDITIONING1`
- gate: backend
- status: verified pass
- next milestone: numerical checkpoint

## Evidence

- Focused backend verification passed 223/223 across SVD calculation, Matrix parser/dispatch, request schema, worker/OOE execution, History schema, all 58 Matrix authority selectors, and 46 golden executions. The decomposition core separately passed 5/5, including the required rank-one pseudoinverse, condition 3, singular infinity, rectangular SVD, and 8 by 8 boundary.
- Focused Linear Algebra UI passed 4/4 and confirms all four Matrix Ctrl-layer templates. Guide, navigation, and keyboard catalog tests pass.
- Result-contract passed 114/114. Canonical enforcement retains 20 frozen producer files; coverage is 146 evidence cases and 466/466/0/0 proven/exempt/missing leaves.
- Display inversion passed 24/24 with 404 producer boundaries, 155 native documents, 57 canonical consumers, zero compatibility projections, and zero legacy reads.
- OOE boundaries passed 8/8; compartment boundaries passed 36/36; the exact selectively staged snapshot passes MathJSON coverage and the production TypeScript/Vite build. Scoped ESLint, file-size validation, and dependency-tree resolution also pass.
- Chromium passed 1/1 for all four Ctrl templates, the required pseudoinverse, finite and infinite condition numbers, rectangular SVD factors, copy, detail collapse, Matrix History replay, overflow, and the oversized controlled stop.
- Visual evidence inspected: `.task_tmp/matrix-svd-pinverse-conditioning1/pseudoinverse-expanded.png`, `.task_tmp/matrix-svd-pinverse-conditioning1/rectangular-svd-expanded.png`, and `.task_tmp/matrix-svd-pinverse-conditioning1/oversized-inline-matrix-stop.png`. The numerical warning, threshold/rank/condition diagnostics, factor matrices, reconstruction evidence, and error are readable without clipping.

## Protected Worktree

- Concurrent Notebook and Statistics source/tests/styles/dossiers plus untracked `test-results/` remain unstaged.
- The shared `runtime-types.ts` contains both this milestone's Matrix operation-union hunk and concurrent Statistics inference work. Selective staging must include only the Matrix hunk.
- No push is authorized.
