import {demand,type ExecutionContext} from './execution';
import type {PositiveFraction,PositiveFractionField} from './positive-fraction';
import {positiveFractionOrderAtZero} from './positive-hess';
import {positiveBezout} from './positive-polynomial';
import {freezeExactMatrix,equalExactMatrices,type ExactMatrix} from './arithmetic-matrix';
export type PositiveLocalOperation<E>=Readonly<{kind:'swap';target:number;source:number}|{kind:'scale';target:number;factor:PositiveFraction<E>}|{kind:'add';target:number;source:number;factor:PositiveFraction<E>}>;
export interface PositiveLocalModule<E>{readonly input:ExactMatrix<PositiveFraction<E>>;readonly operations:readonly PositiveLocalOperation<E>[];readonly basis:ExactMatrix<PositiveFraction<E>>;readonly transformation:ExactMatrix<PositiveFraction<E>>;readonly inverse:ExactMatrix<PositiveFraction<E>>}
function identity<E>(ctx:ExecutionContext,f:PositiveFractionField<E>,n:number){ctx.allocate(n*n);return Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>f.fromInteger(ctx,i===j?1n:0n)));}
function copy<E>(ctx:ExecutionContext,f:PositiveFractionField<E>,input:ExactMatrix<PositiveFraction<E>>){const n=input.length;demand(Number.isSafeInteger(n*n),'invalid-input','local module dimensions');ctx.allocate(n*n+n);return input.map(row=>{demand(row.length===n,'invalid-input','full local module rows');for(const v of row)f.assert(ctx,v);return[...row];});}
function apply<E>(ctx:ExecutionContext,f:PositiveFractionField<E>,a:PositiveFraction<E>[][],op:PositiveLocalOperation<E>){const n=a.length;demand(Number.isSafeInteger(op.target)&&op.target>=0&&op.target<n,'verification-failed','local module target');
 if(op.kind==='swap'||op.kind==='add')demand(Number.isSafeInteger(op.source)&&op.source>=0&&op.source<n&&op.source!==op.target,'verification-failed','local module source');
 if(op.kind==='swap'){[a[op.target],a[op.source]]=[a[op.source],a[op.target]];return;}
 f.assert(ctx,op.factor);const order=positiveFractionOrderAtZero(ctx,op.factor);demand(op.kind==='scale'?order===0:op.kind==='add'&&(order===null||order>=0),'verification-failed','local unimodular coefficient');
 for(let j=0;j<n;j++)a[op.target][j]=op.kind==='scale'?f.multiply(ctx,a[op.target][j],op.factor):f.add(ctx,a[op.target][j],f.multiply(ctx,op.factor,a[op.source][j]));
}
function monomial<E>(ctx:ExecutionContext,f:PositiveFractionField<E>,power:number){ctx.degree(power);ctx.allocate(power+1);return f.make(ctx,f.ring.make(ctx,[...Array<E>(power).fill(f.ring.field.fromInteger(ctx,0n)),f.ring.field.fromInteger(ctx,1n)]),f.ring.one(ctx));}
function truncated<E>(ctx:ExecutionContext,f:PositiveFractionField<E>,value:PositiveFraction<E>,power:number){if(power===0)return f.fromInteger(ctx,0n);const modulus=monomial(ctx,f,power).numerator,bezout=positiveBezout(ctx,f.ring,value.denominator,modulus);demand(f.ring.degree(ctx,bezout.gcd)===0,'verification-failed','local Taylor unit denominator');return f.make(ctx,f.ring.divide(ctx,f.ring.multiply(ctx,value.numerator,bezout.s),modulus).remainder,f.ring.one(ctx));}
/** Canonical DVR row Hermite form at u=0. Only local units may scale rows;
 * every addition coefficient belongs to k[u]_(u). Terminal pivots are powers
 * of u and pivot residues are completely truncated. Both span directions are
 * witnessed by the exact elementary operations and their inverse. */
