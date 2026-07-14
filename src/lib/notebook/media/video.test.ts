import { describe, expect, it } from 'vitest';

import {
  inspectNotebookVideoHeader,
  NOTEBOOK_VIDEO_WARNING_BYTES,
  validateNotebookWebVtt,
} from './video';

const mp4 = () => new Uint8Array([
  0, 0, 0, 24,
  0x66, 0x74, 0x79, 0x70,
  0x69, 0x73, 0x6f, 0x6d,
]);
const webm = () => new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f]);

describe('Notebook local video validation', () => {
  it('sniffs MP4 and WebM without trusting the declared media type', () => {
    expect(inspectNotebookVideoHeader(mp4(), 12, 'video/mp4').mimeType).toBe('video/mp4');
    expect(inspectNotebookVideoHeader(webm(), 5, 'video/webm').mimeType).toBe('video/webm');
    expect(() => inspectNotebookVideoHeader(mp4(), 12, 'video/webm'))
      .toThrow('does not match');
    expect(() => inspectNotebookVideoHeader(new Uint8Array([1, 2, 3, 4]), 4))
      .toThrow('supported MP4 or WebM');
  });

  it('warns rather than rejects above 500 MiB', () => {
    expect(inspectNotebookVideoHeader(mp4(), NOTEBOOK_VIDEO_WARNING_BYTES + 1).warnings)
      .toEqual(['large-video-file']);
  });

  it('accepts bounded UTF-8 WebVTT and rejects malformed tracks', () => {
    const valid = new TextEncoder().encode('WEBVTT\n\n00:00.000 --> 00:01.000\nHello');
    expect(validateNotebookWebVtt(valid)).toContain('Hello');
    expect(() => validateNotebookWebVtt(new TextEncoder().encode('captions')))
      .toThrow('header');
    expect(() => validateNotebookWebVtt(new Uint8Array([0xff, 0xfe])))
      .toThrow('UTF-8');
  });
});
