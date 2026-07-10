import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../types/calculator';
import {
  buildHistoryReplaySnapshot,
  classifyHistoryReplayEntry,
} from './replay-snapshot';

describe('History replay snapshots', () => {
  it('copies only deterministic launch-time settings and Ans', () => {
    expect(buildHistoryReplaySnapshot(DEFAULT_SETTINGS, '7')).toEqual({
      version: 1,
      ansLatex: '7',
      angleUnit: DEFAULT_SETTINGS.angleUnit,
      outputStyle: DEFAULT_SETTINGS.outputStyle,
      equationAnswerMode: DEFAULT_SETTINGS.equationAnswerMode,
      equationDomainIntent: DEFAULT_SETTINGS.equationDomainIntent,
      complexExactForm: DEFAULT_SETTINGS.complexExactForm,
      mathNotationDisplay: DEFAULT_SETTINGS.mathNotationDisplay,
      historyInspectorNotationMode: DEFAULT_SETTINGS.historyInspectorNotationMode,
      historyPageNotationMode: DEFAULT_SETTINGS.historyPageNotationMode,
      symbolicDisplayMode: DEFAULT_SETTINGS.symbolicDisplayMode,
      flattenNestedRootsWhenSafe: DEFAULT_SETTINGS.flattenNestedRootsWhenSafe,
      approxDigits: DEFAULT_SETTINGS.approxDigits,
      numericNotationMode: DEFAULT_SETTINGS.numericNotationMode,
      scientificNotationStyle: DEFAULT_SETTINGS.scientificNotationStyle,
      detailedFactsEnabled: DEFAULT_SETTINGS.detailedFactsEnabled,
    });
  });

  it('classifies snapshot-less history without guessing old settings', () => {
    expect(classifyHistoryReplayEntry({})).toBe('legacy-nondeterministic');
    expect(classifyHistoryReplayEntry({
      replaySnapshot: buildHistoryReplaySnapshot(DEFAULT_SETTINGS, '0'),
    })).toBe('versioned-deterministic');
  });
});
