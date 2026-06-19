import type { LanguageCatalog } from '../../types';
import { englishCommon } from './common';
import { englishDiagnostics } from './diagnostics';
import { englishDisplay } from './display';
import { englishErrors } from './errors';
import { englishGuide } from './guide';
import { englishHistory } from './history';
import { englishLanguageMetadata } from './metadata';
import { englishSettings } from './settings';
import { englishShell } from './shell';
import { englishVariables } from './variables';

export { englishLanguageMetadata };

export const englishLanguage = {
  metadata: englishLanguageMetadata,
  common: englishCommon,
  shell: englishShell,
  display: englishDisplay,
  settings: englishSettings,
  history: englishHistory,
  variables: englishVariables,
  diagnostics: englishDiagnostics,
  guide: englishGuide,
  errors: englishErrors,
} satisfies LanguageCatalog;
