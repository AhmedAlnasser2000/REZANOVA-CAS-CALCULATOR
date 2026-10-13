import {it,expect,vi} from 'vitest';
import {fresh,bounds} from './__tests__/algebraic-support';
import {orderTwentyNineDivisor} from './__tests__/algebraic-divisor-support';
import {decideAlgebraicDivisorTorsion,verifyAlgebraicDivisorTorsion} from './algebraic-divisor-torsion';
import {encodeAlgebraicDivisorTorsion,decodeAlgebraicDivisorTorsion} from './algebraic-divisor-torsion-wire';
import * as nativeRr from './algebraic-riemann-roch';
import * as reducedOrder from './reduced-divisor-order';
import * as hess from './positive-hess';
import * as factor from './positive-factorization';
import * as modules from './arithmetic-polynomial-module';
import * as linear from './arithmetic-linear';
import * as primes from './factorization-modular';
function observed<T>(stage:string,run:(ctx:ReturnType<typeof fresh>)=>T):T{const c=fresh(),start=performance.now(),value=run(c);process.stdout.write(JSON.stringify({fixture:'order29',stage,milliseconds:performance.now()-start,usage:c.usage})+'\n');return value;}
it('certifies the sourced order-29 infinity class, retaining distinct residue maps',()=>{
  const b=orderTwentyNineDivisor(),decision=observed('torsion',ctx=>decideAlgebraicDivisorTorsion(ctx,b.curve,b.divisor,bounds));expect(decision.kind).toBe('torsion');expect('order'in decision&&decision.order).toBe(29n);
  if(decision.reason==='two-reduction'&&decision.principal.kind==='principal'){
    // Independently check the polynomial Pell identity: conjugate the owned
    // quadratic representative and require its norm to be a nonzero constant.
    const c=fresh(),g=decision.principal.witness,r=b.owner.ring,p=g.representative;
    for(const coefficient of p.coefficients)expect(b.field.ring.degree(c,coefficient.denominator)).toBe(0);
    const conjugate=b.owner.make(c,r.make(c,[p.coefficients[0],r.domain.negate(c,p.coefficients[1]??r.domain.fromInteger(c,0n))]));
    const norm=b.owner.multiply(c,g,conjugate).representative;
    expect(r.degree(c,norm)).toBe(0);expect(r.domain.isZero(c,norm.coefficients[0])).toBe(false);
    const n=norm.coefficients[0];expect(b.field.ring.degree(c,n.numerator)).toBe(0);expect(b.field.ring.degree(c,n.denominator)).toBe(0);
  }
  observed('verification',ctx=>verifyAlgebraicDivisorTorsion(ctx,b.curve,b.divisor,decision,bounds));const data=observed('encoding',ctx=>encodeAlgebraicDivisorTorsion(ctx,b.curve,b.divisor,decision,bounds));
  const bytes=Buffer.byteLength(JSON.stringify(data));expect(bytes).toBeLessThanOrEqual(bounds.artifactBytes);process.stdout.write(JSON.stringify({fixture:'order29',bytes})+'\n');
  const spies=[vi.spyOn(nativeRr,'solveAlgebraicRiemannRochWithin'),vi.spyOn(reducedOrder,'decideReducedDivisorOrder'),vi.spyOn(hess,'solvePositiveHessSpace'),vi.spyOn(factor,'factorPositivePolynomial'),vi.spyOn(modules,'arithmeticModuleHermite'),vi.spyOn(linear,'solveArithmeticLinearSystem'),vi.spyOn(primes,'isFactorPrime')];for(const s of spies)s.mockImplementation(()=>{throw Error('producer disabled');});
  try{const replay=observed('decoding',ctx=>decodeAlgebraicDivisorTorsion(ctx,b.curve,b.divisor,structuredClone(data),bounds));expect('order'in replay&&replay.order).toBe(29n);}finally{for(const s of spies)s.mockRestore();}
},1200000);
