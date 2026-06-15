import { describe, expect, it } from 'vitest';
import {
  buildGeometryOoeInputRevisionId,
  geometryDraftStyle,
  geometryRequestToScreen,
  parseGeometryDraft,
  serializeGeometryRequest,
  type RunGeometryRuntimeRequest,
} from './runtime-request';

describe('geometry runtime request facade', () => {
  it('supports the runtime hook parse, serialize, screen, and revision path', () => {
    const parsed = parseGeometryDraft('rectangle(width=?, height=5, area=40)', {
      screenHint: 'rectangle',
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error('Expected rectangle solve-missing request to parse');
    }

    expect(parsed.style).toBe('structured');
    expect(geometryDraftStyle('rectangle(width=?, height=5, area=40)')).toBe('structured');
    expect(geometryRequestToScreen(parsed.request)).toBe('rectangle');
    expect(serializeGeometryRequest(parsed.request)).toBe(
      'rectangle(width=?, height=5, area=40)',
    );

    const request: RunGeometryRuntimeRequest = {
      inputLatex: serializeGeometryRequest(parsed.request),
      screenHint: 'rectangle',
    };

    expect(buildGeometryOoeInputRevisionId(request)).toMatch(
      /^input\.geometry\.evaluate\.[a-z0-9]+$/u,
    );
  });
});
