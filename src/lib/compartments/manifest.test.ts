import { describe, expect, it } from 'vitest';
import {
  COMPARTMENT_MANIFEST,
  listOoeBackedCompartmentOptions,
  resolveOoeBackedCompartment,
} from './manifest';
import {
  OOE_EVENT_COMPARTMENT_OPTIONS,
  resolveOoeEventCompartment,
} from '../ooe/events/compartment-labels';

describe('compartment manifest', () => {
  it('declares unique compartment ids', () => {
    const ids = COMPARTMENT_MANIFEST.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('drives OOE compartment label options from the OOE-backed manifest subset', () => {
    expect(OOE_EVENT_COMPARTMENT_OPTIONS).toEqual(listOoeBackedCompartmentOptions());
    expect(OOE_EVENT_COMPARTMENT_OPTIONS.map((entry) => entry.compartmentId)).toEqual([
      'calculate',
      'equation',
      'calculus',
      'trigonometry',
      'statistics',
      'geometry',
      'linear-algebra',
      'table',
      'navigation-input-kernel',
    ]);
  });

  it('resolves known OOE facts and leaves unknown facts unlabeled', () => {
    expect(resolveOoeBackedCompartment({
      capabilityId: 'expression.evaluate',
    })).toEqual({
      compartmentId: 'calculate',
      compartmentLabel: 'Calculate',
    });
    expect(resolveOoeEventCompartment({
      capabilityId: 'linearAlgebra.vector',
    })).toEqual({
      compartmentId: 'linear-algebra',
      compartmentLabel: 'Linear Algebra',
    });
    expect(resolveOoeEventCompartment({
      capabilityId: 'editor.previewRender',
    })).toEqual({
      compartmentId: 'navigation-input-kernel',
      compartmentLabel: 'Navigation/Input',
    });
    expect(resolveOoeEventCompartment({
      capabilityId: 'test.route',
      routeLabel: 'unknown.route',
      hostId: 'test-runtime',
    })).toBeUndefined();
  });
});