export function normalizePositiveLocalModule<E>(ctx:ExecutionContext,f:PositiveFractionField<E>,input:ExactMatrix<PositiveFraction<E>>):PositiveLocalModule<E>{const a=copy(ctx,f,input),n=a.length,u=identity(ctx,f,n),operations:PositiveLocalOperation<E>[]=[];
 const perform=(op:PositiveLocalOperation<E>)=>{ctx.allocate(4);apply(ctx,f,a,op);apply(ctx,f,u,op);operations.push(Object.freeze(op));};
 for(let k=0;k<n;k++){let selected=-1,minimum=0;for(let i=k;i<n;i++){const order=positiveFractionOrderAtZero(ctx,a[i][k]);if(order!==null&&(selected<0||order<minimum)){selected=i;minimum=order;}}demand(selected>=0&&minimum>=0,'verification-failed','integral independent local ideal');if(selected!==k)perform({kind:'swap',target:k,source:selected});const pivot=monomial(ctx,f,minimum);perform({kind:'scale',target:k,factor:f.exactDivide(ctx,pivot,a[k][k])});
  for(let i=k+1;i<n;i++)if(!f.isZero(ctx,a[i][k]))perform({kind:'add',target:i,source:k,factor:f.negate(ctx,f.exactDivide(ctx,a[i][k],pivot))});
 }
 for(let k=n-1;k>=0;k--){const power=positiveFractionOrderAtZero(ctx,a[k][k])!;for(let i=0;i<k;i++){const remainder=truncated(ctx,f,a[i][k],power),factor=f.negate(ctx,f.exactDivide(ctx,f.subtract(ctx,a[i][k],remainder),a[k][k]));if(!f.isZero(ctx,factor))perform({kind:'add',target:i,source:k,factor});}}
 const inverse=identity(ctx,f,n);for(let i=operations.length-1;i>=0;i--){const op=operations[i];apply(ctx,f,inverse,op.kind==='swap'?op:op.kind==='scale'?{...op,factor:f.inverse(ctx,op.factor)}:{...op,factor:f.negate(ctx,op.factor)});}
 const proof=Object.freeze({input:freezeExactMatrix(ctx,copy(ctx,f,input)),operations:Object.freeze(operations),basis:freezeExactMatrix(ctx,a),transformation:freezeExactMatrix(ctx,u),inverse:freezeExactMatrix(ctx,inverse)});verifyPositiveLocalModule(ctx,f,input,proof);return proof;
}
export function verifyPositiveLocalModule<E>(ctx:ExecutionContext,f:PositiveFractionField<E>,input:ExactMatrix<PositiveFraction<E>>,proof:PositiveLocalModule<E>):void{const a=copy(ctx,f,input),n=a.length,u=identity(ctx,f,n),inverse=identity(ctx,f,n);demand(equalExactMatrices(ctx,f,input,proof.input),'verification-failed','local module exact input');for(const op of proof.operations){apply(ctx,f,a,op);apply(ctx,f,u,op);}for(let i=proof.operations.length-1;i>=0;i--){const op=proof.operations[i];apply(ctx,f,inverse,op.kind==='swap'?op:op.kind==='scale'?{...op,factor:f.inverse(ctx,op.factor)}:{...op,factor:f.negate(ctx,op.factor)});}
 demand(equalExactMatrices(ctx,f,a,proof.basis)&&equalExactMatrices(ctx,f,u,proof.transformation)&&equalExactMatrices(ctx,f,inverse,proof.inverse),'verification-failed','complete local module bidirectional replay');
 for(let k=0;k<n;k++){const power=positiveFractionOrderAtZero(ctx,a[k][k]);demand(power!==null&&power>=0&&f.equal(ctx,a[k][k],monomial(ctx,f,power)),'verification-failed','canonical local pivot');for(let i=0;i<n;i++)demand(i>k?f.isZero(ctx,a[i][k]):i===k||f.ring.degree(ctx,a[i][k].denominator)===0&&f.ring.degree(ctx,a[i][k].numerator)<power,'verification-failed','complete local pivot residue');}
 // Each inverse elementary operation is defined over the same DVR. Hence
 // localization of the input and canonical output have exactly the same span.
}
