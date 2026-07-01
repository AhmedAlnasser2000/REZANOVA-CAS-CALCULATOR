import { describe, expect, it } from 'vitest';
import {
  SURFACE_BLOCKED_FIELD_IDS,
  SURFACE_CURRENT_DTO_FIELD_IDS,
  SURFACE_EXPOSURE_CLASSES,
  SURFACE_FIELD_POLICIES,
  SURFACE_RESULT_SUMMARY_COUNT_VOCABULARY_IDS,
  SURFACE_RESULT_SUMMARY_FACT_VOCABULARY_IDS,
  SURFACE_RESULT_SUMMARY_VOCABULARY,
  getSurfaceFieldPolicy,
  getSurfaceResultSummaryVocabularyEntry,
  listSurfaceFieldPolicies,
  listSurfaceResultSummaryVocabulary,
} from './policy';
import {
  SURFACE_PROTOCOL_VERSION,
  querySurfaceSnapshot,
} from './index';

describe('Surface Protocol policy and vocabulary registry', () => {
  it('classifies every current DTO field exactly once', () => {
    const allowedPolicies = SURFACE_FIELD_POLICIES.filter((entry) => entry.disposition === 'allowed');
    expect(new Set(allowedPolicies.map((entry) => entry.id)).size).toBe(allowedPolicies.length);
    expect(allowedPolicies.map((entry) => entry.id).sort()).toEqual(
      [...SURFACE_CURRENT_DTO_FIELD_IDS].sort(),
    );
    for (const fieldId of SURFACE_CURRENT_DTO_FIELD_IDS) {
      const policy = getSurfaceFieldPolicy(fieldId);
      expect(policy).toBeDefined();
      expect(policy?.disposition).toBe('allowed');
      expect(SURFACE_EXPOSURE_CLASSES).toContain(policy?.exposure);
    }
  });

  it('keeps blocked future and internal areas sensitive or forbidden', () => {
    for (const fieldId of SURFACE_BLOCKED_FIELD_IDS) {
      const policy = getSurfaceFieldPolicy(fieldId);
      expect(policy).toBeDefined();
      expect(policy?.disposition).toBe('blocked');
      expect(['sensitive-gated', 'internal-forbidden']).toContain(policy?.exposure);
    }
  });

  it('covers current result-summary fact and count vocabulary without duplicates', () => {
    expect(new Set(SURFACE_RESULT_SUMMARY_VOCABULARY.map((entry) => entry.id)).size).toBe(
      SURFACE_RESULT_SUMMARY_VOCABULARY.length,
    );
    for (const factId of SURFACE_RESULT_SUMMARY_FACT_VOCABULARY_IDS) {
      expect(getSurfaceResultSummaryVocabularyEntry(factId)).toMatchObject({
        kind: 'fact',
        exposure: 'user-visible-result',
      });
    }
    for (const countId of SURFACE_RESULT_SUMMARY_COUNT_VOCABULARY_IDS) {
      expect(getSurfaceResultSummaryVocabularyEntry(countId)).toMatchObject({
        kind: 'count',
        exposure: 'user-visible-result',
      });
    }
    expect(getSurfaceResultSummaryVocabularyEntry('warning.text')).toMatchObject({
      kind: 'warning',
      exposure: 'user-visible-result',
    });
  });

  it('returns defensive copies of registry entries', () => {
    const fieldPolicy = listSurfaceFieldPolicies()[0];
    fieldPolicy.description = 'mutated';
    expect(listSurfaceFieldPolicies()[0].description).not.toBe('mutated');

    const vocabularyEntry = listSurfaceResultSummaryVocabulary()[0];
    vocabularyEntry.description = 'mutated';
    expect(listSurfaceResultSummaryVocabulary()[0].description).not.toBe('mutated');
  });

  it('does not add policy metadata to Surface DTO responses', () => {
    const response = querySurfaceSnapshot({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind: 'equation',
      queryKind: 'workspaceInfo',
    });
    const serialized = JSON.stringify(response);

    expect(serialized).not.toContain('exposure');
    expect(serialized).not.toContain('disposition');
    expect(serialized).not.toContain('policy');
  });
});
