import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SURFACE_CONTRACT_CURRENT_RESULT_FIXTURE,
  SURFACE_CONTRACT_FAILURE_FIXTURE,
  SURFACE_CONTRACT_LIFECYCLE_EVENT_FIXTURE,
  SURFACE_CONTRACT_MANIFEST_FIXTURE,
  SURFACE_CONTRACT_SAFE_SETTINGS_FIXTURE,
} from './fixtures';

const contractDoc = readFileSync(
  new URL('../../../docs/architecture/surface-protocol/hostless-v1-contract.md', import.meta.url),
  'utf8',
);

const boundaryAudit = readFileSync(
  new URL('../../../docs/architecture/surface-protocol/surface-protocol-boundary-audit.md', import.meta.url),
  'utf8',
);

function jsonBlock(value: unknown): string {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

describe('Surface Protocol spec examples', () => {
  it('keeps the internal-agent contract examples aligned with fixtures', () => {
    for (const fixture of [
      SURFACE_CONTRACT_MANIFEST_FIXTURE,
      SURFACE_CONTRACT_CURRENT_RESULT_FIXTURE,
      SURFACE_CONTRACT_SAFE_SETTINGS_FIXTURE,
      SURFACE_CONTRACT_LIFECYCLE_EVENT_FIXTURE,
      SURFACE_CONTRACT_FAILURE_FIXTURE,
    ]) {
      expect(contractDoc).toContain(jsonBlock(fixture));
    }
  });

  it('keeps the boundary audit current with the landed hostless spine', () => {
    expect(boundaryAudit).toContain('Status: hostless spine landed');
    expect(boundaryAudit).toContain('Surface Protocol now exists as hostless infrastructure');
    expect(boundaryAudit).toContain('Model Context Protocol adapter');
    expect(boundaryAudit).toContain('Event/query pagination and cursors remain deferred');
    expect(boundaryAudit).not.toContain('Surface Protocol does not exist yet');
  });
});
