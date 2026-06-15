import { describe, expect, it } from 'vitest';
import type { HistoryEntry, PendingHistoryTicket } from '../types/calculator';
import { buildHistoryLaunchRows } from './history-launch-rows';

function entry(id: string, order?: number): HistoryEntry {
  return {
    id,
    mode: 'equation',
    inputLatex: `x+${id}=0`,
    resultLatex: `x=-${id}`,
    timestamp: `2026-06-06T00:00:0${id}Z`,
    ...(order !== undefined ? { historyLaunchOrder: order } : {}),
  };
}

function ticket(id: string, order: number): PendingHistoryTicket {
  return {
    id,
    mode: 'table',
    inputLatex: 'x^2',
    capabilityId: 'table.build',
    inputRevisionId: `input.${id}`,
    historyLaunchOrder: order,
    timestamp: `2026-06-06T00:00:${order.toString().padStart(2, '0')}Z`,
    status: 'running',
  };
}

describe('history launch rows', () => {
  it('sorts finalized and pending rows by launch order newest first', () => {
    const rows = buildHistoryLaunchRows(
      [entry('1', 1), entry('2', 4)],
      [ticket('pending', 3)],
    );

    expect(rows.map((row) => row.kind === 'entry' ? row.entry.id : row.ticket.id)).toEqual([
      '2',
      'pending',
      '1',
    ]);
  });
});
