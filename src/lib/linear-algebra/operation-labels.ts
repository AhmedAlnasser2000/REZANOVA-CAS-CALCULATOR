import type {
  MatrixOperation,
  MatrixSystemForm,
  VectorOperation,
} from '../../types/calculator';

export function matrixOperationLabel(operation: MatrixOperation, form?: MatrixSystemForm) {
  switch (operation) {
    case 'add': return 'A+B';
    case 'subtract': return 'A-B';
    case 'multiply': return 'A×B';
    case 'transposeA': return 'Transpose A';
    case 'transposeB': return 'Transpose B';
    case 'adjointA': return 'Adjoint A';
    case 'adjointB': return 'Adjoint B';
    case 'detA': return 'det(A)';
    case 'detB': return 'det(B)';
    case 'inverseA': return 'Inverse A';
    case 'inverseB': return 'Inverse B';
    case 'rankA': return 'rank(A)';
    case 'rankB': return 'rank(B)';
    case 'rrefA': return 'rref(A)';
    case 'rrefB': return 'rref(B)';
    case 'nullSpaceA': return 'null(A)';
    case 'nullSpaceB': return 'null(B)';
    case 'columnSpaceA': return 'col(A)';
    case 'columnSpaceB': return 'col(B)';
    case 'basisA': return 'basis(A)';
    case 'basisB': return 'basis(B)';
    case 'coordinatesA': return 'coords(A, v)';
    case 'coordinatesB': return 'coords(B, v)';
    case 'changeBasis': return 'change(A,B)';
    case 'luA': return 'lu(A)';
    case 'luB': return 'lu(B)';
    case 'pluA': return 'plu(A)';
    case 'pluB': return 'plu(B)';
    case 'luSolveA': return 'lusolve(A,b)';
    case 'luSolveB': return 'lusolve(B,b)';
    case 'pluSolveA': return 'plusolve(A,b)';
    case 'pluSolveB': return 'plusolve(B,b)';
    case 'multiRhsSolve': return 'AX=B';
    case 'qrA': return 'qr(A)';
    case 'qrB': return 'qr(B)';
    case 'columnProjectionA': return 'projCol(A,b)';
    case 'columnProjectionB': return 'projCol(B,b)';
    case 'leastSquaresA': return 'ls(A,b)';
    case 'leastSquaresB': return 'ls(B,b)';
    case 'invertibilityA': return 'invertible(A)';
    case 'invertibilityB': return 'invertible(B)';
    case 'profileA': return 'profile(A)';
    case 'profileB': return 'profile(B)';
    case 'definiteA': return 'definite(A)';
    case 'definiteB': return 'definite(B)';
    case 'svdA': return 'svd(A)';
    case 'svdB': return 'svd(B)';
    case 'pinvA': return 'pinv(A)';
    case 'pinvB': return 'pinv(B)';
    case 'condA': return 'cond(A)';
    case 'condB': return 'cond(B)';
    case 'nrankA': return 'nrank(A)';
    case 'nrankB': return 'nrank(B)';
    case 'charpolyA': return 'charpoly(A)';
    case 'charpolyB': return 'charpoly(B)';
    case 'eigenA': return 'eigen(A)';
    case 'eigenB': return 'eigen(B)';
    case 'diagonalizeA': return 'diag(A)';
    case 'diagonalizeB': return 'diag(B)';
    case 'spectralPowerA': return 'mpow(A,n)';
    case 'spectralPowerB': return 'mpow(B,n)';
    case 'linearSystem': return form === 'Ax+b=0' ? 'Ax+b=0' : 'Ax=b';
    default: return 'Matrix';
  }
}

export function vectorOperationLabel(operation: VectorOperation) {
  switch (operation) {
    case 'dot': return 'u·v';
    case 'cross': return 'u×v';
    case 'normA': return '‖u‖';
    case 'normB': return '‖v‖';
    case 'angle': return '∠(u,v)';
    case 'add': return 'u+v';
    case 'subtract': return 'u-v';
    case 'projectionUofV': return 'proj_u(v)';
    case 'projectionVofU': return 'proj_v(u)';
    case 'orthogonalToU': return 'orth_u(v)';
    case 'orthogonalToV': return 'orth_v(u)';
    case 'unitA': return 'unit(u)';
    case 'unitB': return 'unit(v)';
    case 'orthogonalCheck': return 'orthogonal(u,v)';
    case 'gramSchmidtUV': return 'gram(u,v)';
    case 'parallel': return 'parallel(u,v)';
    case 'distance': return 'distance(u,v)';
    case 'parallelogramArea': return 'parallelogramArea(u,v)';
    case 'triangleArea': return 'triangleArea(u,v)';
    case 'volume': return 'volume(u,v,w)';
    case 'linearCombination': return 'Vector combination';
    case 'span': return 'span(...)';
    case 'independent': return 'independent(...)';
    default: return 'Vector';
  }
}
