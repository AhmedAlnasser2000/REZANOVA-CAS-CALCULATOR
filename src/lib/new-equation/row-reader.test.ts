import { describe, expect, it } from 'vitest';
import { parseRow } from './parse';
import { RowReader } from './row-reader';

/** A worker the test answers by hand; terminated workers ignore late answers like real ones. */
class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: string[] = [];
  terminated = false;
  constructor() { FakeWorker.all.push(this); }
  postMessage(latex: string) { this.posted.push(latex); }
  terminate() { this.terminated = true; }
  answer() {
    const latex = this.posted[this.posted.length - 1];
    if (!this.terminated) this.onmessage?.({ data: { latex, row: parseRow(latex) } } as MessageEvent);
  }
}
const reader = () => { FakeWorker.all = []; return new RowReader(() => new FakeWorker() as unknown as Worker); };

describe('New Equation row reader', () => {
  it('reads off the main thread once per row text, and blank rows without the worker', () => {
    const r = reader();
    expect(r.peek('')).toEqual({ kind: 'empty' });
    expect(r.peek('x=1')).toBeUndefined();
    r.want('tab', ['x=1', '']);
    const [w] = FakeWorker.all;
    expect(w.posted).toEqual(['x=1']);
    w.answer();
    expect(r.peek('x=1')).toMatchObject({ kind: 'relation', symbols: ['x'] });
    r.want('tab', ['x=1']);
    expect(w.posted).toEqual(['x=1']);
  });

  it('abandons a read nobody wants any more by restarting the worker, and never times out a wanted one', () => {
    const r = reader();
    r.want('tab', ['\\left(\\left(x+']);
    const [first] = FakeWorker.all;
    r.want('tab', ['\\left(\\left(x+1']);
    expect(first.terminated).toBe(true);
    const second = FakeWorker.all[1];
    expect(second.posted).toEqual(['\\left(\\left(x+1']);
    first.answer();
    expect(r.peek('\\left(\\left(x+')).toBeUndefined();
    // Another tab's edit does not abandon a read this tab still wants.
    r.want('other', ['y=2']);
    expect(second.terminated).toBe(false);
    second.answer();
    expect(r.peek('\\left(\\left(x+1')).toMatchObject({ kind: 'error' });
    expect(second.posted).toEqual(['\\left(\\left(x+1', 'y=2']);
  });

  it('lets Solve wait for rows still being read, and stops waiting on abort', async () => {
    const r = reader();
    const done = r.read('solve', ['x^2=4', ''], new AbortController().signal);
    FakeWorker.all[0].answer();
    await expect(done).resolves.toMatchObject([{ kind: 'relation' }, { kind: 'empty' }]);
    const abort = new AbortController();
    const waiting = r.read('solve', ['x^3=8'], abort.signal);
    abort.abort();
    await expect(waiting).rejects.toThrow('Reading stopped');
  });

  it('reports a crashed read as unreadable and keeps reading with a fresh worker', () => {
    const r = reader();
    r.want('tab', ['x=1', 'y=2']);
    FakeWorker.all[0].onerror?.({} as ErrorEvent);
    expect(r.peek('x=1')).toEqual({ kind: 'error', message: 'This row could not be read.' });
    expect(FakeWorker.all[1].posted).toEqual(['y=2']);
  });

  it('reads synchronously where workers do not exist', () => {
    const r = new RowReader(() => undefined);
    expect(r.peek('x+1=2')).toMatchObject({ kind: 'relation' });
  });
});
