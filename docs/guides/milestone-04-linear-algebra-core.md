# Milestone 04: Linear Algebra Core

Status: active.

What changed:
- The `MatrixVec` virtual-keyboard page is now active.
- Matrix and Vector modes now use the main editor for structured template entry.
- Matrix and vector notation is available without pretending the editor is a full symbolic matrix CAS.

What the new symbols mean:
- Matrix template: inserts a structured `bmatrix` template.
- Vector template: inserts a structured column-vector template.
- Transpose: adds `^T`.
- Determinant: wraps an expression in `det( )`.
- Inverse: adds `^-1`.
- Dot: inserts a dot-product template.
- Cross: inserts a cross-product template.
- Norm: inserts `|| ||`.

Where to find them:
- Virtual keyboard page: `MatrixVec`
- Matrix mode main editor
- Vector mode main editor

Best modes:
- Use `Matrix` for matrix operations such as `A+B`, `A×B`, `det(A)`, inverse, and transpose.
- Use `Vector` for dot, cross, norm, and angle.
- Use the main editors for quick structured entry, copying, and reuse.

Worked examples:
1. Open `Matrix`, focus the main editor, and insert a matrix template.
   Expected: a structured matrix appears in the editor and can be copied or edited.
2. Open `Vector`, focus the main editor, and insert a vector template.
   Expected: a structured column vector appears in the editor.
3. In `Matrix`, insert transpose or determinant notation in the editor, then run the actual numeric operation from the soft keys.
   Expected: editor entry and operational workflow stay clearly separated.

Common mistakes:
- Do not expect `Calculate` to evaluate arbitrary matrix notation as full CAS matrix algebra.
- Do not expect the editor itself to replace Matrix or Vector operation ownership.
- Use Matrix mode for matrix operations and Vector mode for vector operations.

Exact vs numeric expectations:
- Matrix and Vector mode operations use their dedicated numeric workflows.
- The editor is for structured notation and reuse, not full symbolic solving.
