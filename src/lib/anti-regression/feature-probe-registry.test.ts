import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../types/calculator';
import {
  EXECUTABLE_FEATURE_PROBES,
  FEATURE_PROBE_REGISTRY,
  type ProbePolicyClass,
} from './feature-probe-registry';

const EXPECTED_POLICY_CLASSES: ProbePolicyClass[] = [
  'formatting',
  'persistence-privacy',
  'semantic-runtime',
  'shell-accessibility',
];

const TEST_SOURCES = import.meta.glob('/src/**/*.test.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

describe('feature probe registry', () => {
  it('matches the live 24-key Settings contract exactly', () => {
    const settingsKeys = Object.keys(DEFAULT_SETTINGS).sort();
    const registryKeys = Object.keys(FEATURE_PROBE_REGISTRY).sort();

    expect(settingsKeys).toHaveLength(24);
    expect(registryKeys).toEqual(settingsKeys);
  });

  it('classifies every setting and references executable probes', () => {
    const usedPolicyClasses = new Set<ProbePolicyClass>();
    const referencedProbeIds = new Set<string>();

    for (const policy of Object.values(FEATURE_PROBE_REGISTRY)) {
      usedPolicyClasses.add(policy.policyClass);
      expect(policy.probes.length).toBeGreaterThan(0);

      for (const probeId of policy.probes) {
        referencedProbeIds.add(probeId);
        const probe = EXECUTABLE_FEATURE_PROBES[probeId];
        expect(['native', 'component', 'persistence']).toContain(probe.kind);

        const testSource = TEST_SOURCES[`/${probe.testFile}`];
        expect(testSource).toBeTypeOf('string');
        expect(testSource).toContain(probe.testName);
      }
    }

    expect([...usedPolicyClasses].sort()).toEqual(EXPECTED_POLICY_CLASSES);
    expect([...referencedProbeIds].sort()).toEqual(Object.keys(EXECUTABLE_FEATURE_PROBES).sort());
  });

  it('pins the required cross-setting behavior families', () => {
    expect(FEATURE_PROBE_REGISTRY.angleUnit.probes).toContain('inverse-trig-angle-units-native');
    expect(FEATURE_PROBE_REGISTRY.outputStyle.probes).toContain('output-style-native');
    expect(FEATURE_PROBE_REGISTRY.approxDigits.probes).toContain('numeric-precision-native');
    expect(FEATURE_PROBE_REGISTRY.numericNotationMode.probes).toContain('numeric-scientific-native');
    expect(FEATURE_PROBE_REGISTRY.highContrast.probes).toContain('surface-scale-contrast-component');
    expect(FEATURE_PROBE_REGISTRY.historyEnabled.probes).toContain('history-disabled-persistence');
    expect(FEATURE_PROBE_REGISTRY.calculatorMemoryEnabled.probes).toContain('calculator-memory-restore-persistence');
  });
});
