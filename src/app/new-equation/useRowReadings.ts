import { useEffect, useReducer, useState } from 'react';
import type { ParsedRow } from '../../lib/new-equation/parse';
import { rowReader, type RowReader } from '../../lib/new-equation/row-reader';

/** Quiet time after the last keystroke before a changed row is read. */
export const ROW_READ_DEBOUNCE_MS = 250;
const EMPTY: ParsedRow = { kind: 'empty' };

export interface RowReadings {
  /** Each row's reading, or undefined while it is being read. */
  readonly current: readonly (ParsedRow | undefined)[];
  /** Each row's latest reading, the previous one standing in while a row is read (chips and names stay put). */
  readonly settled: readonly ParsedRow[];
  readonly reading: boolean;
}

/**
 * A tab's rows as read by the row reader (off the main thread): nothing is parsed during render, changed rows are
 * read after a short pause in typing, and an edited row abandons its old read.
 */
export function useRowReadings(owner: string, rows: readonly string[], reader: RowReader = rowReader): RowReadings {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [last, setLast] = useState<readonly ParsedRow[]>([]);
  const key = rows.join('\u0000');

  useEffect(() => reader.subscribe(refresh), [reader]);
  useEffect(() => {
    const t = setTimeout(() => reader.want(owner, key.split('\u0000')), ROW_READ_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [reader, owner, key]);
  useEffect(() => () => reader.release(owner), [reader, owner]);

  const current = rows.map(r => reader.peek(r));
  const settled = current.map((r, i) => r ?? last[i] ?? EMPTY);
  // Readings are cached objects, so an unchanged list compares equal entry by entry and this settles at once.
  if (settled.length !== last.length || settled.some((r, i) => r !== last[i])) setLast(settled);
  return { current, settled, reading: current.some(r => r === undefined) };
}
