import { afterEach, describe, expect, it, vi } from 'vitest';
import { acknowledgeResultCleanupNotice, rememberResultCleanup } from './result-cleanup-notice';

const KEY = 'rezanova.result-cleanup-notice.v1';

function freshStorage() {
  const values = new Map<string, string>();
  const store = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
  vi.stubGlobal('window', {localStorage: store});
  return store;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('result cleanup notification receipt', () => {
  it('survives duplicate startup reads until the active UI acknowledges it', () => {
    const store = freshStorage();
    expect(rememberResultCleanup('history', 2)).toBe(2);
    expect(rememberResultCleanup('memory', 1)).toBe(1);
    expect(rememberResultCleanup('history', 0)).toBe(2);
    expect(rememberResultCleanup('memory', 0)).toBe(1);
    expect(JSON.parse(store.getItem(KEY)!)).toEqual({history: 2, memory: 1});
    acknowledgeResultCleanupNotice();
    expect(store.getItem(KEY)).toBeNull();
    expect(rememberResultCleanup('history', 0)).toBe(0);
    expect(rememberResultCleanup('memory', 0)).toBe(0);
  });

  it('restores an unacknowledged receipt without treating malformed counts as removals', () => {
    const store = freshStorage();
    store.setItem(KEY, JSON.stringify({history: 3, memory: -1}));
    expect(rememberResultCleanup('history', 0)).toBe(3);
    expect(rememberResultCleanup('memory', 0)).toBe(0);
    acknowledgeResultCleanupNotice();
    store.setItem(KEY, JSON.stringify({history: '99', memory: 0.5}));
    expect(rememberResultCleanup('history', 0)).toBe(0);
    expect(rememberResultCleanup('memory', 0)).toBe(0);
  });

  it('retains the notice in the session when notification storage is unavailable', () => {
    const store = freshStorage();
    store.setItem.mockImplementation(() => { throw Error('Unavailable'); });
    expect(rememberResultCleanup('memory', 4)).toBe(4);
    expect(rememberResultCleanup('memory', 0)).toBe(4);
    acknowledgeResultCleanupNotice();
    expect(rememberResultCleanup('memory', 0)).toBe(0);
  });

  it('does not carry pending counts into another storage instance', () => {
    freshStorage();
    rememberResultCleanup('history', 5);
    freshStorage();
    expect(rememberResultCleanup('history', 0)).toBe(0);
  });
});
