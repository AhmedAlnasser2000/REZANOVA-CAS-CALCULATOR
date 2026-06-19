import { englishLanguage, englishLanguageMetadata } from './languages/en';
import { validateLanguageCatalog } from './validation';
import {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES,
  type LanguageCatalog,
  type LanguageCode,
  type LanguageMetadata,
} from './types';

export type LanguageRegistry = Partial<Record<string, unknown>>;

export const LANGUAGE_REGISTRY = {
  [DEFAULT_LANGUAGE_CODE]: englishLanguage,
} satisfies Record<LanguageCode, LanguageCatalog>;

export function isSupportedLanguageCode(value: unknown): value is LanguageCode {
  return (
    typeof value === 'string'
    && (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(value)
  );
}

export function resolveLanguageCode(value: unknown): LanguageCode {
  return isSupportedLanguageCode(value) ? value : DEFAULT_LANGUAGE_CODE;
}

export function getLanguageCatalog(
  languageCode?: unknown,
  registry: LanguageRegistry = LANGUAGE_REGISTRY,
): LanguageCatalog {
  const resolvedCode = resolveLanguageCode(languageCode);
  const candidate = registry[resolvedCode];

  return validateLanguageCatalog(candidate) ? candidate : englishLanguage;
}

export function getLanguageMetadata(
  languageCode?: unknown,
  registry: LanguageRegistry = LANGUAGE_REGISTRY,
): LanguageMetadata {
  const catalog = getLanguageCatalog(languageCode, registry);
  return catalog.metadata;
}

export function listLanguageMetadata(
  registry: LanguageRegistry = LANGUAGE_REGISTRY,
): LanguageMetadata[] {
  return SUPPORTED_LANGUAGE_CODES.map((code) => getLanguageMetadata(code, registry));
}

export function getDefaultLanguageMetadata(): LanguageMetadata {
  return englishLanguageMetadata;
}
