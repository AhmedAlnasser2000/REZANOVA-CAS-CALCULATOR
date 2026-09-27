import { ChartSpline, Info } from 'lucide-react';

import type { Settings } from '../../../types/calculator';
import { GraphicsDiagnosticsPanel } from './GraphicsDiagnosticsPanel';

type GraphGpuRendering = Settings['graphGpuRendering'];

const GPU_OPTIONS: Array<{ value: GraphGpuRendering; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'off', label: 'Off' },
];

/**
 * Graph rendering preferences. GPU rendering is visual only: turning it off
 * returns every graph to the CPU renderer without changing mathematics.
 */
export function GraphingSettingsPanel({ gpuRendering, onGpuRenderingChange }: {
  gpuRendering: GraphGpuRendering;
  onGpuRenderingChange: (value: GraphGpuRendering) => void;
}) {
  return (
    <>
      <section className="settings-page-card" data-testid="graphing-settings">
        <div className="settings-page-card-heading">
          <span>Graphing</span>
          <h2>Rendering</h2>
        </div>
        <div className="settings-page-card-body">
          <div className="settings-page-row">
            <div className="settings-page-row-label">
              <ChartSpline aria-hidden="true" size={17} />
              <span>GPU rendering</span>
              <small>Auto uses the GPU for supported graphs and falls back to standard rendering with a notice.</small>
            </div>
            <div className="settings-page-row-control">
              <div className="settings-page-segmented" role="group" aria-label="GPU rendering">
                {GPU_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={option.value === gpuRendering}
                    className={option.value === gpuRendering ? 'is-active' : ''}
                    onClick={() => onGpuRenderingChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="settings-page-note">
            <Info aria-hidden="true" size={14} /> GPU pixels are display only. Trace, Analyze, and export always use the
            precise CPU evaluation.
          </p>
        </div>
      </section>
      <GraphicsDiagnosticsPanel />
    </>
  );
}
