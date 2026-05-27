import { describe, expect, it } from 'vitest';
import { listKernelCapabilities } from '../kernel/capabilities';
import {
  getMathCapabilityReadinessDescriptor,
  getMathCapabilityReadinessStatus,
  listMathCapabilityReadiness,
  MATH_CAPABILITY_READINESS_STATUSES,
} from './capability-readiness';

describe('math capability readiness facts', () => {
  it('keeps the readiness registry small and stable for ALG-CAPS0', () => {
    expect(listMathCapabilityReadiness().map((entry) => entry.id)).toEqual([
      'polynomial-core',
      'polynomial-elimination-core',
      'rational-function-core',
      'variable-core',
      'simplify-policy',
      'assumptions-core',
      'domain-range-core',
      'domain-sampling-readiness',
      'calculus-core',
      'calculus-verification',
      'symbolic-integration',
      'limit-core',
      'result-envelope',
      'numeric-fallback-policy',
      'vector-matrix-core',
      'exact-linear-algebra',
    ]);
  });

  it('uses only the approved readiness statuses', () => {
    const allowed = new Set(MATH_CAPABILITY_READINESS_STATUSES);
    const observed = listMathCapabilityReadiness().map((entry) => entry.status);

    expect(observed.every((status) => allowed.has(status))).toBe(true);
    expect([...new Set(observed)].sort()).toEqual([
      'ready',
      'ready-with-adapter',
    ]);
  });

  it('has unique ids and resolvable dependency references', () => {
    const descriptors = listMathCapabilityReadiness();
    const ids = descriptors.map((entry) => entry.id);
    const idSet = new Set(ids);

    expect(idSet.size).toBe(ids.length);
    for (const descriptor of descriptors) {
      for (const dependency of descriptor.dependsOn) {
        expect(idSet.has(dependency)).toBe(true);
      }
      expect(getMathCapabilityReadinessDescriptor(descriptor.id)).toBe(descriptor);
      expect(getMathCapabilityReadinessStatus(descriptor.id)).toBe(descriptor.status);
    }
  });

  it('records reusable numeric vector/matrix cores and internal exact linear algebra readiness', () => {
    const vectorMatrix = getMathCapabilityReadinessDescriptor('vector-matrix-core');
    const exactLinearAlgebra = getMathCapabilityReadinessDescriptor('exact-linear-algebra');

    expect(vectorMatrix.status).toBe('ready-with-adapter');
    expect(vectorMatrix.evidence).toContain('src/lib/linear-algebra/matrix-core.ts');
    expect(vectorMatrix.evidence).toContain('src/lib/linear-algebra/vector-core.ts');
    expect(vectorMatrix.summary).toContain('Separate reusable numeric Matrix and Vector cores');
    expect(exactLinearAlgebra.status).toBe('ready-with-adapter');
    expect(exactLinearAlgebra.evidence).toContain('src/lib/linear-algebra/exact-matrix-core.ts');
    expect(exactLinearAlgebra.summary).toContain('bounded internal exact rational matrix core');
    expect(exactLinearAlgebra.dependsOn).toContain('vector-matrix-core');
    expect(exactLinearAlgebra.blockers.join(' ')).toContain('Product Matrix exact mode');
    expect(exactLinearAlgebra.blockers.join(' ')).toContain('product-facing polynomial systems');
  });

  it('records polynomial readiness as bounded and adapter-backed after POLY-RAT-CORE1', () => {
    const polynomial = getMathCapabilityReadinessDescriptor('polynomial-core');

    expect(polynomial.status).toBe('ready-with-adapter');
    expect(polynomial.evidence).toContain('.memory/research/readiness/poly-core-readiness-matrix.md');
    expect(polynomial.nextMilestone).toBeUndefined();
    expect(polynomial.summary).toContain('Bounded one-variable exact polynomial support');
    expect(polynomial.blockers.join(' ')).toContain('Grobner');
    expect(polynomial.blockers.join(' ')).toContain('algebraic-root');
  });

  it('records POLY-ELIM2 backend projection readiness without broad elimination claims', () => {
    const elimination = getMathCapabilityReadinessDescriptor('polynomial-elimination-core');

    expect(elimination.status).toBe('ready-with-adapter');
    expect(elimination.summary).toContain('bounded univariate exact resultants');
    expect(elimination.summary).toContain('bounded bivariate resultant projection');
    expect(elimination.evidence).toContain('src/lib/algebra/polynomial-elimination-core.ts');
    expect(elimination.evidence).toContain('src/lib/algebra/polynomial-bivariate-elimination.ts');
    expect(elimination.dependsOn).toContain('exact-linear-algebra');
    expect(elimination.blockers.join(' ')).toContain('backend-only');
    expect(elimination.blockers.join(' ')).toContain('product-facing polynomial systems');
    expect(elimination.blockers.join(' ')).toContain('Grobner');
  });

  it('records POLY-RAT-CORE1 rational function readiness after INT-RAT2 adoption', () => {
    const rational = getMathCapabilityReadinessDescriptor('rational-function-core');

    expect(rational.status).toBe('ready-with-adapter');
    expect(rational.evidence).toContain('src/lib/algebra/rational-function-core.ts');
    expect(rational.summary).toContain('repeated-linear');
    expect(rational.summary).toContain('irreducible-quadratic');
    expect(rational.nextMilestone).toBeUndefined();
    expect(rational.dependsOn).toContain('polynomial-core');
    expect(rational.blockers.join(' ')).toContain('strict caps');
    expect(rational.blockers.join(' ')).toContain('full rational-integration');
  });

  it('records VARIABLE-CORE1 as internal role metadata rather than solver widening', () => {
    const variable = getMathCapabilityReadinessDescriptor('variable-core');

    expect(variable.status).toBe('ready-with-adapter');
    expect(variable.summary).toContain('symbol discovery');
    expect(variable.summary).toContain('variable-role metadata');
    expect(variable.evidence).toContain('src/lib/algebra/variable-core.ts');
    expect(variable.blockers.join(' ')).toContain('Equation solve-target UI');
    expect(variable.blockers.join(' ')).toContain('named string variables');
    expect(variable.blockers.join(' ')).toContain('reserved-token highlighting');
  });

  it('records SIMPLIFY-CORE0 as policy metadata rather than broad simplification', () => {
    const policy = getMathCapabilityReadinessDescriptor('simplify-policy');

    expect(policy.status).toBe('ready-with-adapter');
    expect(policy.summary).toContain('form-intent');
    expect(policy.summary).toContain('preserved-fact');
    expect(policy.evidence).toContain('src/lib/algebra/simplify-policy.ts');
    expect(policy.nextMilestone).toBeUndefined();
    expect(policy.dependsOn).toContain('rational-function-core');
    expect(policy.blockers.join(' ')).toContain('No broad canonical simplifier');
  });

  it('records ASSUMPTIONS-CORE0 as scoped facts rather than global assumptions', () => {
    const assumptions = getMathCapabilityReadinessDescriptor('assumptions-core');

    expect(assumptions.status).toBe('ready');
    expect(assumptions.summary).toContain('domain exclusions');
    expect(assumptions.summary).toContain('equivalence trust');
    expect(assumptions.evidence).toContain('src/lib/algebra/assumptions-core.ts');
    expect(assumptions.dependsOn).toContain('simplify-policy');
    expect(assumptions.dependsOn).toContain('domain-range-core');
    expect(assumptions.blockers.join(' ')).toContain('No public assume feature');
    expect(assumptions.blockers.join(' ')).toContain('global mutable assumption context');
  });

  it('records DOMAIN-GRAPH-READY0 as sampling readiness rather than graphing behavior', () => {
    const sampling = getMathCapabilityReadinessDescriptor('domain-sampling-readiness');

    expect(sampling.status).toBe('ready-with-adapter');
    expect(sampling.summary).toContain('future graphing surfaces');
    expect(sampling.evidence).toContain('src/lib/algebra/domain-sampling-readiness.ts');
    expect(sampling.dependsOn).toContain('domain-range-core');
    expect(sampling.dependsOn).toContain('assumptions-core');
    expect(sampling.blockers.join(' ')).toContain('not a plotting engine');
  });

  it('records INT-RAT2 rational integration readiness while deferring broad integration', () => {
    const symbolicIntegration = getMathCapabilityReadinessDescriptor('symbolic-integration');

    expect(symbolicIntegration.status).toBe('ready-with-adapter');
    expect(symbolicIntegration.summary).toContain('partial fractions');
    expect(symbolicIntegration.summary).toContain('repeated');
    expect(symbolicIntegration.summary).toContain('irreducible-quadratic');
    expect(symbolicIntegration.evidence).toContain('.memory/research/readiness/int-candidate2-integration-candidate-metadata.md');
    expect(symbolicIntegration.nextMilestone).toBeUndefined();
    expect(symbolicIntegration.dependsOn).toContain('rational-function-core');
    expect(symbolicIntegration.blockers.join(' ')).toContain('Broad rational integration');
  });

  it('stays separate from runtime kernel execution capabilities', () => {
    const readinessIds = new Set<string>(listMathCapabilityReadiness().map((entry) => entry.id));
    const runtimeCapabilityIds = listKernelCapabilities().map((entry) => entry.id);

    expect(runtimeCapabilityIds).toEqual([
      'expression.evaluate',
      'expression.simplify',
      'expression.factor',
      'expression.expand',
      'equation.solve',
      'table.build',
    ]);
    expect(runtimeCapabilityIds.some((id) => readinessIds.has(id))).toBe(false);
  });
});
