import type { NotebookDocument } from '../types';
import { migrateNotebookDocumentV1 } from './migrate-v1';
import { migrateNotebookDocumentV2 } from './migrate-v2';
import { migrateNotebookDocumentV3 } from './migrate-v3';
import { migrateNotebookDocumentV4 } from './migrate-v4';
import { migrateNotebookDocumentV5 } from './migrate-v5';
import { migrateNotebookDocumentV6 } from './migrate-v6';
import { migrateNotebookDocumentV7 } from './migrate-v7';
import { migrateNotebookDocumentV8 } from './migrate-v8';
import {
  isNotebookRichDocument,
  isNotebookRichDocumentV2,
  isNotebookRichDocumentV3,
  isNotebookRichDocumentV4,
  isNotebookRichDocumentV5,
  isNotebookRichDocumentV6,
  isNotebookRichDocumentV7,
  isNotebookRichDocumentV8,
} from './model';
import type { NotebookRichDocument } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isNotebookDocumentV1(value: unknown): value is NotebookDocument {
  return isRecord(value)
    && value.version === 1
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && Array.isArray(value.blocks);
}

export function migrateNotebookRichDocument(
  value: unknown,
): NotebookRichDocument | null {
  if (isNotebookRichDocument(value)) return value;
  if (isNotebookDocumentV1(value)) return migrateNotebookDocumentV1(value);
  if (isNotebookRichDocumentV2(value)) return migrateNotebookDocumentV2(value);
  if (isNotebookRichDocumentV3(value)) return migrateNotebookDocumentV3(value);
  if (isNotebookRichDocumentV4(value)) return migrateNotebookDocumentV4(value);
  if (isNotebookRichDocumentV5(value)) return migrateNotebookDocumentV5(value);
  if (isNotebookRichDocumentV6(value)) return migrateNotebookDocumentV6(value);
  if (isNotebookRichDocumentV7(value)) return migrateNotebookDocumentV7(value);
  if (isNotebookRichDocumentV8(value)) return migrateNotebookDocumentV8(value);
  return null;
}
