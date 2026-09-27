import { Cpu, Gauge, Info, MonitorCog, RefreshCw, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { probeGraphWebglCapabilities, type GraphWebglProbeResultV1 } from '../../../lib/graphing';

type ProbeState =
  | { kind: 'running' }
  | { kind: 'ready'; result: GraphWebglProbeResultV1 }
  | { kind: 'failed'; message: string };

function DiagnosticsRow({ children, icon: Icon, label }: {
  children: ReactNode;
  icon?: LucideIcon;
  label: string;
}) {
  return (
    <div className="settings-page-row">
      <div className="settings-page-row-label">
        {Icon ? <Icon aria-hidden="true" size={17} /> : <Info aria-hidden="true" size={15} />}
        <span>{label}</span>
      </div>
      <div className="settings-page-row-control" data-testid={`graphics-diagnostics-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        {children}
      </div>
    </div>
  );
}

function graphicsSummary(result: GraphWebglProbeResultV1) {
  if (!result.webgl2) return 'WebGL2 unavailable';
  if (result.software === true) return 'Software rendering';
  if (result.software === false) return 'Hardware GPU';
  return 'WebGL2 available (GPU name hidden by the webview)';
}

function fieldTestSummary(result: GraphWebglProbeResultV1) {
  const field = result.fieldShader;
  if (!field) return result.error ?? 'Not run';
  if (!field.floatTarget || field.maxAbsError === null) return 'Float render targets unavailable';
  const time = field.elapsedMs === null ? '' : `, ${field.elapsedMs.toFixed(1)} ms`;
  return `Passed: max error ${field.maxAbsError.toExponential(1)} over ${field.samples} samples${time}`;
}

/**
 * Read-only WebGL2 diagnostics for this device. It reports what the Graph
 * GPU renderer would run on; it never changes Graph rendering or mathematics.
 */
export function GraphicsDiagnosticsPanel() {
  const [state, setState] = useState<ProbeState>({ kind: 'running' });
  const probe = useCallback(() => {
    probeGraphWebglCapabilities()
      .then((result) => setState({ kind: 'ready', result }))
      .catch((error: unknown) => setState({
        kind: 'failed',
        message: error instanceof Error ? error.message : String(error),
      }));
  }, []);
  useEffect(() => { probe(); }, [probe]);
  const run = () => {
    setState({ kind: 'running' });
    probe();
  };

  const result = state.kind === 'ready' ? state.result : null;
  return (
    <section className="settings-page-card" data-testid="graphics-diagnostics">
      <div className="settings-page-card-heading">
        <span>Graphing</span>
        <h2>Graphics Diagnostics</h2>
      </div>
      <div className="settings-page-card-body">
        <DiagnosticsRow icon={MonitorCog} label="Graphics">
          <span data-state={state.kind}>
            {state.kind === 'running' ? 'Checking…' : state.kind === 'failed' ? `Check failed: ${state.message}` : graphicsSummary(state.result)}
          </span>
        </DiagnosticsRow>
        {result ? (
          <>
            <DiagnosticsRow icon={Cpu} label="Renderer">
              <span>{result.unmaskedRenderer ?? result.renderer ?? 'Not reported'}</span>
            </DiagnosticsRow>
            <DiagnosticsRow icon={Gauge} label="Field test">
              <span>{fieldTestSummary(result)}</span>
            </DiagnosticsRow>
            <DiagnosticsRow label="Capabilities">
              <span>
                {`Float targets ${result.extensions.EXT_color_buffer_float ? 'yes' : 'no'} · `}
                {`GPU timers ${result.extensions.EXT_disjoint_timer_query_webgl2 ? 'yes' : 'no'} · `}
                {`highp ${result.highpFloat ? `${result.highpFloat.precision}-bit` : 'n/a'} · `}
                {`max texture ${result.maxTextureSize ?? 'n/a'}`}
              </span>
            </DiagnosticsRow>
          </>
        ) : null}
        <button
          type="button"
          className="settings-page-secondary-action"
          disabled={state.kind === 'running'}
          onClick={run}
        >
          <RefreshCw aria-hidden="true" size={15} /> Run check again
        </button>
      </div>
    </section>
  );
}
