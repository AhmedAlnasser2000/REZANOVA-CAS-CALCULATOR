import {it,expect,vi} from 'vitest';
import {ellipticDivisor} from './__tests__/algebraic-divisor-support';
import {fresh,bounds} from './__tests__/algebraic-support';
import {decideAlgebraicDivisorTorsion,verifyAlgebraicDivisorTorsion} from './algebraic-divisor-torsion';
import {encodeAlgebraicDivisorTorsion,decodeAlgebraicDivisorTorsion} from './algebraic-divisor-torsion-wire';
import * as linear from './arithmetic-linear';
import * as modules from './arithmetic-polynomial-module';
import * as factors from './positive-factorization';
import * as hess from './positive-hess';
import * as order from './reduced-divisor-order';
import * as rr from './reduced-riemann-roch';
import * as good from './algebraic-good-reduction';
import * as primes from './factorization-modular';
it('independently replays a complete torsion certificate',()=>{const b=ellipticDivisor(2n),proof=decideAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,bounds),data=encodeAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,proof,bounds);
  const spies=[vi.spyOn(primes,'isFactorPrime'),vi.spyOn(linear,'solveArithmeticLinearSystem'),vi.spyOn(modules,'arithmeticModuleHermite'),vi.spyOn(factors,'factorPositivePolynomial'),vi.spyOn(hess,'solvePositiveHessSpace'),vi.spyOn(order,'decideReducedDivisorOrder'),vi.spyOn(rr,'decideReducedPrincipality'),vi.spyOn(rr,'solveReducedRiemannRoch'),vi.spyOn(good,'findAlgebraicGoodReductionWithin')];for(const s of spies)s.mockImplementation(()=>{throw Error('producer disabled');});
  try{const decoded=decodeAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,structuredClone(data),bounds);expect(decoded.kind).toBe('torsion');expect('order'in decoded&&decoded.order).toBe(2n);}finally{for(const s of spies)s.mockRestore();}
},250000);
it('replays the complete infinite-order certificate without mathematical producers',()=>{
 const b=ellipticDivisor(null),proof=decideAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,bounds);expect(proof.kind).toBe('non-torsion');expect(proof.reason==='two-reduction'&&proof.multiple).toBe(14n);
 verifyAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,proof,bounds);const data=encodeAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,proof,bounds);
 const spies=[vi.spyOn(primes,'isFactorPrime'),vi.spyOn(linear,'solveArithmeticLinearSystem'),vi.spyOn(modules,'arithmeticModuleHermite'),vi.spyOn(factors,'factorPositivePolynomial'),vi.spyOn(hess,'solvePositiveHessSpace'),vi.spyOn(order,'decideReducedDivisorOrder'),vi.spyOn(rr,'decideReducedPrincipality'),vi.spyOn(rr,'solveReducedRiemannRoch'),vi.spyOn(good,'findAlgebraicGoodReductionWithin')];for(const s of spies)s.mockImplementation(()=>{throw Error('producer disabled');});
 try{const replay=decodeAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,structuredClone(data),bounds);expect(replay.kind).toBe('non-torsion');expect(replay.reason==='two-reduction'&&replay.principal.kind).toBe('not-principal');}finally{for(const s of spies)s.mockRestore();}
},600000);
