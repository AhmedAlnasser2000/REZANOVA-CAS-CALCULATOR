import { parseRow } from './parse';

/** Reads New Equation rows off the main thread: one row per message, answered with its LaTeX and parse. */
self.onmessage = (event: MessageEvent<string>) => {
  self.postMessage({ latex: event.data, row: parseRow(event.data) });
};
