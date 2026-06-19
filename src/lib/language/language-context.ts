import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { getLanguageCatalog } from './registry';
import {
  DEFAULT_LANGUAGE_CODE,
  type LanguageCatalog,
  type LanguageCode,
  type LanguageDirection,
  type LanguageMetadata,
} from './types';

export type LanguageContextValue = {
  code: LanguageCode;
  metadata: LanguageMetadata;
  direction: LanguageDirection;
  strings: LanguageCatalog;
};

export type LanguageProviderProps = {
  languageCode?: unknown;
  children: ReactNode;
};

function createLanguageContextValue(languageCode: unknown): LanguageContextValue {
  const strings = getLanguageCatalog(languageCode);
  const { metadata } = strings;

  return {
    code: metadata.code,
    metadata,
    direction: metadata.direction,
    strings,
  };
}

const defaultLanguageContextValue = createLanguageContextValue(DEFAULT_LANGUAGE_CODE);

export const languageContext = createContext<LanguageContextValue>(defaultLanguageContextValue);

export function LanguageProvider({
  languageCode = DEFAULT_LANGUAGE_CODE,
  children,
}: LanguageProviderProps) {
  const value = useMemo(() => createLanguageContextValue(languageCode), [languageCode]);

  return createElement(languageContext.Provider, { value }, children);
}

export function useLanguage() {
  return useContext(languageContext);
}
