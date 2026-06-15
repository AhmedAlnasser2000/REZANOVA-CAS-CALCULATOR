import { describe, expect, it } from 'vitest';
import {
  buildTrigonometryOoeInputRevisionId,
  parseTrigDraft,
  serializeTrigRequest,
  trigDraftStyle,
  trigRequestToScreen,
  type RunTrigonometryRuntimeRequest,
} from './runtime-request';

describe('trigonometry runtime request facade', () => {
  it('supports the runtime hook parse, serialize, screen, and revision path', () => {
    const parsed = parseTrigDraft('periodPhase(expr=2\\sin(3x-\\pi)+1, variable=x)');

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error('Expected Period & Phase request to parse');
    }

    expect(parsed.style).toBe('structured');
    expect(trigDraftStyle('periodPhase(expr=2\\sin(3x-\\pi)+1, variable=x)')).toBe('structured');
    expect(trigRequestToScreen(parsed.request)).toBe('periodPhase');
    expect(serializeTrigRequest(parsed.request)).toBe(
      'periodPhase(expr=2\\sin(3x-\\pi)+1, variable=x)',
    );

    const request: RunTrigonometryRuntimeRequest = {
      inputLatex: serializeTrigRequest(parsed.request),
      screenHint: 'periodPhase',
      angleUnit: 'rad',
    };

    expect(buildTrigonometryOoeInputRevisionId(request)).toMatch(
      /^input\.trigonometry\.evaluate\.[a-z0-9]+$/u,
    );
  });
});
