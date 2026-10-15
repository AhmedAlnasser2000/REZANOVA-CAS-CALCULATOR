import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import type {PerformanceEvent} from './performance-watchdog';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!specifier.endsWith('.ts'))return next(`${specifier}.ts`,context);throw error;}}});
const [fixture,core]=process.argv.slice(2);
if(!fixture||!core||!process.send)throw Error('parent-owned fixture/core/IPC required');
const get=<T>(file:string)=>import(pathToFileURL(resolve(core,`${file}.ts`)).href) as Promise<T>;
const {ExecutionContext}=await get<typeof import('../execution')>('execution');
const {FormalPrimitiveDomain}=await get<typeof import('../formal-primitive')>('formal-primitive');
const {rational}=await get<typeof import('../rational')>('rational');
const {integrateRational,verifyRationalDecision}=await get<typeof import('../rational-decision')>('rational-decision');
const {encodeRationalDecision,decodeRationalDecision}=await get<typeof import('../rational-decision-wire')>('rational-decision-wire');
const {produceCompactRationalCandidate,checkCompactRationalCandidate,verifyCompactRationalElementary}=await get<typeof import('../rational-elementary-evidence')>('rational-elementary-evidence');
const {encodeCompactRationalElementary,decodeCompactRationalElementary}=await get<typeof import('../rational-elementary-wire')>('rational-elementary-wire');
const limits={work:20_000_000_000,allocation:1_000_000_000_000,integerBits:2048,degree:256};
const fresh=()=>new ExecutionContext(limits);
const send=(event:PerformanceEvent)=>process.send!(event);
function measure<T>(stage:string,sample:number,ctx:InstanceType<typeof ExecutionContext>,run:()=>T):T{
  send({event:'started',fixture,stage,sample,work:ctx.usage.work,allocation:ctx.usage.allocation});
  const before=ctx.usage,start=performance.now(),value=run(),ms=performance.now()-start,{heapUsed,rss}=process.memoryUsage();
  send({event:'sample',fixture,stage,sample,milliseconds:ms,work:ctx.usage.work-before.work,allocation:ctx.usage.allocation-before.allocation,
    heapUsed,rss,highWaterRss:process.resourceUsage().maxRSS*1024});return value;
}
try{
  if(fixture.startsWith('rational-corpus-')) {
    const {rationalPerformanceFixtures}=await get<typeof import('./performance-rational-fixtures')>('__tests__/performance-rational-fixtures'),entry=rationalPerformanceFixtures().find(f=>fixture===`rational-corpus-${f.name}`);if(!entry)throw Error('unknown original rational corpus request');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    const prepare=(ctx:InstanceType<typeof ExecutionContext>)=>{
      const owner=new FormalPrimitiveDomain('x','z'),input=owner.fractions.make(ctx,owner.x.make(ctx,entry.n.map(n=>rational(ctx,n))),owner.x.make(ctx,entry.d.map(n=>rational(ctx,n))));return {owner,input};
    };
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample});const setup=fresh(),p=measure('setup',sample,setup,()=>prepare(setup));
      const solve=fresh(),candidate=measure('solving',sample,solve,()=>produceCompactRationalCandidate(solve,p.owner,p.input));
      const check=fresh(),proof=measure('checking',sample,check,()=>checkCompactRationalCandidate(check,p.owner,p.input,candidate));
      const verify=fresh();measure('verification',sample,verify,()=>verifyCompactRationalElementary(verify,p.owner,p.input,proof));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeCompactRationalElementary(encode,p.owner,p.input,proof,bounds)),text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const replaySetup=fresh(),target=measure('replay-setup',sample,replaySetup,()=>prepare(replaySetup)),decode=fresh();measure('decoding',sample,decode,()=>decodeCompactRationalElementary(decode,target.owner,target.input,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture.startsWith('nested-control-')) {
    const {exponentialSetup}=await get<typeof import('./exponential-rational-fixtures')>('__tests__/exponential-rational-fixtures'),{nestedStress}=await get<typeof import('./nested-fixtures')>('__tests__/nested-fixtures');
    const decision=await get<typeof import('../exponential-rational-decision')>('exponential-rational-decision'),wire=await get<typeof import('../exponential-rational-wire')>('exponential-rational-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024}),name=fixture.slice('nested-control-'.length);
    const cases=['stress-shifted','stress-quadratic','stress-inverse','affine','repeated','algebraicResidues','nonconstantResidue','laurentObstruction','rebasedLaurent','rationalRootLogs'];if(!cases.includes(name))throw Error('unknown existing nested-arithmetic fixture');
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample});const setup=fresh(),s=measure('construction',sample,setup,()=>exponentialSetup(name==='stress-shifted'?[1,1]:name==='stress-quadratic'?[0,0,1]:name==='stress-inverse'?[1]:[0,1],name==='stress-inverse'?[0,1]:undefined,setup));
      const make=(c:InstanceType<typeof ExecutionContext>,ns:number[],ds?:number[])=>s.F.make(c,ns.map(n=>s.f.fromInteger(c,BigInt(n))),ds?.map(n=>s.f.fromInteger(c,BigInt(n))));
      const rpOf=(c:InstanceType<typeof ExecutionContext>)=>s.f.make(c,(name==='stress-shifted'?[1n]:name==='stress-quadratic'?[0n,2n]:[-1n]).map(n=>s.q.fromInteger(c,n)),name==='stress-inverse'?[0n,0n,1n].map(n=>s.q.fromInteger(c,n)):undefined);
      const build=fresh(),input=measure('input',sample,build,()=>{
        if(name.startsWith('stress-')) {
          return nestedStress(build,s,rpOf(build),false);
        }
        if(name==='affine')return make(build,[1],[1,1]);if(name==='repeated')return make(build,[1],[1,2,1]);if(name==='algebraicResidues')return make(build,[0,1],[1,0,1]);
        if(name==='nonconstantResidue')return s.F.make(build,[s.f.fromInteger(build,1n)],[s.x,s.f.fromInteger(build,1n)]);
        if(name==='laurentObstruction')return s.F.add(build,make(build,[1],[1,1]),s.F.multiply(build,s.F.embed(build,s.f.make(build,[s.f.parent!.fromInteger(build,1n)],[0n,1n].map(n=>s.f.parent!.fromInteger(build,n)))),s.t));
        if(name==='rebasedLaurent')return make(build,[1,0,0,0,1],[0,0,1]);return s.F.embed(build,s.f.make(build,[s.f.parent!.fromInteger(build,1n)],[1n,0n,1n].map(n=>s.f.parent!.fromInteger(build,n))));
      });
      if(name.startsWith('stress-')) {const ordinary=fresh();measure('ordinary-input',sample,ordinary,()=>{
        const value=nestedStress(ordinary,s,rpOf(ordinary),true);if(!s.F.equal(ordinary,value,input))throw Error('nested construction mismatch');
      });}
      const solve=fresh(),proof=measure('solving',sample,solve,()=>decision.integrateExponentialRational(solve,s.F,input,bounds));const verify=fresh();measure('verification',sample,verify,()=>decision.verifyExponentialRationalDecision(verify,s.F,input,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>wire.encodeExponentialRationalDecision(encode,s.F,input,proof,bounds)),text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>wire.decodeExponentialRationalDecision(decode,s.F,input,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture.startsWith('genus-one-integration-')||fixture.startsWith('algebraic-performance-')) {
    const {generalGenusOneFixture}=await get<typeof import('./general-genus-one-fixtures')>('__tests__/general-genus-one-fixtures');
    const decision=await get<typeof import('../algebraic-lazy-decision')>('algebraic-lazy-decision'),positive=await get<typeof import('../algebraic-native-wire')>('algebraic-native-wire'),negative=await get<typeof import('../algebraic-lazy-wire')>('algebraic-lazy-wire'),geometric=await get<typeof import('../algebraic-geometric-wire')>('algebraic-geometric-wire');
    const {quadratic}=await get<typeof import('./algebraic-support')>('__tests__/algebraic-support'),{certifyAlgebraicConstantField}=await get<typeof import('../algebraic-constant-field')>('algebraic-constant-field'),{certifyAlgebraicCurve}=await get<typeof import('../algebraic-curve')>('algebraic-curve');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024}),isNegative=!['genus-one-integration-positive','algebraic-performance-ramified-repeated'].includes(fixture),repeated=fixture==='genus-one-integration-repeated';
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample});const setup=fresh(),p=measure('construction',sample,setup,()=>{
        if(fixture.startsWith('algebraic-performance-')) {
          const s=quadratic(fixture==='algebraic-performance-higher-genus'?[1n,-1n,0n,0n,0n,1n]:[1n,-1n,0n,1n],setup),f=s.owner,x=f.embed(setup,s.x),curve=certifyAlgebraicCurve(setup,f,certifyAlgebraicConstantField(setup,f,bounds),bounds),one=f.fromInteger(setup,1n);
          const input=fixture==='algebraic-performance-ramified-repeated'?f.negate(setup,f.exactDivide(setup,f.subtract(setup,f.multiply(setup,f.fromInteger(setup,3n),f.multiply(setup,x,x)),one),f.multiply(setup,f.fromInteger(setup,2n),f.multiply(setup,f.multiply(setup,s.a,s.a),s.a)))):fixture==='algebraic-performance-infinity'?f.exactDivide(setup,x,s.a):f.inverse(setup,s.a);
          return {...s,curve,input};
        }
        const s=generalGenusOneFixture(setup,isNegative);if(!repeated)return s;
        const f=s.owner,d=f.subtract(setup,f.embed(setup,s.x),f.fromInteger(setup,1n));return {...s,input:f.subtract(setup,s.input,f.inverse(setup,f.multiply(setup,d,d)))};
      });
      const solve=fresh(),candidate=measure('solving',sample,solve,()=>decision.produceLazyAlgebraicCandidate(solve,p.curve,p.input,bounds));if(candidate.kind!==(isNegative?'non-elementary':'elementary'))throw Error('known general genus-one integration');
      const check=fresh(),proof=measure('checking',sample,check,()=>decision.checkLazyAlgebraicCandidate(check,p.curve,p.input,candidate,bounds));
      const verify=fresh();measure('verification',sample,verify,()=>decision.verifyLazyAlgebraicDecision(verify,p.curve,p.input,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>proof.kind==='elementary'?positive.encodeNativeAlgebraicElementary(encode,p.curve,p.input,proof,bounds):'method' in proof?negative.encodeLazyAlgebraicNegative(encode,p.curve,p.input,proof,bounds):geometric.encodeGeometricAlgebraicNegative(encode,p.curve,p.input,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>proof.kind==='elementary'?positive.decodeNativeAlgebraicElementary(decode,p.curve,p.input,parsed,bounds):'method' in proof?negative.decodeLazyAlgebraicNegative(decode,p.curve,p.input,parsed,bounds):geometric.decodeGeometricAlgebraicNegative(decode,p.curve,p.input,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='genus-one-general-order-two' ||fixture==='genus-one-general-negative') {
    const {ellipticDivisor}=await get<typeof import('./algebraic-divisor-support')>('__tests__/algebraic-divisor-support'),{hyperellipticInfinityDivisor}=await get<typeof import('./hyperelliptic-support')>('__tests__/hyperelliptic-support');
    const {constructGenusOnePresentationWithin}=await get<typeof import('../genus-one-presentation')>('genus-one-presentation'),{constructGenusOneCoordinatesWithin}=await get<typeof import('../genus-one-coordinates')>('genus-one-coordinates');
    const decision=await get<typeof import('../genus-one-torsion')>('genus-one-torsion'),wire=await get<typeof import('../genus-one-torsion-wire')>('genus-one-torsion-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024}),negative=fixture==='genus-one-general-negative';
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample});const setup=fresh(),p=measure('construction',sample,setup,()=>setup.operation(()=>{
        const s=negative?ellipticDivisor(null,setup):hyperellipticInfinityDivisor(undefined,1n,setup),origin=s.divisor.entries[negative?1:0].place,
          presentation=constructGenusOnePresentationWithin(setup,s.curve,origin,bounds),model=constructGenusOneCoordinatesWithin(setup,presentation,bounds);return {model,divisor:s.divisor};
      }));
      const solve=fresh(),proof=measure('solving',sample,solve,()=>decision.decideGenusOneRationalTorsion(solve,p.model,p.divisor,bounds));
      if(proof.kind!==(negative?'non-torsion':'torsion')||!negative&&proof.order!==2n)throw Error('known general genus-one class');
      const verify=fresh();measure('verification',sample,verify,()=>decision.verifyGenusOneRationalTorsion(verify,p.model,p.divisor,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>wire.encodeGenusOneRationalTorsion(encode,p.model,p.divisor,proof,bounds)),text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>wire.decodeGenusOneRationalTorsion(decode,p.model.presentation,p.divisor,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='modular-polynomial-resultant'||fixture==='modular-polynomial-norm') {
    const fixtures=await get<typeof import('./polynomial-resultant-fixtures')>('__tests__/polynomial-resultant-fixtures');
    const resultant=await get<typeof import('../number-field-polynomial-resultant')>('number-field-polynomial-resultant'),rw=await get<typeof import('../number-field-polynomial-resultant-wire')>('number-field-polynomial-resultant-wire');
    const norm=await get<typeof import('../number-field-polynomial-norm')>('number-field-polynomial-norm'),nw=await get<typeof import('../number-field-polynomial-norm-wire')>('number-field-polynomial-norm-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample});const setup=fresh();
      const run=fixture==='modular-polynomial-resultant'?measure('construction',sample,setup,()=>{
        const p=fixtures.rationalPolynomialResultantFixture(setup);return ()=>{
          const solve=fresh(),proof=measure('solving',sample,solve,()=>resultant.produceNumberFieldPolynomialResultant(solve,p.ring,p.a,p.b,bounds));
          const verify=fresh();measure('verification',sample,verify,()=>resultant.verifyNumberFieldPolynomialResultant(verify,p.ring,p.a,p.b,proof,bounds));
          const encode=fresh(),data=measure('encoding',sample,encode,()=>rw.encodeNumberFieldPolynomialResultant(encode,p.ring,p.a,p.b,proof,bounds)),text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
          const decode=fresh();measure('decoding',sample,decode,()=>rw.decodeNumberFieldPolynomialResultant(decode,p.ring,p.a,p.b,parsed,bounds));
        };
      }):measure('construction',sample,setup,()=>{
        const p=fixtures.nestedPolynomialNormFixture(setup);return ()=>{
          const solve=fresh(),proof=measure('solving',sample,solve,()=>norm.produceNumberFieldPolynomialNorm(solve,p.owner,p.input,bounds));
          const verify=fresh();measure('verification',sample,verify,()=>norm.verifyNumberFieldPolynomialNorm(verify,p.owner,p.input,proof,bounds));
          const encode=fresh(),data=measure('encoding',sample,encode,()=>nw.encodeNumberFieldPolynomialNorm(encode,p.owner,p.input,proof,bounds)),text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
          const decode=fresh();measure('decoding',sample,decode,()=>nw.decodeNumberFieldPolynomialNorm(decode,p.owner,p.input,parsed,bounds));
        };
      });
      run();send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture.startsWith('compact-negative-')) {
    const {compactNegativeFixture}=await get<typeof import('./transcendental-negative-fixtures')>('__tests__/transcendental-negative-fixtures');
    const decision=await get<typeof import('../transcendental-negative-evidence')>('transcendental-negative-evidence'),wire=await get<typeof import('../transcendental-negative-wire')>('transcendental-negative-wire');
    const kinds=['residue','polynomial-prefix','laurent-prefix','parent','residue-polynomial'] as const,kind=kinds.find(k=>fixture===`compact-negative-${k}`);if(!kind)throw Error('unknown compact obstruction workload');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample});const setup=fresh(),p=measure('construction',sample,setup,()=>compactNegativeFixture(setup,kind));
      const solve=fresh(),candidate=measure('solving',sample,solve,()=>decision.produceCompactTranscendentalDecisionCandidate(solve,p.view,p.input,bounds));if(candidate.kind!=='non-elementary')throw Error('known compact obstruction');
      const check=fresh(),proof=measure('checking',sample,check,()=>decision.checkCompactTranscendentalDecisionCandidate(check,p.view,p.input,candidate,bounds));if(proof.kind!=='non-elementary')throw Error('known checked compact obstruction');
      const verify=fresh();measure('verification',sample,verify,()=>decision.verifyCompactTranscendentalNegative(verify,p.view,p.input,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>wire.encodeCompactTranscendentalNegative(encode,p.view,p.input,proof,bounds)),text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>wire.decodeCompactTranscendentalNegative(decode,p.view,p.input,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture.startsWith('compact-family-')) {
    const {compactFamilyFixture}=await get<typeof import('./compact-family-fixtures')>('__tests__/compact-family-fixtures');
    const rde=await get<typeof import('../compact-recursive-rde')>('compact-recursive-rde'),limited=await get<typeof import('../compact-recursive-limited')>('compact-recursive-limited');
    const rw=await get<typeof import('../compact-recursive-rde-wire')>('compact-recursive-rde-wire'),lw=await get<typeof import('../compact-recursive-limited-wire')>('compact-recursive-limited-wire');
    const kinds=['rde-resonance','rde-negative','limited-mixed','limited-negative'] as const,kind=kinds.find(k=>fixture===`compact-family-${k}`);if(!kind)throw Error('unknown compact family fixture');
    const isRde=kind.startsWith('rde-'),bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample});const setup=fresh(),p=measure('construction',sample,setup,()=>compactFamilyFixture(setup,kind)),solve=fresh();
      const proof=measure('solving',sample,solve,()=>isRde?rde.solveCompactRecursiveParametricRde(solve,p.view,p.a,p.b,p.forcing,bounds):limited.solveCompactRecursiveLimitedIntegration(solve,p.view,p.b,p.forcing,bounds));
      if(proof.kind!==(p.negative?'no-field-solution':'solutions'))throw Error('known complete compact family');
      const verify=fresh();measure('verification',sample,verify,()=>proof.rule==='recursive-parametric-rde-rank-family-v2'?rde.verifyCompactRecursiveParametricRde(verify,p.view,p.a,p.b,p.forcing,proof,bounds):limited.verifyCompactRecursiveLimitedIntegration(verify,p.view,p.b,p.forcing,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>proof.rule==='recursive-parametric-rde-rank-family-v2'?rw.encodeCompactRecursiveParametricRde(encode,p.view,p.a,p.b,p.forcing,proof,bounds):lw.encodeCompactRecursiveLimitedIntegration(encode,p.view,p.b,p.forcing,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>isRde?rw.decodeCompactRecursiveParametricRde(decode,p.view,p.a,p.b,p.forcing,parsed,bounds):lw.decodeCompactRecursiveLimitedIntegration(decode,p.view,p.b,p.forcing,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture.startsWith('compact-transcendental-')) {
    const {compactTowerFixture}=await get<typeof import('./transcendental-compact-fixtures')>('__tests__/transcendental-compact-fixtures');
    const {produceCompactTranscendentalCandidate,checkCompactTranscendentalCandidate,verifyCompactTranscendentalElementary}=await get<typeof import('../transcendental-elementary-evidence')>('transcendental-elementary-evidence');
    const {encodeCompactTranscendentalElementary,decodeCompactTranscendentalElementary}=await get<typeof import('../transcendental-elementary-wire')>('transcendental-elementary-wire');
    const kinds=['rational','mixed-log','mixed-exp','nested-log','recursive-root','height-eight'] as const, kind=kinds.find(k=>fixture===`compact-transcendental-${k}`);
    if(!kind)throw Error('unknown compact recursive fixture'); const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample}); const setup=fresh(),prepared=measure('construction',sample,setup,()=>compactTowerFixture(setup,kind));
      const solve=fresh(),candidate=measure('solving',sample,solve,()=>produceCompactTranscendentalCandidate(solve,prepared.view,prepared.input,bounds));
      if(candidate.kind!=='elementary'||'derivative' in candidate)throw Error('known compact recursive candidate');
      const check=fresh(),proof=measure('checking',sample,check,()=>checkCompactTranscendentalCandidate(check,prepared.view,prepared.input,candidate,bounds));
      if(proof.kind!=='elementary')throw Error('known compact recursive positive');
      const verify=fresh();measure('verification',sample,verify,()=>verifyCompactTranscendentalElementary(verify,prepared.view,prepared.input,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeCompactTranscendentalElementary(encode,prepared.view,prepared.input,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodeCompactTranscendentalElementary(decode,prepared.view,prepared.input,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='balanced-logarithm-integration'||fixture==='balanced-negative-integration') {
    const {balancedIntegrationFixture}=await get<typeof import('./balanced-fixtures')>('__tests__/balanced-fixtures');
    const {produceLazyAlgebraicCandidate,checkLazyAlgebraicCandidate,verifyLazyAlgebraicDecision}=await get<typeof import('../algebraic-lazy-decision')>('algebraic-lazy-decision');
    const {encodeNativeAlgebraicElementary,decodeNativeAlgebraicElementary}=await get<typeof import('../algebraic-native-wire')>('algebraic-native-wire');
    const {encodeLazyAlgebraicNegative,decodeLazyAlgebraicNegative}=await get<typeof import('../algebraic-lazy-wire')>('algebraic-lazy-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024}),negative=fixture==='balanced-negative-integration';
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample});const setup=fresh(),prepared=measure('construction',sample,setup,()=>balancedIntegrationFixture(setup,negative));
      const solve=fresh(),candidate=measure('solving',sample,solve,()=>produceLazyAlgebraicCandidate(solve,prepared.curve,prepared.input,bounds));
      if(negative?candidate.kind!=='non-elementary'||candidate.reason!=='non-torsion-residue-divisor':candidate.kind!=='elementary'||'derivative' in candidate)throw Error('known balanced candidate mismatch');
      const check=fresh(),proof=measure('checking',sample,check,()=>checkLazyAlgebraicCandidate(check,prepared.curve,prepared.input,candidate,bounds));
      const verify=fresh();measure('verification',sample,verify,()=>verifyLazyAlgebraicDecision(verify,prepared.curve,prepared.input,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>{
        if(proof.kind==='elementary')return encodeNativeAlgebraicElementary(encode,prepared.curve,prepared.input,proof,bounds);
        if(!('method' in proof))throw Error('known already-simple balanced negative'); return encodeLazyAlgebraicNegative(encode,prepared.curve,prepared.input,proof,bounds);
      });
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>negative?decodeLazyAlgebraicNegative(decode,prepared.curve,prepared.input,parsed,bounds):decodeNativeAlgebraicElementary(decode,prepared.curve,prepared.input,parsed,bounds));
      send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='balanced-torsion-order-two'||fixture==='balanced-torsion-negative') {
    const {hyperellipticInfinityDivisor}=await get<typeof import('./hyperelliptic-support')>('__tests__/hyperelliptic-support');
    const {tryDecideBalancedDivisorTorsion,verifyBalancedDivisorTorsion}=await get<typeof import('../balanced-divisor-torsion')>('balanced-divisor-torsion');
    const {encodeBalancedDivisorTorsion,decodeBalancedDivisorTorsion}=await get<typeof import('../balanced-torsion-wire')>('balanced-torsion-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024}),negative=fixture==='balanced-torsion-negative';
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample});const setup=fresh(),prepared=measure('construction',sample,setup,()=>hyperellipticInfinityDivisor(negative?[-27n,-40n,-18n,0n,1n]:undefined,1n,setup));
      const solve=fresh(),proof=measure('solving',sample,solve,()=>tryDecideBalancedDivisorTorsion(solve,prepared.curve,prepared.divisor,bounds));
      if(!proof||proof.kind!==(negative?'non-torsion':'torsion')||proof.order!==(negative?null:2n))throw Error('known balanced torsion mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyBalancedDivisorTorsion(verify,prepared.curve,prepared.divisor,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeBalancedDivisorTorsion(encode,prepared.curve,prepared.divisor,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodeBalancedDivisorTorsion(decode,prepared.curve,prepared.divisor,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='balanced-native-principal'||fixture==='balanced-native-not-principal') {
    const {hyperellipticInfinityDivisor}=await get<typeof import('./hyperelliptic-support')>('__tests__/hyperelliptic-support');
    const {trySplitHyperellipticModel}=await get<typeof import('../hyperelliptic-curve-model')>('hyperelliptic-curve-model');
    const {constructBalancedCurveModelWithin}=await get<typeof import('../hyperelliptic-balanced-place')>('hyperelliptic-balanced-place');
    const {decideBalancedPrincipality,verifyBalancedPrincipality}=await get<typeof import('../hyperelliptic-balanced-divisor')>('hyperelliptic-balanced-divisor');
    const {encodeBalancedPrincipality,decodeBalancedPrincipality}=await get<typeof import('../hyperelliptic-balanced-principality-wire')>('hyperelliptic-balanced-principality-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample}); const setup=fresh(),prepared=measure('construction',sample,setup,()=>{
        const b=hyperellipticInfinityDivisor(undefined,fixture==='balanced-native-principal'?2n:1n,setup),model=trySplitHyperellipticModel(setup,b.curve,bounds);if(!model)throw Error('known split quartic');
        const source=setup.operation(()=>constructBalancedCurveModelWithin(setup,model,bounds));return {...b,source};
      });
      const solve=fresh(),proof=measure('solving',sample,solve,()=>decideBalancedPrincipality(solve,prepared.source,prepared.divisor,bounds));
      if(proof.kind!==(fixture==='balanced-native-principal'?'principal':'not-principal'))throw Error('known native balanced principality mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyBalancedPrincipality(verify,prepared.source,prepared.divisor,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeBalancedPrincipality(encode,prepared.curve,prepared.divisor,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodeBalancedPrincipality(decode,prepared.curve,prepared.divisor,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='balanced-cantor-order29') {
    const {rationalField: Q}=await get<typeof import('../field')>('field');
    const {PolynomialRing}=await get<typeof import('../polynomial')>('polynomial');
    const {constructBalancedDomain,constructBalancedMumford,multiplyBalancedMumford,verifyBalancedMumfordMultiple}=await get<typeof import('../hyperelliptic-balanced')>('hyperelliptic-balanced');
    const {encodeBalancedMumfordMultiple,decodeBalancedMumfordMultiple}=await get<typeof import('../hyperelliptic-balanced-wire')>('hyperelliptic-balanced-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample}); const setup=fresh(),prepared=measure('construction',sample,setup,()=>{
        const r=new PolynomialRing(Q,'X'),h=r.make(setup,[0n,-16n,33n,-12n,6n,4n,1n].map(n=>rational(setup,n))),domain=constructBalancedDomain(setup,r,h,rational(setup,1n),bounds);
        const input=constructBalancedMumford(setup,domain,r.one(setup),r.zero(setup),2n,bounds).result; return {domain,input};
      });
      const solve=fresh(),proof=measure('solving',sample,solve,()=>multiplyBalancedMumford(solve,prepared.domain,prepared.input,29n,bounds));
      if(proof.result.n!==1n||proof.result.pair.u.coefficients.length!==1)throw Error('known balanced order-29 multiple mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyBalancedMumfordMultiple(verify,prepared.domain,prepared.input,29n,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeBalancedMumfordMultiple(encode,prepared.domain,prepared.input,29n,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodeBalancedMumfordMultiple(decode,prepared.domain,prepared.input,29n,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='balanced-cantor-finite-order29') {
    const {PositivePrimeField}=await get<typeof import('../positive-field')>('positive-field');
    const {PositivePolynomialRing}=await get<typeof import('../positive-polynomial')>('positive-polynomial');
    const {constructPositiveBalancedDomain,constructPositiveBalancedDivisor,multiplyPositiveBalancedDivisor,verifyPositiveBalancedMultiple}=await get<typeof import('../positive-balanced-cantor')>('positive-balanced-cantor');
    const {encodePositiveBalancedMultiple,decodePositiveBalancedMultiple}=await get<typeof import('../positive-balanced-wire')>('positive-balanced-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample}); const setup=fresh(),prepared=measure('construction',sample,setup,()=>{
        const field=new PositivePrimeField(setup,7n),r=new PositivePolynomialRing(field,'X'),h=r.make(setup,[0n,-16n,33n,-12n,6n,4n,1n].map(n=>field.fromInteger(setup,n))),
          domain=constructPositiveBalancedDomain(setup,field,r,h,field.fromInteger(setup,1n),bounds),input=constructPositiveBalancedDivisor(setup,domain,r.one(setup),r.zero(setup),2n,bounds);return {domain,input};
      });
      const solve=fresh(),proof=measure('solving',sample,solve,()=>multiplyPositiveBalancedDivisor(solve,prepared.domain,prepared.input,29n,bounds));
      if(proof.result.n!==1n||proof.result.pair.u.coefficients.length!==1)throw Error('known finite balanced order-29 multiple mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyPositiveBalancedMultiple(verify,prepared.domain,prepared.input,29n,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodePositiveBalancedMultiple(encode,prepared.domain,prepared.input,29n,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodePositiveBalancedMultiple(decode,prepared.domain,prepared.input,29n,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='modular-resultant-rational'||fixture==='modular-resultant-nested') {
    const {rationalField: Q}=await get<typeof import('../field')>('field');
    const {PolynomialRing}=await get<typeof import('../polynomial')>('polynomial');
    const {constructAlgebraicExtensionWithin}=await get<typeof import('../algebraic-field')>('algebraic-field');
    const {produceNumberFieldModularResultant,verifyNumberFieldModularResultant}=await get<typeof import('../number-field-modular-resultant')>('number-field-modular-resultant');
    const {encodeNumberFieldModularResultant,decodeNumberFieldModularResultant}=await get<typeof import('../number-field-resultant-wire')>('number-field-resultant-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample}); const setup=fresh(),prepared=measure('construction',sample,setup,()=>setup.operation(()=>{
        if(fixture==='modular-resultant-rational') {
          const r=new PolynomialRing(Q,'z'),a=r.make(setup,[17n,-11n,5n,0n,2n].map(n=>rational(setup,n,35n))),b=r.make(setup,[3n,7n].map(n=>Q.fromInteger(setup,n)));setup.allocate(1); return ()=>observe({r,a,b});
        }
        const ar=new PolynomialRing(Q,'alpha'),alpha=constructAlgebraicExtensionWithin(setup,ar,ar.make(setup,[-2n,0n,1n].map(n=>Q.fromInteger(setup,n))),bounds),
          br=new PolynomialRing(alpha,'beta'),f=constructAlgebraicExtensionWithin(setup,br,br.make(setup,[-3n,0n,1n].map(n=>alpha.fromInteger(setup,n))),bounds),r=new PolynomialRing<ReturnType<typeof f.generator>>(f,'z');
        const x=f.embed(setup,alpha.generator(setup)),y=f.generator(setup),a=r.make(setup,[f.add(setup,y,f.fromInteger(setup,1n)),f.exactDivide(setup,x,f.fromInteger(setup,35n)),f.fromInteger(setup,1n),f.fromInteger(setup,0n),y]),b=r.make(setup,[f.subtract(setup,x,f.fromInteger(setup,1n)),f.exactDivide(setup,y,f.fromInteger(setup,7n))]);
        setup.allocate(1); return ()=>observe({r,a,b});
      }));
      // Keep the two exact coefficient types independently owned in this fixture.
      function observe<E>(input:{r:import('../polynomial').PolynomialRing<E>;a:import('../polynomial').Polynomial<E>;b:import('../polynomial').Polynomial<E>}) {
        const solve=fresh(),proof=measure('solving',sample,solve,()=>produceNumberFieldModularResultant(solve,input.r,input.a,input.b,bounds));
        const verify=fresh();measure('verification',sample,verify,()=>verifyNumberFieldModularResultant(verify,input.r,input.a,input.b,proof,bounds));
        const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeNumberFieldModularResultant(encode,input.r,input.a,input.b,proof,bounds));
        const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
        const decode=fresh();measure('decoding',sample,decode,()=>decodeNumberFieldModularResultant(decode,input.r,input.a,input.b,parsed,bounds));
      }
      prepared();
      send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='compact-linear-positive'||fixture==='compact-linear-negative') {
    const {rationalField: Q}=await get<typeof import('../field')>('field');
    const {solveCompactRationalLinearSystem,verifyCompactRationalLinearSystem}=await get<typeof import('../compact-rational-linear')>('compact-rational-linear');
    const {encodeCompactRationalLinearSystem,decodeCompactRationalLinearSystem}=await get<typeof import('../compact-rational-linear-wire')>('compact-rational-linear-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample}); const setup=fresh(),input=measure('construction',sample,setup,()=>setup.operation(()=>{
        const rows=12,columns=14,rank=8; setup.allocate(rows*columns+rows);
        const matrix=Object.freeze(Array.from({length:rows},(_,i)=>Object.freeze(Array.from({length:columns},(_,j)=>{
          let power=1n,value=0n; for(let k=0;k<rank;k++){value=setup.add(value,power);power=setup.multiply(power,BigInt((i+1)*(j+1)));}return Q.fromInteger(setup,value);
        }))));
        const rhs=Object.freeze(matrix.map((row,i)=>{let value=Q.fromInteger(setup,0n);for(let j=0;j<columns;j++)value=Q.add(setup,value,Q.multiply(setup,row[j],Q.fromInteger(setup,BigInt(j-2))));
          return fixture==='compact-linear-negative'&&i===rows-1?Q.add(setup,value,Q.fromInteger(setup,1n)):value;}));
        return Object.freeze({rows,columns,matrix,rhs});
      }));
      const solve=fresh(),proof=measure('solving',sample,solve,()=>solveCompactRationalLinearSystem(solve,input));
      if(proof.rank!==8||proof.kind!==(fixture==='compact-linear-positive'?'consistent':'inconsistent'))throw Error('known Vandermonde rank/family mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyCompactRationalLinearSystem(verify,input,proof));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeCompactRationalLinearSystem(encode,input,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodeCompactRationalLinearSystem(decode,input,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='schultz-dependent-integration'||fixture==='schultz-order29-integration') {
    const {schultzIntegrationFixture}=await get<typeof import('./performance-algebraic-fixtures')>('__tests__/performance-algebraic-fixtures');
    const {produceLazyAlgebraicCandidate,checkLazyAlgebraicCandidate,verifyLazyAlgebraicDecision}=await get<typeof import('../algebraic-lazy-decision')>('algebraic-lazy-decision');
    const {encodeNativeAlgebraicElementary,decodeNativeAlgebraicElementary}=await get<typeof import('../algebraic-native-wire')>('algebraic-native-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample});const setup=fresh(),prepared=measure('construction',sample,setup,()=>schultzIntegrationFixture(setup,fixture==='schultz-dependent-integration'?'dependent':'order29'));
      const solve=fresh(),candidate=measure('solving',sample,solve,()=>produceLazyAlgebraicCandidate(solve,prepared.curve,prepared.input,bounds));
      if(candidate.kind!=='elementary'||'derivative' in candidate)throw Error('known Schultz primitive candidate missing/unexpected final authority');
      const check=fresh(),proof=measure('checking',sample,check,()=>checkLazyAlgebraicCandidate(check,prepared.curve,prepared.input,candidate,bounds));
      if(proof.kind!=='elementary')throw Error('known Schultz primitive check mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyLazyAlgebraicDecision(verify,prepared.curve,prepared.input,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeNativeAlgebraicElementary(encode,prepared.curve,prepared.input,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodeNativeAlgebraicElementary(decode,prepared.curve,prepared.input,parsed,bounds));
      send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='ramified-cantor-order-three'||fixture==='ramified-cantor-negative') {
    const {ellipticDivisor}=await get<typeof import('./algebraic-divisor-support')>('__tests__/algebraic-divisor-support');
    const {tryDecideRamifiedDivisorTorsion,verifyRamifiedDivisorTorsion}=await get<typeof import('../ramified-divisor-torsion')>('ramified-divisor-torsion');
    const {encodeRamifiedDivisorTorsion,decodeRamifiedDivisorTorsion}=await get<typeof import('../ramified-torsion-wire')>('ramified-torsion-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample}); const expected=fixture==='ramified-cantor-negative'?null:3n,setup=fresh(),prepared=measure('construction',sample,setup,()=>ellipticDivisor(expected,setup));
      const solve=fresh(),proof=measure('solving',sample,solve,()=>tryDecideRamifiedDivisorTorsion(solve,prepared.curve,prepared.divisor,bounds));
      if(proof===null||proof.order!==expected||proof.kind!==(expected===null?'non-torsion':'torsion'))throw Error('independently known ramified Cantor torsion mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyRamifiedDivisorTorsion(verify,prepared.curve,prepared.divisor,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeRamifiedDivisorTorsion(encode,prepared.curve,prepared.divisor,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh(),decoded=measure('decoding',sample,decode,()=>decodeRamifiedDivisorTorsion(decode,prepared.curve,prepared.divisor,parsed,bounds));
      if(decoded.order!==expected)throw Error('saved ramified Cantor order mismatch');send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='cantor-finite-class-order') {
    const {PositivePrimeField}=await get<typeof import('../positive-field')>('positive-field');
    const {PositivePolynomialRing}=await get<typeof import('../positive-polynomial')>('positive-polynomial');
    const {constructPositiveCantorDomain,constructPositiveMumfordPair}=await get<typeof import('../positive-cantor')>('positive-cantor');
    const {decidePositiveCantorOrder,verifyPositiveCantorOrder}=await get<typeof import('../positive-cantor-order')>('positive-cantor-order');
    const {encodePositiveCantorOrder,decodePositiveCantorOrder}=await get<typeof import('../positive-cantor-order-wire')>('positive-cantor-order-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample}); const setup=fresh(),prepared=measure('construction',sample,setup,()=>{
        const field=new PositivePrimeField(setup,3n),r=new PositivePolynomialRing(field,'x'),h=r.make(setup,[1n,0n,0n,0n,2n,1n].map(n=>field.fromInteger(setup,n))),
          domain=constructPositiveCantorDomain(setup,field,r,h,bounds),input=constructPositiveMumfordPair(setup,domain,r.x(setup),r.one(setup),bounds);
        return {domain,input};
      });
      const solve=fresh(),proof=measure('solving',sample,solve,()=>decidePositiveCantorOrder(solve,prepared.domain,prepared.input,bounds));
      if(proof.order!==17n)throw Error('independently counted genus-two finite Jacobian order mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyPositiveCantorOrder(verify,prepared.domain,prepared.input,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodePositiveCantorOrder(encode,prepared.domain,prepared.input,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodePositiveCantorOrder(decode,prepared.domain,prepared.input,parsed,bounds)); send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='cantor-closed-principality'||fixture==='cantor-principality-negative') {
    const {preparedCantor}=await get<typeof import('./cantor-support')>('__tests__/cantor-support');
    const {constructAlgebraicDivisor}=await get<typeof import('../algebraic-divisor')>('algebraic-divisor');
    const {decideCantorPrincipality,verifyCantorPrincipality}=await get<typeof import('../hyperelliptic-cantor-principality')>('hyperelliptic-cantor-principality');
    const {encodeCantorPrincipality,decodeCantorPrincipality}=await get<typeof import('../hyperelliptic-cantor-wire')>('hyperelliptic-cantor-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample}); const setup=fresh(),prepared=measure('construction',sample,setup,()=>{
        const positive=fixture==='cantor-closed-principality',b=preparedCantor(positive?[1n,0n,0n,1n,0n,1n]:[1n,0n,0n,1n],setup),point=b.choose([0n,1n],1n);
        const entries=positive?[{place:b.choose([1n,0n,1n],1n),coefficient:1n},{place:point,coefficient:3n},{place:b.infinity,coefficient:-5n}]
          :[{place:point,coefficient:1n},{place:b.infinity,coefficient:-1n}];
        return {...b,divisor:constructAlgebraicDivisor(setup,b.curve,entries,bounds)};
      });
      const solve=fresh(),proof=measure('solving',sample,solve,()=>decideCantorPrincipality(solve,prepared.model,prepared.divisor,bounds));
      if(proof.kind!==(fixture==='cantor-closed-principality'?'principal':'not-principal'))throw Error('complete Cantor independently known principality mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyCantorPrincipality(verify,prepared.model,prepared.divisor,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeCantorPrincipality(encode,prepared.curve,prepared.divisor,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh(),decoded=measure('decoding',sample,decode,()=>decodeCantorPrincipality(decode,prepared.curve,prepared.divisor,parsed,bounds));
      if(decoded.kind!==proof.kind)throw Error('Cantor saved principality mismatch'); send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='order29-pell-torsion'||fixture==='infinity-pell-negative') {
    const {orderTwentyNineDivisor}=await get<typeof import('./algebraic-divisor-support')>('__tests__/algebraic-divisor-support');
    const {hyperellipticInfinityDivisor}=await get<typeof import('./hyperelliptic-support')>('__tests__/hyperelliptic-support');
    const {tryDecideHyperellipticInfinityTorsion,verifyHyperellipticInfinityTorsion}=await get<typeof import('../hyperelliptic-infinity-torsion')>('hyperelliptic-infinity-torsion');
    const {encodeHyperellipticInfinityTorsion,decodeHyperellipticInfinityTorsion}=await get<typeof import('../hyperelliptic-torsion-wire')>('hyperelliptic-torsion-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample});
      const setup=fresh(),prepared=measure('construction',sample,setup,()=>fixture==='order29-pell-torsion'?orderTwentyNineDivisor(setup):hyperellipticInfinityDivisor([1n,1n,0n,0n,1n],1n,setup));
      const solve=fresh(),proof=measure('solving',sample,solve,()=>tryDecideHyperellipticInfinityTorsion(solve,prepared.curve,prepared.divisor,bounds));
      if(proof===null||(fixture==='order29-pell-torsion'?(proof.kind!=='torsion'||proof.order!==29n):(proof.kind!=='non-torsion'||proof.reason!=='third-reduction')))throw Error('complete infinity Pell torsion fixture mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyHyperellipticInfinityTorsion(verify,prepared.curve,prepared.divisor,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeHyperellipticInfinityTorsion(encode,prepared.curve,prepared.divisor,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh(),decoded=measure('decoding',sample,decode,()=>decodeHyperellipticInfinityTorsion(decode,prepared.curve,prepared.divisor,parsed,bounds));
      if(decoded.kind!==proof.kind||decoded.order!==proof.order)throw Error('infinity decision saved replay mismatch');
      send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='order29-pell-principality') {
    const {orderTwentyNineDivisor}=await get<typeof import('./algebraic-divisor-support')>('__tests__/algebraic-divisor-support');
    const {scaleAlgebraicDivisorWithin}=await get<typeof import('../algebraic-divisor')>('algebraic-divisor');
    const {tryDecideHyperellipticInfinityPrincipality,verifyHyperellipticInfinityPrincipality}=await get<typeof import('../hyperelliptic-infinity-principality')>('hyperelliptic-infinity-principality');
    const {encodeHyperellipticInfinityPrincipality,decodeHyperellipticInfinityPrincipality}=await get<typeof import('../hyperelliptic-pell-wire')>('hyperelliptic-pell-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample});
      const setup=fresh(),prepared=measure('construction',sample,setup,()=>{const b=orderTwentyNineDivisor(setup);return {...b,divisor:scaleAlgebraicDivisorWithin(setup,b.curve,b.divisor,29n)};});
      const solve=fresh(),proof=measure('solving',sample,solve,()=>tryDecideHyperellipticInfinityPrincipality(solve,prepared.curve,prepared.divisor,bounds));
      if(proof===null||proof.kind!=='principal'||proof.pell.leastDegree!==29n||proof.factors.length!==1||proof.factors[0].exponent!==-1n)throw Error('independently known degree-29 infinity principality mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyHyperellipticInfinityPrincipality(verify,prepared.curve,prepared.divisor,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeHyperellipticInfinityPrincipality(encode,prepared.curve,prepared.divisor,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodeHyperellipticInfinityPrincipality(decode,prepared.curve,prepared.divisor,parsed,bounds));
      send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture==='elliptic-order-two') {
    const {ellipticDivisor}=await get<typeof import('./algebraic-divisor-support')>('__tests__/algebraic-divisor-support');
    const {tryDecideEllipticDivisorTorsion,verifyEllipticDivisorTorsion}=await get<typeof import('../elliptic-divisor-torsion')>('elliptic-divisor-torsion');
    const {encodeEllipticDivisorTorsion,decodeEllipticDivisorTorsion}=await get<typeof import('../elliptic-wire')>('elliptic-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      const setup=fresh(),prepared=measure('setup',sample,setup,()=>ellipticDivisor(2n,setup));
      const solve=fresh(),proof=measure('solving',sample,solve,()=>tryDecideEllipticDivisorTorsion(solve,prepared.curve,prepared.divisor,bounds));
      if(proof===null||proof.kind!=='torsion'||proof.order!==2n)throw Error('elliptic independently known least-order fixture mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyEllipticDivisorTorsion(verify,prepared.curve,prepared.divisor,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeEllipticDivisorTorsion(encode,prepared.curve,prepared.divisor,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodeEllipticDivisorTorsion(decode,prepared.curve,prepared.divisor,parsed,bounds));
    }
  }else if(fixture==='cubic-exactness') {
    const {PolynomialRing}=await get<typeof import('../polynomial')>('polynomial');
    const {RationalFunctionField}=await get<typeof import('../rational-function')>('rational-function');
    const {rationalField}=await get<typeof import('../field')>('field');
    const {constructAlgebraicExtension}=await get<typeof import('../algebraic-field')>('algebraic-field');
    const {certifyAlgebraicConstantField}=await get<typeof import('../algebraic-constant-field')>('algebraic-constant-field');
    const {certifyAlgebraicCurve}=await get<typeof import('../algebraic-curve')>('algebraic-curve');
    const {trySolveRationalCurveExactDifferential,verifyRationalCurveExactDifferential}=await get<typeof import('../rational-curve-exact-differential')>('rational-curve-exact-differential');
    const {constructAlgebraicPrimitiveWithin}=await get<typeof import('../algebraic-primitive')>('algebraic-primitive');
    const {constructCompactAlgebraicCandidateWithin,checkCompactAlgebraicCandidate}=await get<typeof import('../algebraic-elementary-evidence')>('algebraic-elementary-evidence');
    const {encodeCompactAlgebraicElementary,decodeCompactAlgebraicElementary}=await get<typeof import('../algebraic-elementary-wire')>('algebraic-elementary-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      const ctx=fresh(),prepared=measure('setup',sample,ctx,()=>{
        const xRing=new PolynomialRing(rationalField,'x'),base=new RationalFunctionField(xRing);
        const x=base.make(ctx,xRing.make(ctx,[rationalField.fromInteger(ctx,0n),rationalField.fromInteger(ctx,1n)]),xRing.one(ctx));
        const ring=new PolynomialRing(base,'y'),owner=constructAlgebraicExtension(ctx,ring,ring.make(ctx,[base.negate(ctx,x),base.fromInteger(ctx,-1n),base.fromInteger(ctx,0n),base.fromInteger(ctx,1n)]),bounds);
        const constants=certifyAlgebraicConstantField(ctx,owner,bounds),curve=certifyAlgebraicCurve(ctx,owner,constants,bounds),y=owner.generator(ctx);
        const input=owner.inverse(ctx,owner.subtract(ctx,owner.multiply(ctx,owner.fromInteger(ctx,3n),owner.multiply(ctx,y,y)),owner.fromInteger(ctx,1n)));
        return {owner,curve,input,y};
      });
      const solve=fresh(),proof=measure('solving',sample,solve,()=>trySolveRationalCurveExactDifferential(solve,prepared.curve,prepared.input,bounds));
      if(proof===null||proof.kind!=='primitive'||!prepared.owner.equal(solve,proof.primitive,prepared.y))throw Error('cubic independent primitive fixture mismatch');
      const verify=fresh();measure('verification',sample,verify,()=>verifyRationalCurveExactDifferential(verify,prepared.curve,prepared.input,proof,bounds));
      const construction=fresh(),candidate=measure('primitive-construction',sample,construction,()=>construction.operation(()=>{
        const primitive=constructAlgebraicPrimitiveWithin(construction,prepared.curve,proof.primitive,[],bounds);
        return constructCompactAlgebraicCandidateWithin(construction,prepared.curve,prepared.input,primitive,bounds);
      }));
      const check=fresh(),checked=measure('primitive-checking',sample,check,()=>checkCompactAlgebraicCandidate(check,prepared.curve,prepared.input,candidate,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeCompactAlgebraicElementary(encode,prepared.curve,prepared.input,checked,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodeCompactAlgebraicElementary(decode,prepared.curve,prepared.input,parsed,bounds));
    }
  }else if(fixture.startsWith('height-eight-')) {
    const {DifferentialField}=await get<typeof import('../differential-field')>('differential-field');
    const {CertifiedTowerView,verifyCertifiedTower,verifyCertifiedTowerWithin}=await get<typeof import('../recursive-certified-tower')>('recursive-certified-tower');
    const {differentiateWithin}=await get<typeof import('../differential-derivative')>('differential-derivative');
    const {certifyStructuredDifferentialExtensionWithin}=await get<typeof import('../structured-differential-admission')>('structured-differential-admission');
    const {encodeStructuredDifferentialAdmission,decodeStructuredDifferentialAdmission}=await get<typeof import('../structured-differential-admission-wire')>('structured-differential-admission-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++){
      const ctx=fresh(),top=measure('construction',sample,ctx,()=>ctx.operation(()=>{
        const q=DifferentialField.rationals(ctx,bounds),base=DifferentialField.rationalFunctions(ctx,q,'x',bounds);
        let view=CertifiedTowerView.rationalFunctions(ctx,base,bounds);
        let result:ReturnType<typeof certifyStructuredDifferentialExtensionWithin>|undefined;
        for(let k=1;k<bounds.towerHeight;k++){
          const parent=view,kind=fixture==='height-eight-nested-log'||fixture==='height-eight-mixed'&&k%2===1?'logarithm':'exponential';
          const argument=fixture==='height-eight-nested-log'?parent.owner.generator(ctx):kind==='logarithm'
            ?parent.owner.embed(ctx,base.make(ctx,[q.fromInteger(ctx,BigInt(k)),q.fromInteger(ctx,1n)]))
            :parent.owner.embed(ctx,base.make(ctx,Array.from({length:k+1},(_,i)=>q.fromInteger(ctx,i===k?1n:0n))));
          const derivative=differentiateWithin(ctx,parent.owner,argument).derivative;
          const rate=kind==='logarithm'?parent.owner.exactDivide(ctx,derivative,argument):derivative;
          const owner=DifferentialField.formal(ctx,parent.owner,`t${k}`,kind==='logarithm'?[rate]:[parent.owner.fromInteger(ctx,0n),rate],bounds);
          result=certifyStructuredDifferentialExtensionWithin(ctx,parent,owner,{kind,argument},bounds);
          if(result.kind!=='admitted')throw Error('fixed independent tower fixture was dependent');view=result.view;
        }
        if(!result||result.kind!=='admitted')throw Error('height-eight fixture missing final view');
        verifyCertifiedTowerWithin(ctx,view,bounds);return result;
      }));
      const verify=fresh();measure('verification',sample,verify,()=>verifyCertifiedTower(verify,top.view,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeStructuredDifferentialAdmission(encode,top.evidence.parent,top.evidence.owner,top.evidence.construction,top,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodeStructuredDifferentialAdmission(decode,top.evidence.parent,top.evidence.owner,top.evidence.construction,parsed,bounds));
    }
  }else if(fixture==='genus-zero-split'||fixture==='genus-zero-constant-extension'||fixture==='genus-zero-hidden-constants') {
    const {quadratic}=await get<typeof import('./algebraic-support')>('__tests__/algebraic-support');
    const {certifyAlgebraicConstantField}=await get<typeof import('../algebraic-constant-field')>('algebraic-constant-field');
    const {certifyAlgebraicCurve}=await get<typeof import('../algebraic-curve')>('algebraic-curve');
    const {tryProduceGenusZeroCandidate}=await get<typeof import('../genus-zero-integration')>('genus-zero-integration');
    const {checkCompactAlgebraicCandidate,verifyCompactAlgebraicElementary}=await get<typeof import('../algebraic-elementary-evidence')>('algebraic-elementary-evidence');
    const {encodeCompactAlgebraicElementary,decodeCompactAlgebraicElementary}=await get<typeof import('../algebraic-elementary-wire')>('algebraic-elementary-wire');
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample}); const setup=fresh(),prepared=measure('construction',sample,setup,()=>setup.operation(()=>{
        const b=quadratic(fixture==='genus-zero-constant-extension'?[-1n,0n,-1n]:fixture==='genus-zero-hidden-constants'?[0n,0n,2n]:[1n,0n,1n],setup),constants=certifyAlgebraicConstantField(setup,b.owner,bounds),curve=certifyAlgebraicCurve(setup,b.owner,constants,bounds),x=b.owner.embed(setup,b.x),input=fixture==='genus-zero-hidden-constants'?b.owner.exactDivide(setup,b.a,b.owner.multiply(setup,x,x)):b.owner.inverse(setup,b.a);
        return {curve,input};
      }));
      const solve=fresh(),candidate=measure('solving',sample,solve,()=>tryProduceGenusZeroCandidate(solve,prepared.curve,prepared.input,bounds));if(!candidate)throw Error('known genus-zero applicability');
      const check=fresh(),proof=measure('checking',sample,check,()=>checkCompactAlgebraicCandidate(check,prepared.curve,prepared.input,candidate,bounds));
      const verify=fresh();measure('verification',sample,verify,()=>verifyCompactAlgebraicElementary(verify,prepared.curve,prepared.input,proof,bounds));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeCompactAlgebraicElementary(encode,prepared.curve,prepared.input,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodeCompactAlgebraicElementary(decode,prepared.curve,prepared.input,parsed,bounds));send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture.startsWith('compact-exponential-')||fixture.startsWith('compact-logarithmic-')) {
    const {DifferentialField}=await get<typeof import('../differential-field')>('differential-field');
    const {buildExponential,buildLogarithm}=await get<typeof import('../differential-admission')>('differential-admission');
    const compact=await get<typeof import('../first-level-elementary-evidence')>('first-level-elementary-evidence');
    const wire=await get<typeof import('../first-level-elementary-wire')>('first-level-elementary-wire');
    const exponential=await get<typeof import('../exponential-rational-decision')>('exponential-rational-decision');
    const logarithmic=await get<typeof import('../logarithmic-rational-decision')>('logarithmic-rational-decision');
    const oldExp=await get<typeof import('../exponential-rational-wire')>('exponential-rational-wire');
    const oldLog=await get<typeof import('../logarithmic-rational-wire')>('logarithmic-rational-wire');
    const isExp=fixture.startsWith('compact-exponential-'),bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    if(!['compact-exponential-inverse','compact-exponential-rootlog','compact-exponential-negative','compact-logarithmic-rootlog','compact-logarithmic-repeated','compact-logarithmic-negative'].includes(fixture))throw Error(`unknown fixture ${fixture}`);
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample}); const setup=fresh(),prepared=measure('construction',sample,setup,()=>setup.operation(()=>{
        const Q=DifferentialField.rationals(setup,bounds),base=DifferentialField.rationalFunctions(setup,Q,'x',bounds),x=base.generator(setup),admitted=isExp?buildExponential(setup,base,'t',[x],bounds):buildLogarithm(setup,base,'t',x,bounds);
        if(admitted.status!=='supported')throw Error('known first-level admission'); const F=admitted.field,t=F.generator(setup),one=F.fromInteger(setup,1n);
        const input=fixture==='compact-exponential-inverse'?F.inverse(setup,t):fixture==='compact-exponential-rootlog'?F.exactDivide(setup,t,F.add(setup,one,F.multiply(setup,t,t))):fixture==='compact-exponential-negative'?F.multiply(setup,t,F.embed(setup,base.inverse(setup,x))):fixture==='compact-logarithmic-negative'?F.exactDivide(setup,t,F.embed(setup,base.add(setup,x,base.fromInteger(setup,1n)))):F.exactDivide(setup,F.embed(setup,base.inverse(setup,x)),fixture==='compact-logarithmic-repeated'?F.multiply(setup,t,t):t);
        return {F,input};
      }));
      const {F,input}=prepared,solve=fresh(),check=fresh(),verify=fresh(),encode=fresh(),decode=fresh();
      if(isExp) {
        const candidate=measure('solving',sample,solve,()=>compact.produceCompactExponentialCandidate(solve,F,input,bounds)),proof=measure('checking',sample,check,()=>compact.checkCompactExponentialCandidate(check,F,input,candidate,bounds));
        measure('verification',sample,verify,()=>proof.kind==='elementary'?compact.verifyCompactExponentialElementary(verify,F,input,proof,bounds):exponential.verifyExponentialRationalDecision(verify,F,input,proof,bounds));
        const data=measure('encoding',sample,encode,()=>proof.kind==='elementary'?wire.encodeCompactExponentialElementary(encode,F,input,proof,bounds):oldExp.encodeExponentialRationalDecision(encode,F,input,proof,bounds)),text=JSON.stringify(data),parsed=JSON.parse(text);
        send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
        measure('decoding',sample,decode,()=>proof.kind==='elementary'?wire.decodeCompactExponentialElementary(decode,F,input,parsed,bounds):oldExp.decodeExponentialRationalDecision(decode,F,input,parsed,bounds));
        if((proof.kind==='non-elementary')!==(fixture==='compact-exponential-negative'))throw Error('known exponential outcome');
      }else{
        const candidate=measure('solving',sample,solve,()=>compact.produceCompactLogarithmicCandidate(solve,F,input,bounds)),proof=measure('checking',sample,check,()=>compact.checkCompactLogarithmicCandidate(check,F,input,candidate,bounds));
        measure('verification',sample,verify,()=>proof.kind==='elementary'?compact.verifyCompactLogarithmicElementary(verify,F,input,proof,bounds):logarithmic.verifyLogarithmicRationalDecision(verify,F,input,proof,bounds));
        const data=measure('encoding',sample,encode,()=>proof.kind==='elementary'?wire.encodeCompactLogarithmicElementary(encode,F,input,proof,bounds):oldLog.encodeLogarithmicRationalDecision(encode,F,input,proof,bounds)),text=JSON.stringify(data),parsed=JSON.parse(text);
        send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
        measure('decoding',sample,decode,()=>proof.kind==='elementary'?wire.decodeCompactLogarithmicElementary(decode,F,input,parsed,bounds):oldLog.decodeLogarithmicRationalDecision(decode,F,input,parsed,bounds));
        if((proof.kind==='non-elementary')!==(fixture==='compact-logarithmic-negative'))throw Error('known logarithmic outcome');
      }
      send({event:'cycle-finished',fixture,sample});
    }
  }else if(fixture.startsWith('compact-rational-')) {
    const bounds=Object.freeze({towerHeight:8,artifactDepth:64,artifactNodes:100000,artifactBytes:16*1024*1024});
    if(!['compact-rational-quadratic','compact-rational-quartic','compact-rational-quintic'].includes(fixture))throw Error(`unknown fixture ${fixture}`);
    for(let sample=-2;sample<5;sample++) {
      send({event:'cycle-started',fixture,sample}); const setup=fresh(),owner=new FormalPrimitiveDomain('x','z');
      const input=measure('setup',sample,setup,()=>owner.fractions.make(setup,owner.x.one(setup),owner.x.make(setup,
        (fixture==='compact-rational-quadratic'?[1n,0n,1n]:fixture==='compact-rational-quartic'?[1n,0n,0n,0n,1n]:[-1n,-1n,0n,0n,0n,1n]).map(n=>rational(setup,n)))));
      const solve=fresh(),candidate=measure('solving',sample,solve,()=>produceCompactRationalCandidate(solve,owner,input));
      const check=fresh(),proof=measure('checking',sample,check,()=>checkCompactRationalCandidate(check,owner,input,candidate));
      const verify=fresh();measure('verification',sample,verify,()=>verifyCompactRationalElementary(verify,owner,input,proof));
      const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeCompactRationalElementary(encode,owner,input,proof,bounds));
      const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
      const decode=fresh();measure('decoding',sample,decode,()=>decodeCompactRationalElementary(decode,owner,input,parsed,bounds));
      send({event:'cycle-finished',fixture,sample});
    }
  }else{
  if(!['rational-quadratic','rational-quartic','rational-quintic'].includes(fixture))throw Error(`unknown fixture ${fixture}`);
  for(let sample=-2;sample<5;sample++){
    const setup=fresh(),owner=new FormalPrimitiveDomain('x','z');
    const input=measure('setup',sample,setup,()=>owner.fractions.make(setup,owner.x.one(setup),owner.x.make(setup,
      (fixture==='rational-quadratic'?[1n,0n,1n]:fixture==='rational-quartic'?[1n,0n,0n,0n,1n]:[-1n,-1n,0n,0n,0n,1n]).map(n=>rational(setup,n)))));
    const solve=fresh(),proof=measure('solving',sample,solve,()=>integrateRational(solve,owner,input));
    const verify=fresh();measure('verification',sample,verify,()=>verifyRationalDecision(verify,owner,input,proof));
    const encode=fresh(),data=measure('encoding',sample,encode,()=>encodeRationalDecision(encode,owner,proof));
    const text=JSON.stringify(data),parsed=JSON.parse(text);send({event:'sample',fixture,stage:'artifact',sample,bytes:Buffer.byteLength(text)});
    const decode=fresh();measure('decoding',sample,decode,()=>decodeRationalDecision(decode,owner,input,parsed));
  }
  }
  send({event:'finished',fixture});process.disconnect();
}catch(error){send({event:'failure',fixture,message:error instanceof Error?error.message:String(error)});process.exitCode=1;process.disconnect();}
