import { isBlankRow, parseRow, type ParsedRow } from './parse';

/**
 * New Equation rows are read off the main thread. Compute Engine's error recovery on an unfinished nested row can
 * take seconds to minutes, so the page never parses during render or typing.
 * - Each row text is read once and cached by its LaTeX.
 * - Pages say which rows they want now. A read that no page wants any more (the row was edited) is abandoned by
 *   terminating the worker, so typing never waits on an old read. A wanted row is never timed out: it reads until
 *   it finishes or is edited.
 * - Without Worker support (tests, non-browser hosts) rows are read synchronously.
 */
export type RowReaderWorkerFactory = () => Worker | undefined;
const workerFactory: RowReaderWorkerFactory = () =>
  (typeof Worker === 'undefined' ? undefined : new Worker(new URL('./row-reader.worker.ts', import.meta.url), { type: 'module' }));

const EMPTY: ParsedRow = { kind: 'empty' };
const UNREADABLE: ParsedRow = { kind: 'error', message: 'This row could not be read.' };
/** Cached row texts kept (oldest dropped first); a dropped row is simply read again. */
const CACHE_ENTRIES = 512;

export class RowReader {
  private readonly cache = new Map<string, ParsedRow>();
  private readonly wanted = new Map<string, Set<string>>();
  private readonly listeners = new Set<() => void>();
  private queue: string[] = [];
  private inFlight: string | undefined;
  private worker: Worker | undefined;
  private synchronous: boolean | undefined;
  private readonly createWorker: RowReaderWorkerFactory;

  constructor(createWorker: RowReaderWorkerFactory = workerFactory) {
    this.createWorker = createWorker;
  }

  /** The row's reading when known (blank rows always are); undefined while it is being read. */
  peek(latex: string): ParsedRow | undefined {
    if (isBlankRow(latex)) return EMPTY;
    const hit = this.cache.get(latex);
    if (hit) return hit;
    if (!this.workerAvailable()) return this.store(latex, parseRow(latex));
    return undefined;
  }

  /** Rows `owner` (a tab) needs now; reads the unknown ones and abandons reads no owner needs. */
  want(owner: string, rows: readonly string[]): void {
    this.wanted.set(owner, new Set(rows.filter(r => this.peek(r) === undefined)));
    this.schedule();
  }

  release(owner: string): void {
    this.wanted.delete(owner);
    this.schedule();
  }

  /** Every row's reading, waiting for the ones being read (for Solve pressed right after typing). */
  read(owner: string, rows: readonly string[], signal: AbortSignal): Promise<ParsedRow[]> {
    this.want(owner, rows);
    return new Promise((resolve, reject) => {
      const check = () => {
        if (signal.aborted) { done(); reject(new DOMException('Reading stopped', 'AbortError')); return; }
        const out = rows.map(r => this.peek(r));
        if (out.every(r => r !== undefined)) { done(); resolve(out as ParsedRow[]); }
      };
      const unsubscribe = this.subscribe(check);
      const done = () => { unsubscribe(); signal.removeEventListener('abort', check); };
      signal.addEventListener('abort', check);
      check();
    });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private workerAvailable(): boolean {
    if (this.synchronous === undefined) {
      this.worker = this.createWorker();
      this.synchronous = this.worker === undefined;
      if (this.worker) this.attach(this.worker);
    }
    return !this.synchronous;
  }

  private store(latex: string, row: ParsedRow): ParsedRow {
    this.cache.delete(latex);
    this.cache.set(latex, row);
    while (this.cache.size > CACHE_ENTRIES) this.cache.delete(this.cache.keys().next().value as string);
    return row;
  }

  private schedule(): void {
    const all = new Set<string>();
    for (const rows of this.wanted.values()) for (const r of rows) if (!this.cache.has(r)) all.add(r);
    if (this.inFlight !== undefined && !all.has(this.inFlight)) this.restart();
    this.queue = [...all].filter(r => r !== this.inFlight);
    this.pump();
  }

  private restart(): void {
    this.worker?.terminate();
    this.worker = this.createWorker();
    if (this.worker) this.attach(this.worker);
    this.inFlight = undefined;
  }

  private attach(worker: Worker): void {
    worker.onmessage = (event: MessageEvent<{ latex: string; row: ParsedRow }>) => {
      if (worker !== this.worker || event.data.latex !== this.inFlight) return;
      this.settle(event.data.latex, event.data.row);
    };
    worker.onerror = () => {
      if (worker !== this.worker || this.inFlight === undefined) return;
      const latex = this.inFlight;
      this.restart();
      this.settle(latex, UNREADABLE);
    };
  }

  private settle(latex: string, row: ParsedRow): void {
    this.store(latex, row);
    this.inFlight = undefined;
    this.queue = this.queue.filter(r => r !== latex);
    this.pump();
    for (const listener of [...this.listeners]) listener();
  }

  private pump(): void {
    if (this.inFlight !== undefined || !this.worker) return;
    const next = this.queue.shift();
    if (next === undefined) return;
    this.inFlight = next;
    this.worker.postMessage(next);
  }
}

/** The app's reader: one worker shared by every New Equation tab. */
export const rowReader = new RowReader();
