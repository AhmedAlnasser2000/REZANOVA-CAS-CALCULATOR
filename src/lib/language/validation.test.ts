import { describe, expect, it } from 'vitest';
import { englishLanguage } from './languages/en';
import {
  getLanguageCatalogValidationIssues,
  validateLanguageCatalog,
} from './index';

describe('language catalog validation', () => {
  it('accepts the canonical English catalog', () => {
    expect(validateLanguageCatalog(englishLanguage)).toBe(true);
    expect(getLanguageCatalogValidationIssues(englishLanguage)).toEqual([]);
  });

  it('rejects missing catalog surfaces', () => {
    const candidate = {
      ...englishLanguage,
      display: undefined,
    };

    expect(validateLanguageCatalog(candidate)).toBe(false);
    expect(getLanguageCatalogValidationIssues(candidate)).toContain(
      'display must be an object',
    );
  });

  it('rejects invalid metadata direction', () => {
    const candidate = {
      ...englishLanguage,
      metadata: {
        ...englishLanguage.metadata,
        direction: 'sideways',
      },
    };

    expect(validateLanguageCatalog(candidate)).toBe(false);
    expect(getLanguageCatalogValidationIssues(candidate)).toContain(
      'metadata.direction must be ltr or rtl',
    );
  });

  it('rejects missing dynamic string functions', () => {
    const candidate = {
      ...englishLanguage,
      variables: {
        ...englishLanguage.variables,
        messages: {
          ...englishLanguage.variables.messages,
          stored: 'Stored',
        },
      },
    };

    expect(validateLanguageCatalog(candidate)).toBe(false);
    expect(getLanguageCatalogValidationIssues(candidate)).toContain(
      'variables.messages.stored must be a function',
    );
  });
});
