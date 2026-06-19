import { englishLanguage } from './languages/en';
import {
  SUPPORTED_LANGUAGE_CODES,
  type LanguageCatalog,
  type LanguageDirection,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pathName(path: readonly string[]) {
  return path.length > 0 ? path.join('.') : 'catalog';
}

function collectShapeIssues(
  value: unknown,
  reference: unknown,
  path: readonly string[],
  issues: string[],
) {
  if (typeof reference === 'string') {
    if (typeof value !== 'string') {
      issues.push(`${pathName(path)} must be a string`);
    }
    return;
  }

  if (typeof reference === 'function') {
    if (typeof value !== 'function') {
      issues.push(`${pathName(path)} must be a function`);
    }
    return;
  }

  if (!isRecord(reference)) {
    return;
  }

  if (!isRecord(value)) {
    issues.push(`${pathName(path)} must be an object`);
    return;
  }

  for (const key of Object.keys(reference)) {
    collectShapeIssues(value[key], reference[key], [...path, key], issues);
  }
}

function metadataValue(value: unknown, key: string) {
  if (!isRecord(value) || !isRecord(value.metadata)) {
    return undefined;
  }
  return value.metadata[key];
}

function isSupportedDirection(value: unknown): value is LanguageDirection {
  return value === 'ltr' || value === 'rtl';
}

export function getLanguageCatalogValidationIssues(value: unknown): string[] {
  if (!isRecord(value)) {
    return ['catalog must be an object'];
  }

  const issues: string[] = [];
  collectShapeIssues(value, englishLanguage, [], issues);

  const code = metadataValue(value, 'code');
  if (
    typeof code !== 'string'
    || !(SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code)
  ) {
    issues.push('metadata.code must be a supported language code');
  }

  if (!isSupportedDirection(metadataValue(value, 'direction'))) {
    issues.push('metadata.direction must be ltr or rtl');
  }

  return issues;
}

export function validateLanguageCatalog(value: unknown): value is LanguageCatalog {
  return getLanguageCatalogValidationIssues(value).length === 0;
}
