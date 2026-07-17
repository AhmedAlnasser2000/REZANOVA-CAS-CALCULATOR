import { describe, expect, it } from 'vitest';
import { appBootstrapSchema, settingsSchema } from './schemas';
import { DEFAULT_SETTINGS } from '../../types/calculator';
import { DEFAULT_LANGUAGE_CODE } from '../language';

describe('settings schema', () => {
  it('applies defaults for new SX1 fields when parsing an older payload', () => {
    const parsed = settingsSchema.parse({
      angleUnit: 'deg',
      outputStyle: 'both',
      historyEnabled: true,
      autoSwitchToEquation: false,
    });

    expect(parsed).toEqual(DEFAULT_SETTINGS);
  });

  it('preserves an explicit full SX1 payload', () => {
    const parsed = settingsSchema.parse({
      languageCode: 'en',
      angleUnit: 'rad',
      outputStyle: 'exact',
      equationAnswerMode: 'isolate',
      equationDomainIntent: 'complex',
      complexExactForm: 'polar',
      mathNotationDisplay: 'latex',
      historyInspectorNotationMode: 'plainText',
      historyPageNotationMode: 'rendered',
      historyEnabled: false,
      autoSwitchToEquation: true,
      uiScale: 130,
      mathScale: 115,
      resultScale: 145,
      highContrast: true,
      symbolicDisplayMode: 'powers',
      flattenNestedRootsWhenSafe: false,
      approxDigits: 12,
      numericNotationMode: 'scientific',
      scientificNotationStyle: 'e',
      detailedFactsEnabled: true,
    });

    expect(parsed.languageCode).toBe(DEFAULT_LANGUAGE_CODE);
    expect(parsed.uiScale).toBe(130);
    expect(parsed.mathScale).toBe(115);
    expect(parsed.resultScale).toBe(145);
    expect(parsed.highContrast).toBe(true);
    expect(parsed.equationAnswerMode).toBe('isolate');
    expect(parsed.equationDomainIntent).toBe('complex');
    expect(parsed.complexExactForm).toBe('polar');
    expect(parsed.mathNotationDisplay).toBe('latex');
    expect(parsed.historyInspectorNotationMode).toBe('plainText');
    expect(parsed.historyPageNotationMode).toBe('rendered');
    expect(parsed.symbolicDisplayMode).toBe('powers');
    expect(parsed.flattenNestedRootsWhenSafe).toBe(false);
    expect(parsed.approxDigits).toBe(12);
    expect(parsed.numericNotationMode).toBe('scientific');
    expect(parsed.scientificNotationStyle).toBe('e');
    expect(parsed.detailedFactsEnabled).toBe(true);
  });

  it('falls back to English for invalid persisted language codes', () => {
    const parsed = settingsSchema.parse({
      languageCode: 'ar',
      angleUnit: 'deg',
      outputStyle: 'both',
      historyEnabled: true,
      autoSwitchToEquation: false,
    });

    expect(parsed.languageCode).toBe(DEFAULT_LANGUAGE_CODE);
  });

  it('coerces legacy Approx Equation answer mode settings to Exact', () => {
    const parsed = settingsSchema.parse({
      angleUnit: 'deg',
      outputStyle: 'both',
      historyEnabled: true,
      autoSwitchToEquation: false,
      equationAnswerMode: 'approximate',
    });

    expect(parsed.equationAnswerMode).toBe('exact');
  });

  it('defaults calculator memory settings and clamps interval to at least 20 seconds', () => {
    const parsed = settingsSchema.parse({
      angleUnit: 'deg',
      outputStyle: 'both',
      historyEnabled: true,
      autoSwitchToEquation: false,
      calculatorMemoryAutosaveIntervalSeconds: 5,
    });

    expect(parsed.calculatorMemoryEnabled).toBe(true);
    expect(parsed.calculatorMemoryAutosaveMode).toBe('settled');
    expect(parsed.calculatorMemoryAutosaveIntervalSeconds).toBe(20);
  });

  it('defaults and validates Notebook preferences', () => {
    const defaulted = settingsSchema.parse({
      angleUnit: 'deg',
      outputStyle: 'both',
      historyEnabled: true,
      autoSwitchToEquation: false,
      notebook: {
        authoring: {
          defaultObjectPlacement: 'floating',
          defaultObjectWidthPt: 5_000,
          gridStepPt: 18,
          textDistancePt: -10,
        },
        savingHistory: {
          autosaveSeconds: 1.5,
          periodicVersionMinutes: 15,
          retainedVersions: 100,
          retentionDays: 90,
        },
      },
    });

    expect(defaulted.notebook.authoring.defaultObjectPlacement).toBe('floating');
    expect(defaulted.notebook.authoring.defaultObjectWidthPt).toBe(720);
    expect(defaulted.notebook.authoring.gridStepPt).toBe(18);
    expect(defaulted.notebook.authoring.textDistancePt).toBe(0);
    expect(defaulted.notebook.images.defaultAlignment).toBe('center');
    expect(defaulted.notebook.savingHistory.autosaveSeconds).toBe(1.5);
    expect(defaulted.notebook.savingHistory.periodicVersionMinutes).toBe(15);
    expect(defaulted.notebook.savingHistory.retainedVersions).toBe(100);
    expect(defaulted.notebook.savingHistory.retentionDays).toBe(90);

    expect(() => settingsSchema.parse({
      angleUnit: 'deg',
      outputStyle: 'both',
      historyEnabled: true,
      notebook: {
        savingHistory: {
          autosaveSeconds: 2,
        },
      },
    })).toThrow();
  });

  it('preserves explicit complex exact display forms', () => {
    expect(settingsSchema.parse({
      angleUnit: 'deg',
      outputStyle: 'both',
      historyEnabled: true,
      autoSwitchToEquation: false,
      complexExactForm: 'cis',
    }).complexExactForm).toBe('cis');
  });

  it('clamps approximate digits into the supported range', () => {
    const parsed = settingsSchema.parse({
      angleUnit: 'deg',
      outputStyle: 'both',
      historyEnabled: true,
      autoSwitchToEquation: false,
      approxDigits: 24,
    });

    expect(parsed.approxDigits).toBe(20);
  });

  it('defaults missing variable memory in older bootstrap payloads', () => {
    const parsed = appBootstrapSchema.parse({
      currentMode: 'calculate',
      settings: DEFAULT_SETTINGS,
      modeTree: [],
      historyCount: 0,
      version: 'legacy',
    });

    expect(parsed.variableMemory).toEqual([]);
  });
});
