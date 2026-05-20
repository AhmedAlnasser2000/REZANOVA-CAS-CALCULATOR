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
      'blocked',
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

  it('keeps vector/matrix and exact linear algebra conservative', () => {
    const vectorMatrix = getMathCapabilityReadinessDescriptor('vector-matrix-core');
    const exactLinearAlgebra = getMathCapabilityReadinessDescriptor('exact-linear-algebra');

    expect(vectorMatrix.status).toBe('blocked');
    expect(vectorMatrix.nextMilestone).toBe('VEC-MAT-CORE0');
    expect(vectorMatrix.summary).toContain('not a reusable core');
    expect(exactLinearAlgebra.status).toBe('defer');
    expect(exactLinearAlgebra.dependsOn).toContain('vector-matrix-core');
    expect(exactLinearAlgebra.blockers.join(' ')).toContain('MATRIX-EXACT0');
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
