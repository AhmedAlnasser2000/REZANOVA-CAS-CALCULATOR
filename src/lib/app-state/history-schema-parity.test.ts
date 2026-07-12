import { describe, expect, it } from 'vitest';
import type { HistoryEntry } from '../../types/calculator';
import { hasValidHistoryResultDocument, historyEntrySchema } from './schemas';

const HISTORY_ENTRY_FIELDS = [
  'id',
  'mode',
  'inputLatex',
  'resolvedInputLatex',
  'resultLatex',
  'exactSupplementLatex',
  'approxText',
  'detailSections',
  'systemReadback',
  'calculateScreen',
  'calculateSeed',
  'calculusScreen',
  'calculusSeed',
  'geometryScreen',
  'geometrySeed',
  'trigScreen',
  'trigSeed',
  'statisticsScreen',
  'statisticsSeed',
  'matrixSeed',
  'vectorSeed',
  'equationScreen',
  'equationSeed',
  'equationSolveTarget',
  'equationAnswerMode',
  'equationDomainIntent',
  'complexExactForm',
  'answerDomain',
  'solutionKind',
  'numericInterval',
  'variableSubstitutions',
  'historyLaunchOrder',
  'runtimeElapsedMs',
  'replaySnapshot',
  'resultDocument',
  'resultDocumentOmissionReason',
  'timestamp',
] as const satisfies readonly (keyof HistoryEntry)[];

type MissingHistoryEntryField = Exclude<keyof HistoryEntry, (typeof HISTORY_ENTRY_FIELDS)[number]>;
type ExtraHistoryEntryField = Exclude<(typeof HISTORY_ENTRY_FIELDS)[number], keyof HistoryEntry>;
const HISTORY_ENTRY_FIELD_PARITY: [MissingHistoryEntryField, ExtraHistoryEntryField] extends [never, never]
  ? true
  : never = true;

describe('HistoryEntry persistence parity', () => {
  it('ratchets exact HistoryEntry field parity', () => {
    expect(HISTORY_ENTRY_FIELD_PARITY).toBe(true);
    expect([...historyEntrySchema.keyof().options].sort()).toEqual([...HISTORY_ENTRY_FIELDS].sort());
  });

  it('accepts complete Equation replay and system readback context', () => {
    const parsed = historyEntrySchema.parse({
      id: 'equation-system-replay-1',
      mode: 'equation',
      inputLatex: 'x+y=3, x-y=-1',
      resultLatex: '(x,y)=(1,2)',
      systemReadback: {
        variablesLatex: ['x', 'y'],
        rows: [{ valuesLatex: ['1', '2'], approxText: '(1.0, 2.0)' }],
        label: 'Solution',
        source: 'linear-system',
      },
      equationScreen: 'symbolic',
      equationSeed: {
        screen: 'symbolic',
        equationLatex: 'x+y=3, x-y=-1',
        equationSolveTarget: 'x',
        numericInterval: { start: '-10', end: '10', subdivisions: 40 },
        complexRegion: {
          reMin: '-2',
          reMax: '2',
          imMin: '-2',
          imMax: '2',
          gridSize: 9,
        },
      },
      timestamp: '2026-07-11T00:00:00.000Z',
    });

    expect(parsed.systemReadback?.rows[0]?.valuesLatex).toEqual(['1', '2']);
    expect(parsed.equationScreen).toBe('symbolic');
    expect(parsed.equationSeed).toMatchObject({
      screen: 'symbolic',
      equationSolveTarget: 'x',
    });
  });

  it('preserves validated future extension fields without interpreting them', () => {
    const parsed = historyEntrySchema.parse({
      id: 'future-extension-1',
      mode: 'calculate',
      inputLatex: '2+2',
      resultLatex: '4',
      futureHistoryExtension: {
        version: 2,
        payload: ['kept', 'verbatim'],
      },
      timestamp: '2026-07-11T00:00:00.000Z',
    });

    expect(parsed.futureHistoryExtension).toEqual({
      version: 2,
      payload: ['kept', 'verbatim'],
    });
  });

  it('accepts valid success documents while leaving malformed extensions loadable for legacy fallback', () => {
    const valid = historyEntrySchema.parse({
      id: 'structured-result-1',
      mode: 'calculate',
      inputLatex: '2+2',
      resultLatex: '4',
      resultDocument: {
        version: 1,
        outcomeKind: 'success',
        title: 'Calculate',
        primaryMath: { canonicalLatex: '4', mathJson: 4 },
        warnings: [],
      },
      timestamp: '2026-07-12T00:00:00.000Z',
    });
    expect(hasValidHistoryResultDocument(valid)).toBe(true);

    const malformed = historyEntrySchema.parse({
      id: 'structured-result-malformed',
      mode: 'calculate',
      inputLatex: '2+2',
      resultLatex: '4',
      resultDocument: { version: 2, title: 'Future shape' },
      timestamp: '2026-07-12T00:00:00.000Z',
    });
    expect(malformed.resultDocument).toEqual({ version: 2, title: 'Future shape' });
    expect(hasValidHistoryResultDocument(malformed)).toBe(false);
  });
});
