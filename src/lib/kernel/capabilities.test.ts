import { describe, expect, it } from 'vitest';
import {
  getKernelCapabilityDescriptor,
  getKernelCapabilityForAction,
  getTableBuildCapability,
  listKernelCapabilities,
} from './capabilities';

describe('kernel capability registry', () => {
  it('lists only the bounded execution seams in ARCH1', () => {
    expect(listKernelCapabilities().map((entry) => entry.id)).toEqual([
      'expression.evaluate',
      'expression.simplify',
      'expression.factor',
      'expression.expand',
      'equation.solve',
      'table.build',
    ]);
  });

  it('resolves expression actions to the shared expression runtime seam', () => {
    expect(getKernelCapabilityForAction('evaluate')).toEqual(
      getKernelCapabilityDescriptor('expression.evaluate'),
    );
    expect(getKernelCapabilityForAction('factor')).toEqual(
      getKernelCapabilityDescriptor('expression.factor'),
    );
    expect(getKernelCapabilityForAction('solve')).toEqual(
      getKernelCapabilityDescriptor('equation.solve'),
    );
  });

  it('keeps table build as a dedicated runtime seam', () => {
    expect(getTableBuildCapability()).toEqual({
      id: 'table.build',
      category: 'table',
      entrypoint: 'buildTable',
      description: 'Build a numeric table through the shared table runtime.',
    });
  });
});
