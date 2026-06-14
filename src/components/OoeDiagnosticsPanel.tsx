import { useState } from 'react';
import {
  clearRecentOoeJobs,
  listActiveOoeJobs,
  listRecentOoeJobs,
} from '../lib/ooe/job-launch/active-job-registry';
import {
  clearOoeDiagnostics,
  listOoeDiagnostics,
} from '../lib/ooe/diagnostics/diagnostics-buffer';
import {
  clearOoeEvents,
  listOoeEvents,
} from '../lib/ooe/events/event-outbox';
import { OOE_EVENT_COMPARTMENT_OPTIONS } from '../lib/ooe/events/compartment-labels';
import {
  buildOoeDiagnosticsInspectorSnapshot,
  serializeOoeDiagnosticsInspectorItem,
  type OoeDiagnosticsInspectorEventCompartmentFilter,
  type OoeDiagnosticsInspectorStatusFilter,
} from '../lib/ooe/diagnostics/diagnostics-inspector';

type OoeDiagnosticsPanelPresentation = 'outboard' | 'overlay';

type OoeDiagnosticsPanelProps = {
  presentation: OoeDiagnosticsPanelPresentation;
  onClose: () => void;
  copyText?: (text: string) => Promise<void> | void;
};

const STATUS_FILTERS: OoeDiagnosticsInspectorStatusFilter[] = [
  'all',
  'started',
  'cancelRequested',
  'completed',
  'staleDropped',
  'skipped',
  'cancelled',
  'failed',
];

async function defaultCopyText(text: string) {
  await navigator.clipboard?.writeText(text);
}

