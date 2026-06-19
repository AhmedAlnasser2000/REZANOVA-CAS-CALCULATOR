export {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES,
  type CommonLanguageCatalog,
  type DisplayLanguageCatalog,
  type LanguageCatalog,
  type LanguageCode,
  type LanguageDirection,
  type LanguageMetadata,
  type LanguageStringFactory,
  type ShellLanguageCatalog,
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
