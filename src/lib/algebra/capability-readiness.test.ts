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
      'rational-function-core',
      'simplify-policy',
      'domain-range-core',
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
      'defer',
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

  it('records reusable numeric vector/matrix cores while deferring exact linear algebra', () => {
    const vectorMatrix = getMathCapabilityReadinessDescriptor('vector-matrix-core');
    const exactLinearAlgebra = getMathCapabilityReadinessDescriptor('exact-linear-algebra');

    expect(vectorMatrix.status).toBe('ready-with-adapter');
    expect(vectorMatrix.evidence).toContain('src/lib/linear-algebra/matrix-core.ts');
    expect(vectorMatrix.evidence).toContain('src/lib/linear-algebra/vector-core.ts');
    expect(vectorMatrix.summary).toContain('Separate reusable numeric Matrix and Vector cores');
    expect(exactLinearAlgebra.status).toBe('defer');
    expect(exactLinearAlgebra.dependsOn).toContain('vector-matrix-core');
    expect(exactLinearAlgebra.blockers.join(' ')).toContain('MATRIX-EXACT0');
  });

  it('records polynomial readiness as bounded and adapter-backed after POLY-RAT-CORE1', () => {
    const polynomial = getMathCapabilityReadinessDescriptor('polynomial-core');

    expect(polynomial.status).toBe('ready-with-adapter');
    expect(polynomial.evidence).toContain('.memory/research/readiness/poly-core-readiness-matrix.md');
    expect(polynomial.nextMilestone).toBe('INT-RAT2');
    expect(polynomial.summary).toContain('Bounded one-variable exact polynomial support');
    expect(polynomial.blockers.join(' ')).toContain('Grobner');
    expect(polynomial.blockers.join(' ')).toContain('bounded repeated/quadratic readiness');
  });

  it('records POLY-RAT-CORE1 rational function readiness while keeping calculus adoption separate', () => {
    const rational = getMathCapabilityReadinessDescriptor('rational-function-core');

    expect(rational.status).toBe('ready-with-adapter');
    expect(rational.evidence).toContain('src/lib/algebra/rational-function-core.ts');
    expect(rational.summary).toContain('repeated-linear');
    expect(rational.summary).toContain('irreducible-quadratic');
    expect(rational.nextMilestone).toBe('INT-RAT2');
    expect(rational.dependsOn).toContain('polynomial-core');
    expect(rational.blockers.join(' ')).toContain('distinct rational linear factors');
    expect(rational.blockers.join(' ')).toContain('broad rational-integration');
  });

  it('records SIMPLIFY-CORE0 as policy metadata rather than broad simplification', () => {
    const policy = getMathCapabilityReadinessDescriptor('simplify-policy');

    expect(policy.status).toBe('ready-with-adapter');
    expect(policy.summary).toContain('form-intent');
    expect(policy.summary).toContain('preserved-fact');
    expect(policy.evidence).toContain('src/lib/algebra/simplify-policy.ts');
    expect(policy.nextMilestone).toBe('INT-RAT2');
    expect(policy.dependsOn).toContain('rational-function-core');
    expect(policy.blockers.join(' ')).toContain('No broad canonical simplifier');
  });

  it('records INT-CANDIDATE2 as internal metadata on symbolic integration readiness', () => {
    const symbolicIntegration = getMathCapabilityReadinessDescriptor('symbolic-integration');

    expect(symbolicIntegration.status).toBe('ready-with-adapter');
    expect(symbolicIntegration.summary).toContain('partial fractions');
    expect(symbolicIntegration.summary).toContain('not adopted');
    expect(symbolicIntegration.evidence).toContain('.memory/research/readiness/int-candidate2-integration-candidate-metadata.md');
    expect(symbolicIntegration.nextMilestone).toBeUndefined();
    expect(symbolicIntegration.dependsOn).toContain('rational-function-core');
    expect(symbolicIntegration.blockers.join(' ')).toContain('broad rational integration');
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
