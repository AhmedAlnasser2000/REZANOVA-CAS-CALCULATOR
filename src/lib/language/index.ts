export {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES,
  type CommonLanguageCatalog,
  type DisplayLanguageCatalog,
  type HistoryLanguageCatalog,
  type LanguageCatalog,
  type LanguageCode,
  type LanguageDirection,
  type LanguageMetadata,
  type LanguageStringFactory,
  type SettingsLanguageCatalog,
  type ShellLanguageCatalog,
  type VariablesLanguageCatalog,
} from './types';
export {
  LANGUAGE_REGISTRY,
  getDefaultLanguageMetadata,
  getLanguageCatalog,
  getLanguageMetadata,
  isSupportedLanguageCode,
  listLanguageMetadata,
  resolveLanguageCode,
  type LanguageRegistry,
} from './registry';
export {
  getLanguageCatalogValidationIssues,
  validateLanguageCatalog,
} from './validation';
