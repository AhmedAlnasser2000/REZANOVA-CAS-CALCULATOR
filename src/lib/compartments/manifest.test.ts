import { describe, expect, it } from 'vitest';
import {
  COMPARTMENT_MANIFEST,
  getCompartmentManifestEntry,
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

  it('declares the contract fields used by diagnostics and validation', () => {
    for (const entry of COMPARTMENT_MANIFEST) {
      expect(entry.ownedPaths.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.publicSeams)).toBe(true);
      expect(Array.isArray(entry.privatePaths)).toBe(true);
      expect(Array.isArray(entry.dependencyPolicies)).toBe(true);
      expect(['none', 'internal-diagnostics', 'future-surface']).toContain(
        entry.surfaceExposureCandidate,
      );
    }
  });

  it('keeps user-facing OOE-backed compartments as future surface candidates', () => {
    const candidates = COMPARTMENT_MANIFEST
      .filter((entry) => entry.surfaceExposureCandidate === 'future-surface')
      .map((entry) => entry.id);

    expect(candidates).toEqual([
      'display',
      'graphing',
      'calculate',
      'equation',
      'calculus',
      'trigonometry',
      'statistics',
      'geometry',
      'linear-algebra',
      'table',
      'guide',
    ]);
  });

  it('declares Language as static text infrastructure without a UI surface candidate', () => {
    expect(getCompartmentManifestEntry('language')).toMatchObject({
      id: 'language',
      stateSurface: 'static',
      surfaceExposureCandidate: 'none',
      ownedPaths: ['src/lib/language/'],
      publicSeams: [
        'src/lib/language/index.ts',
        'src/lib/language/language-context.ts',
      ],
      privatePaths: ['src/lib/language/languages/'],
      dependencyPolicies: [
        'library-no-app-ui',
        'no-source-mirrors',
      ],
    });
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
