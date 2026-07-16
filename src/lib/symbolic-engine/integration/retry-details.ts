import type { DisplayDetailSection } from '../../../types/calculator';
import {
  integrationDetailSection,
  type IntegrationDetailRow,
} from './detail-readback';

export function normalFormDetail(rows: readonly IntegrationDetailRow[]): DisplayDetailSection {
  return integrationDetailSection('Integration Normal Form', rows);
}

export function trigRewriteDetail(rows: readonly IntegrationDetailRow[]): DisplayDetailSection {
  return integrationDetailSection('Integration Trig Rewrite', rows);
}
