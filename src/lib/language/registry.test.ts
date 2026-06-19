import { describe, expect, it } from 'vitest';
import { englishLanguage, englishLanguageMetadata } from './languages/en';
import {
  DEFAULT_LANGUAGE_CODE,
  getLanguageCatalog,
  getLanguageMetadata,
  isSupportedLanguageCode,
  listLanguageMetadata,
  resolveLanguageCode,
} from './index';

describe('language registry', () => {
  it('detects supported codes and resolves unknown inputs to English', () => {
    expect(isSupportedLanguageCode('en')).toBe(true);
    expect(isSupportedLanguageCode('ar')).toBe(false);
    expect(isSupportedLanguageCode(null)).toBe(false);

    expect(resolveLanguageCode('en')).toBe('en');
    expect(resolveLanguageCode('ar')).toBe(DEFAULT_LANGUAGE_CODE);
    expect(resolveLanguageCode(undefined)).toBe(DEFAULT_LANGUAGE_CODE);
  });

  it('resolves the English catalog and metadata', () => {
    expect(getLanguageCatalog('en')).toBe(englishLanguage);
    expect(getLanguageMetadata('en')).toEqual(englishLanguageMetadata);
    expect(listLanguageMetadata()).toEqual([englishLanguageMetadata]);
  });

  it('falls back to English for unknown codes and invalid registry entries', () => {
    const invalidRegistry = {
      en: {
        metadata: {
          code: 'en',
          label: 'Broken English',
          direction: 'ltr',
        },
      },
    };

    expect(getLanguageCatalog('missing')).toBe(englishLanguage);
    expect(getLanguageCatalog('en', invalidRegistry)).toBe(englishLanguage);
    expect(getLanguageMetadata('en', invalidRegistry)).toEqual(englishLanguageMetadata);
    expect(listLanguageMetadata(invalidRegistry)).toEqual([englishLanguageMetadata]);
  });

  it('keeps dynamic entries as typed functions for titles and counts', () => {
    expect(englishLanguage.shell.launcher.openEntryInNewTab('Equation')).toBe(
      'Open Equation in new tab',
    );
    expect(englishLanguage.shell.workspaceTabs.closeTab('Equation')).toBe('Close Equation');
    expect(englishLanguage.shell.workspaceTabs.openActionsFor('Calculus')).toBe(
      'Open actions for Calculus',
    );
    expect(englishLanguage.shell.workspaceTabs.otherTabsActiveJobs(1)).toBe(
      '1 other tab has active jobs',
    );
    expect(englishLanguage.shell.workspaceTabs.otherTabsActiveJobs(3)).toBe(
      '3 other tabs have active jobs',
    );
  });
});
