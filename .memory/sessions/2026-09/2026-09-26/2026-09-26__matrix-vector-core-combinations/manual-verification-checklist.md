# Matrix and Vector Typed Editor - Manual Verification

## What is achieved now

- Matrix and Vector editors evaluate supported typed combinations of scalar, Matrix, and Vector values with exact/symbolic coefficients and explicit type, shape, and limit stops.
- Calculate evaluates inline Matrix/Vector expressions as quick answers; named Matrix/Vector libraries remain workspace-local.
- The native MathLive Insert Matrix menu places typing in the first entry of later inserted matrices.

## Manual app steps

1. In Matrix, insert a matrix through MathLive's right-click size grid, type `+`, insert a second 3 by 3 matrix, and type its first entry. Repeat for a third matrix.
2. In Vector, insert two 3 by 1 matrices through the same menu with `+` between them and type into each first entry.
3. In Matrix, run `det(A)+det(B)`, `2A-B`, `A/2`, and Matrix `A` times an inline column vector. Confirm `A(u+v)` reports that Vector names are local.
4. In Vector, run `unit(u+v)` and `dot(u,v)+dot(u,v)`.
5. In Calculate, run an inline 2 by 2 Matrix times an inline length-2 Vector and confirm the result is an answer without creating named Matrix/Vector objects.
6. Try mismatched dimensions, division by zero, a Matrix larger than 8 by 8, and an exact determinant above its existing limit; confirm controlled errors without numeric substitution.

## Expected results

- Later inserted matrices and vectors remain intact when typing their first entries.
- Supported answers render in the active workspace with exact values where available.
- Unsupported types, shapes, and limits explain the stop; Calculate's own scalar variables retain their existing meaning.