export function OoeDiagnosticsPanel({
  presentation,
  onClose,
  copyText = defaultCopyText,
}: OoeDiagnosticsPanelProps) {
  const [statusFilter, setStatusFilter] =
    useState<OoeDiagnosticsInspectorStatusFilter>('all');
  const [eventCompartmentFilter, setEventCompartmentFilter] =
    useState<OoeDiagnosticsInspectorEventCompartmentFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [, setRevision] = useState(0);

  const snapshot = buildOoeDiagnosticsInspectorSnapshot({
    diagnostics: listOoeDiagnostics(),
    activeJobs: listActiveOoeJobs(),
    recentJobs: listRecentOoeJobs(),
    events: listOoeEvents(),
    statusFilter,
    eventCompartmentFilter,
    query,
  });
  const selectedItem =
    snapshot.items.find((item) => item.id === selectedId) ?? snapshot.items[0] ?? null;

  function refresh() {
    setRevision((currentRevision) => currentRevision + 1);
  }

  function clearRecords() {
    clearOoeDiagnostics();
    clearRecentOoeJobs();
    clearOoeEvents();
    setSelectedId(null);
    setCopyStatus('');
    refresh();
  }

  async function copySelectedRecord() {
    if (!selectedItem) {
      return;
    }

    await copyText(serializeOoeDiagnosticsInspectorItem(selectedItem));
    setCopyStatus('Copied selected record');
  }

  return (
    <aside
      className={`ooe-diagnostics-panel ooe-diagnostics-panel--${presentation}`}
      data-testid="ooe-diagnostics-panel"
      data-ooe-diagnostics-presentation={presentation}
    >
      <div className="ooe-diagnostics-header">
        <div>
          <strong>OOE Diagnostics</strong>
          <p>Developer only. Recent in-memory runtime records.</p>
        </div>
        <div className="ooe-diagnostics-actions">
          <button type="button" onClick={refresh}>Refresh</button>
          <button type="button" onClick={clearRecords}>Clear</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="ooe-diagnostics-toolbar">
        <label>
          <span>Status</span>
          <select
            data-testid="ooe-diagnostics-status-filter"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as OoeDiagnosticsInspectorStatusFilter);
              setSelectedId(null);
            }}
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Route or capability</span>
          <input
            data-testid="ooe-diagnostics-query"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedId(null);
            }}
            placeholder="equation.solve"
          />
        </label>
        <label>
          <span>Event compartment</span>
          <select
            data-testid="ooe-diagnostics-event-compartment-filter"
            value={eventCompartmentFilter}
            onChange={(event) => {
              setEventCompartmentFilter(
                event.target.value as OoeDiagnosticsInspectorEventCompartmentFilter,
              );
            }}
          >
            <option value="all">All</option>
            {OOE_EVENT_COMPARTMENT_OPTIONS.map((option) => (
              <option key={option.compartmentId} value={option.compartmentId}>
                {option.compartmentLabel}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ooe-diagnostics-summary" data-testid="ooe-diagnostics-summary">
        <span>{snapshot.diagnosticsCount} records</span>
        <span>{snapshot.activeJobCount} active</span>
        <span>{snapshot.recentJobCount} recent jobs</span>
        <span>{snapshot.eventCount} events</span>
      </div>

      <section className="ooe-diagnostics-events" data-testid="ooe-diagnostics-events">
        <div className="ooe-diagnostics-events-header">
          <span className="ooe-diagnostics-kicker">Event timeline</span>
          <span>{snapshot.events.length} shown</span>
        </div>
        {snapshot.events.length === 0 ? (
          <div className="ooe-diagnostics-empty">No OOE events yet.</div>
        ) : snapshot.events.map((event) => (
          <div
            key={event.id}
            className={`ooe-diagnostics-event-row ooe-diagnostics-event-row--${event.severity}`}
            data-testid="ooe-diagnostics-event-row"
          >
            <span className="ooe-diagnostics-row-title">{event.type}</span>
            <span className="ooe-diagnostics-row-meta">
              #{event.sequence} · {event.summary}
            </span>
            <span className="ooe-diagnostics-row-meta">
              {[
                event.compartmentLabel,
                event.routeLabel,
                event.hostId,
                event.jobId,
              ].filter(Boolean).join(' · ')}
            </span>
          </div>
        ))}
      </section>

      <div className="ooe-diagnostics-body">
        <div className="ooe-diagnostics-list" data-testid="ooe-diagnostics-list">
          {snapshot.items.length === 0 ? (
            <div className="ooe-diagnostics-empty">No OOE diagnostics records yet.</div>
          ) : snapshot.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ooe-diagnostics-row ${selectedItem?.id === item.id ? 'is-selected' : ''}`}
              data-testid="ooe-diagnostics-row"
              onClick={() => {
                setSelectedId(item.id);
                setCopyStatus('');
              }}
            >
              <span className="ooe-diagnostics-row-title">
                {item.routeLabel}
              </span>
              <span className="ooe-diagnostics-row-meta">
                {item.status} · {item.capabilityId}
              </span>
              <span className="ooe-diagnostics-row-meta">
                {item.hostId} · {item.durationLabel}
              </span>
            </button>
          ))}
        </div>

        <section className="ooe-diagnostics-detail" data-testid="ooe-diagnostics-detail">
          {selectedItem ? (
            <>
              <div className="ooe-diagnostics-detail-header">
                <div>
                  <span className="ooe-diagnostics-kicker">{selectedItem.kind}</span>
                  <strong>{selectedItem.routeLabel}</strong>
                </div>
                <button type="button" onClick={copySelectedRecord}>
                  Copy
                </button>
              </div>
              {copyStatus ? (
                <div role="status" className="ooe-diagnostics-copy-status">
                  {copyStatus}
                </div>
              ) : null}
              <dl className="ooe-diagnostics-facts">
                <div>
                  <dt>Status</dt>
                  <dd>{selectedItem.status}</dd>
                </div>
                <div>
                  <dt>Commit</dt>
                  <dd>{selectedItem.commitDecision ?? 'n/a'}</dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>{selectedItem.planId}</dd>
                </div>
                <div>
                  <dt>Host</dt>
                  <dd>{selectedItem.hostId}</dd>
                </div>
              </dl>
              {selectedItem.evidenceLines.length > 0 ? (
                <div className="ooe-diagnostics-evidence">
                  <span className="ooe-diagnostics-kicker">Evidence</span>
                  {selectedItem.evidenceLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : null}
              <pre className="ooe-diagnostics-json">
                {serializeOoeDiagnosticsInspectorItem(selectedItem)}
              </pre>
            </>
          ) : (
            <div className="ooe-diagnostics-empty">Select a diagnostics record.</div>
          )}
        </section>
      </div>
    </aside>
  );
}
