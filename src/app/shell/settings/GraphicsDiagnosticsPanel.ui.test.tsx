import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphWebglProbeResultV1 } from '../../../lib/graphing';
import { GraphicsDiagnosticsPanel } from './GraphicsDiagnosticsPanel';

const probe = vi.hoisted(() => vi.fn<() => Promise<GraphWebglProbeResultV1>>());

vi.mock('../../../lib/graphing', () => ({ probeGraphWebglCapabilities: probe }));

function probeResult(overrides: Partial<GraphWebglProbeResultV1> = {}): GraphWebglProbeResultV1 {
  return {
    userAgent: 'test',
    webgl2: true,
    renderer: 'WebKit WebGL',
    vendor: 'WebKit',
    unmaskedRenderer: 'ANGLE (NVIDIA GeForce RTX 5070 Ti)',
    unmaskedVendor: 'NVIDIA',
    software: false,
    extensions: { EXT_color_buffer_float: true, EXT_disjoint_timer_query_webgl2: false },
    highpFloat: { rangeMin: 127, rangeMax: 127, precision: 23 },
    maxTextureSize: 32768,
    maxRenderbufferSize: 32768,
    fieldShader: { floatTarget: true, maxAbsError: 2.9e-7, samples: 5, elapsedMs: 2.7 },
    error: null,
    ...overrides,
  };
}

describe('GraphicsDiagnosticsPanel', () => {
  beforeEach(() => probe.mockReset());

  it('reports a hardware GPU with its renderer, field test, and capabilities', async () => {
    probe.mockResolvedValue(probeResult());
    render(<GraphicsDiagnosticsPanel />);
    expect(await screen.findByText('Hardware GPU')).toBeInTheDocument();
    expect(screen.getByTestId('graphics-diagnostics-renderer')).toHaveTextContent('RTX 5070 Ti');
    expect(screen.getByTestId('graphics-diagnostics-field-test')).toHaveTextContent('Passed: max error 2.9e-7 over 5 samples, 2.7 ms');
    expect(screen.getByTestId('graphics-diagnostics-capabilities')).toHaveTextContent('Float targets yes · GPU timers no · highp 23-bit · max texture 32768');
  });

  it('distinguishes software rendering, masked renderer names, and missing WebGL2', async () => {
    probe.mockResolvedValueOnce(probeResult({ software: true, unmaskedRenderer: 'SwiftShader' }));
    const { unmount } = render(<GraphicsDiagnosticsPanel />);
    expect(await screen.findByText('Software rendering')).toBeInTheDocument();
    unmount();

    probe.mockResolvedValueOnce(probeResult({ software: null, unmaskedRenderer: 'Apple GPU' }));
    const masked = render(<GraphicsDiagnosticsPanel />);
    expect(await screen.findByText('WebGL2 available (GPU name hidden by the webview)')).toBeInTheDocument();
    masked.unmount();

    probe.mockResolvedValueOnce(probeResult({ webgl2: false, fieldShader: null, error: 'webgl2-context-unavailable' }));
    render(<GraphicsDiagnosticsPanel />);
    expect(await screen.findByText('WebGL2 unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('graphics-diagnostics-field-test')).toHaveTextContent('webgl2-context-unavailable');
  });

  it('re-runs the check on demand and surfaces probe failures', async () => {
    probe.mockResolvedValueOnce(probeResult()).mockRejectedValueOnce(new Error('context lost'));
    render(<GraphicsDiagnosticsPanel />);
    expect(await screen.findByText('Hardware GPU')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run check again/ }));
    expect(await screen.findByText('Check failed: context lost')).toBeInTheDocument();
    expect(probe).toHaveBeenCalledTimes(2);
  });
});
