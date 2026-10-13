import {demand,type ExecutionContext} from './execution';
import {FactorPrimeField,isFactorPrime} from './factorization-modular';

/** Explicit auxiliary prime coverage for native modular GCD arithmetic. Replay
 * visits this finite certified list; it never enumerates or searches new primes. */
export interface RationalGcdEvidence{readonly primes:readonly bigint[]}
interface Scope{readonly mode:'record'|'replay';readonly primes:bigint[];readonly fields:Map<bigint,FactorPrimeField>}
const scopes=new WeakMap<ExecutionContext,Scope>();
export function hasRationalGcdEvidenceScope(ctx:ExecutionContext){return scopes.has(ctx);}
export function currentRationalGcdEvidence(ctx:ExecutionContext):RationalGcdEvidence|undefined{const scope=scopes.get(ctx);if(!scope)return undefined;ctx.allocate(scope.primes.length+1);return Object.freeze({primes:Object.freeze([...scope.primes])});}
function field(ctx:ExecutionContext,state:Scope,prime:bigint){const previous=state.fields.get(prime);if(previous){ctx.tick();ctx.allocate(1);return previous;}const value=new FactorPrimeField(ctx,prime);ctx.allocate(3);state.fields.set(prime,value);return value;}
export function* rationalGcdPrimeFields(ctx:ExecutionContext):Generator<FactorPrimeField>{
  const state=scopes.get(ctx);let index=0,prime=1n;
  if(state){while(index<state.primes.length)yield field(ctx,state,state.primes[index++]);prime=state.primes[state.primes.length-1]??1n;
    demand(state.mode==='record','verification-failed','missing modular GCD prime coverage');}
  for(;;){prime=ctx.add(prime,1n);if(!isFactorPrime(ctx,prime))continue;if(state){ctx.allocate(1);state.primes.push(prime);yield field(ctx,state,prime);}else yield new FactorPrimeField(ctx,prime);}
}
function scope<T>(ctx:ExecutionContext,mode:'record'|'replay',seed:RationalGcdEvidence,run:()=>T):Readonly<{value:T;evidence:RationalGcdEvidence}>{
  demand(ctx.operationToken!==undefined&&!scopes.has(ctx),'invalid-input','fresh arithmetic GCD evidence scope');const state:Scope={mode,primes:[],fields:new Map()};ctx.allocate(seed.primes.length+3);let previous=1n;
  for(const p of seed.primes){ctx.integer(p);demand(p>previous,'invalid-input','canonical increasing GCD prime coverage');field(ctx,state,p);state.primes.push(p);previous=p;}
  scopes.set(ctx,state);try{const value=run();ctx.allocate(state.primes.length+1);return Object.freeze({value,evidence:Object.freeze({primes:Object.freeze([...state.primes])})});}finally{scopes.delete(ctx);}
}
export function recordRationalGcdEvidence<T>(ctx:ExecutionContext,run:()=>T,seed:RationalGcdEvidence=Object.freeze({primes:Object.freeze([])})){return scope(ctx,'record',seed,run);}
export function replayRationalGcdEvidence<T>(ctx:ExecutionContext,evidence:RationalGcdEvidence,run:()=>T):T{return scope(ctx,'replay',evidence,run).value;}
