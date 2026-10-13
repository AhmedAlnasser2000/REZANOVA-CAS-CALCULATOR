import {describe,it,expect} from 'vitest';
import {bounds,fresh} from './__tests__/algebraic-support';
import {ellipticDivisor} from './__tests__/algebraic-divisor-support';
import {decideAlgebraicDivisorTorsion,verifyAlgebraicDivisorTorsion} from './algebraic-divisor-torsion';
import {expandFiniteClassWitness} from './reduced-class';
import {principalReducedDivisor,scaleReducedDivisor,equalReducedDivisors} from './reduced-divisor';
import {ExecutionContext} from './execution';
describe('complete two-reduction least-order torsion',()=>{
  it.each([2n,3n])('certifies least elliptic order %s',order=>{const b=ellipticDivisor(order),ctx=fresh(),decision=decideAlgebraicDivisorTorsion(ctx,b.curve,b.divisor,bounds);expect(decision.kind).toBe('torsion');expect('order'in decision&&decision.order).toBe(order);verifyAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,decision,bounds);
    if(decision.reason==='two-reduction')for(const p of decision.reductions){const c=fresh(),target=scaleReducedDivisor(c,p.reduction.curve,p.specialization.divisor,p.order.order),value=expandFiniteClassWitness(c,p.reduction.curve,target,p.order.principal),full=principalReducedDivisor(c,p.reduction.curve,value);expect(equalReducedDivisors(c,p.reduction.curve,full.divisor,target)).toBe(true);
      const limited=new ExecutionContext({...fresh().limits,work:1});expect(()=>expandFiniteClassWitness(limited,p.reduction.curve,target,p.order.principal)).toThrow(/resource-limit/);expect(()=>limited.tick()).toThrow(/resource-limit/);
    }
    verifyAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,decision,bounds);
  });
  it('proves (3,5)-O is not torsion on y²=x³-2',()=>{const b=ellipticDivisor(null),decision=decideAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,bounds);expect(decision.kind).toBe('non-torsion');expect(decision.reason).toBe('two-reduction');verifyAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,decision,bounds);});
});
