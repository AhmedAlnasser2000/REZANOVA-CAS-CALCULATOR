import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type CalculatorMemorySnapshot, type HistoryEntry } from '../../types/calculator';
import {
  WEB_PREVIEW_APP_STATE_STORAGE_KEY,
  appendHistoryEntry,
  bootApp,
  clearCalculatorMemorySnapshot,
  clearHistoryEntries,
  deleteHistoryEntry,
  loadCalculatorMemorySnapshot,
  loadHistoryEntries,
  persistCalculatorMemorySnapshot,
  persistMode,
  persistSettings,
  persistVariableMemory,
} from './tauri';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

function createHistoryEntry(id: string): HistoryEntry {
  return {
    id,
    mode: 'calculate',
    inputLatex: `${id}+1`,
    resultLatex: `${id}+1`,
    timestamp: `2026-05-25T00:00:${id.padStart(2, '0')}Z`,
  };
}

describe('web-preview app-state persistence', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('window', {
      localStorage: storage,
    });
  });

  it('persists mode, settings, history, variables, and calculator memory', async () => {
    await persistMode('equation');
    const settings = await persistSettings({
      languageCode: 'en',
      angleUnit: 'rad',
      equationDomainIntent: 'complex',
      complexExactForm: 'cis',
      calculatorMemoryAutosaveMode: 'interval',
      calculatorMemoryAutosaveIntervalSeconds: 5,
    });
    await appendHistoryEntry(createHistoryEntry('1'));
    await persistVariableMemory([{ name: 'a', valueLatex: '5', numericValue: 5 }]);

    const snapshot: CalculatorMemorySnapshot = {
      version: 1,
      savedAt: '2026-05-25T00:00:00Z',
      currentMode: 'equation',
      previousNonGuideMode: 'equation',
      settings,
      history: [createHistoryEntry('1')],
      variableMemory: [{ name: 'a', valueLatex: '5', numericValue: 5 }],
      ansLatex: '6',
      displayOutcome: { kind: 'success', title: 'Result', warnings: [], exactLatex: '6' },
      session: { equation: { latex: 'x+1=2', screen: 'symbolic' } },
    };
    await persistCalculatorMemorySnapshot(snapshot);

    expect(await bootApp()).toMatchObject({
      currentMode: 'equation',
      historyCount: 1,
      variableMemory: [{ name: 'a', valueLatex: '5', numericValue: 5 }],
    });
    expect((await bootApp()).settings.calculatorMemoryAutosaveIntervalSeconds).toBe(20);
    expect((await bootApp()).settings.languageCode).toBe('en');
    expect((await bootApp()).settings.equationDomainIntent).toBe('complex');
    expect((await bootApp()).settings.complexExactForm).toBe('cis');
    expect(await loadHistoryEntries()).toHaveLength(1);
    expect(await loadCalculatorMemorySnapshot()).toMatchObject({
      ansLatex: '6',
      currentMode: 'calculate',
      displayOutcome: null,
      session: {},
    });
  });

  it('trims and clears persisted history', async () => {
    for (let index = 0; index < 85; index += 1) {
      await appendHistoryEntry(createHistoryEntry(`${index}`));
    }

    const entries = await loadHistoryEntries();
    expect(entries).toHaveLength(80);
    expect(entries[0].id).toBe('5');

    await clearHistoryEntries();
    expect(await loadHistoryEntries()).toEqual([]);
  });

  it('deletes one persisted history entry by id', async () => {
    await appendHistoryEntry(createHistoryEntry('1'));
    await appendHistoryEntry(createHistoryEntry('2'));

    await deleteHistoryEntry('1');

    expect(await loadHistoryEntries()).toEqual([createHistoryEntry('2')]);
  });

  it('drops invalid history rows and survives corrupt state', async () => {
    storage.setItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY, JSON.stringify({
      currentMode: 'calculate',
      settings: DEFAULT_SETTINGS,
      history: [createHistoryEntry('1'), { id: 'bad' }],
      variableMemory: [],
      calculatorMemory: {
        version: 1,
        savedAt: '2026-05-25T00:00:00Z',
        currentMode: 'calculate',
        settings: DEFAULT_SETTINGS,
        history: [
          createHistoryEntry('1'),
          { id: 'legacy-null-optionals', mode: 'calculate', inputLatex: '2+2', resultLatex: null },
        ],
        variableMemory: [],
        ansLatex: '4',
        session: { calculate: { latex: '2+2' } },
      },
    }));

    expect(await loadHistoryEntries()).toEqual([createHistoryEntry('1')]);
    expect(await loadCalculatorMemorySnapshot()).toMatchObject({
      ansLatex: '4',
      history: [createHistoryEntry('1')],
      displayOutcome: null,
      session: {},
    });

    storage.setItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY, '{bad json');
    expect(await bootApp()).toMatchObject({
      currentMode: 'calculate',
      historyCount: 0,
      variableMemory: [],
    });
  });

  it('clears calculator memory without clearing settings or history', async () => {
    await persistSettings({ angleUnit: 'grad' });
    await appendHistoryEntry(createHistoryEntry('1'));
    await persistCalculatorMemorySnapshot({
      version: 1,
      savedAt: '2026-05-25T00:00:00Z',
      currentMode: 'calculate',
      settings: { ...DEFAULT_SETTINGS, angleUnit: 'grad' },
      history: [createHistoryEntry('1')],
      variableMemory: [],
      ansLatex: '2',
      session: { calculate: { latex: '1+1' } },
    });

    await clearCalculatorMemorySnapshot();

    expect(await loadCalculatorMemorySnapshot()).toBeNull();
    expect((await bootApp()).settings.angleUnit).toBe('grad');
    expect(await loadHistoryEntries()).toHaveLength(1);
  });
});
