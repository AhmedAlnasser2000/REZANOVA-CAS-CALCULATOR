import { useState } from 'react';
import { writeTextClipboard } from '../lib/clipboard';
import {
  buildOoeDiagnosticsPanelSnapshot,
  clearOoeDiagnosticsPanelData,
  OOE_DIAGNOSTICS_PANEL_COMPARTMENT_OPTIONS,
  serializeOoeDiagnosticsPanelItem,
  type OoeDiagnosticsPanelCompartment,
  type OoeDiagnosticsPanelEventCompartmentFilter,
  type OoeDiagnosticsPanelItem,
  type OoeDiagnosticsPanelStatusFilter,
} from '../lib/ooe/diagnostics/panel-surface';

type OoeDiagnosticsPanelPresentation = 'outboard' | 'overlay';
type OoeDiagnosticsPanelTab = 'records' | 'events' | 'jobs' | 'compartments';

type OoeDiagnosticsPanelProps = {
  presentation: OoeDiagnosticsPanelPresentation;
  onClose: () => void;
  copyText?: (text: string) => Promise<void> | void;
};

const STATUS_FILTERS: OoeDiagnosticsPanelStatusFilter[] = [
  'all',
  'started',
  'cancelRequested',
  'completed',
  'staleDropped',
  'skipped',
  'cancelled',
  'failed',
];

const PANEL_TABS: Array<{ id: OoeDiagnosticsPanelTab; label: string }> = [
  { id: 'records', label: 'Records' },
  { id: 'events', label: 'Events' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'compartments', label: 'Compartments' },
];

async function defaultCopyText(text: string) {
  await writeTextClipboard(text);
}

function summarizeList(values: readonly string[], emptyLabel = 'none') {
  if (values.length === 0) {
    return emptyLabel;
  }
  if (values.length <= 3) {
    return values.join(', ');
  }
  return `${values.slice(0, 3).join(', ')} +${values.length - 3}`;
}

export function OoeDiagnosticsPanel({
  presentation,
  onClose,
  copyText = defaultCopyText,
}: OoeDiagnosticsPanelProps) {
  const [activeTab, setActiveTab] = useState<OoeDiagnosticsPanelTab>('records');
  const [statusFilter, setStatusFilter] =
    useState<OoeDiagnosticsPanelStatusFilter>('all');
  const [eventCompartmentFilter, setEventCompartmentFilter] =
    useState<OoeDiagnosticsPanelEventCompartmentFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedCompartmentId, setSelectedCompartmentId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [, setRevision] = useState(0);

  const snapshot = buildOoeDiagnosticsPanelSnapshot({
    statusFilter,
    eventCompartmentFilter,
    query,
  });
  const { recordItems, jobItems } = snapshot;
  const selectedCompartment =
    snapshot.compartments.find((compartment) =>
      compartment.compartmentId === selectedCompartmentId)
    ?? snapshot.compartments.find((compartment) => compartment.health !== 'idle')
    ?? snapshot.compartments[0]
    ?? null;
  const selectedRecordItem =
    recordItems.find((item) => item.id === selectedRecordId) ?? recordItems[0] ?? null;
  const selectedEventItem =
    snapshot.eventItems.find((event) => event.id === selectedEventId) ?? null;
  const selectedJobItem =
    jobItems.find((item) => item.id === selectedJobId) ?? jobItems[0] ?? null;
  const selectedItem =
    activeTab === 'records' ? selectedRecordItem : activeTab === 'jobs' ? selectedJobItem : null;

  function refresh() {
    setRevision((currentRevision) => currentRevision + 1);
  }

  function clearRecords() {
    clearOoeDiagnosticsPanelData();
    setSelectedRecordId(null);
    setSelectedEventId(null);
    setSelectedJobId(null);
    setSelectedCompartmentId(null);
    setCopyStatus('');
    refresh();
  }

  async function copySelectedRecord() {
    if (!selectedItem) {
      return;
    }

    await copyText(serializeOoeDiagnosticsPanelItem(selectedItem));
    setCopyStatus('Copied selected record');
  }

  function resetItemSelection() {
    setSelectedRecordId(null);
    setSelectedEventId(null);
    setSelectedJobId(null);
    setSelectedCompartmentId(null);
    setCopyStatus('');
  }

  function inspectSelectedCompartmentEvidence() {
    const target = selectedCompartment?.inspectTarget;
    if (!target) {
      return;
    }

    setCopyStatus('');
    setActiveTab(target.panel);

    if (target.panel === 'events') {
      setEventCompartmentFilter('all');
      setSelectedEventId(target.id ?? null);
    } else if (target.panel === 'records') {
      setStatusFilter('all');
      setQuery('');
      setSelectedRecordId(target.id ?? null);
    } else if (target.panel === 'jobs') {
      setStatusFilter('all');
      setQuery('');
      setSelectedJobId(target.id ?? null);
    } else {
      setSelectedCompartmentId(selectedCompartment.compartmentId);
    }
  }

  function renderStatusAndQueryToolbar() {
    return (
      <div className="ooe-diagnostics-toolbar">
        <label>
          <span>Status</span>
          <select
            data-testid="ooe-diagnostics-status-filter"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as OoeDiagnosticsPanelStatusFilter);
              resetItemSelection();
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
              resetItemSelection();
            }}
            placeholder="equation.solve"
          />
        </label>
      </div>
    );
  }

  function renderEventToolbar() {
    return (
      <div className="ooe-diagnostics-toolbar">
        <label>
          <span>Event compartment</span>
          <select
            data-testid="ooe-diagnostics-event-compartment-filter"
            value={eventCompartmentFilter}
            onChange={(event) => {
              setEventCompartmentFilter(
                event.target.value as OoeDiagnosticsPanelEventCompartmentFilter,
              );
              setSelectedEventId(null);
            }}
          >
            <option value="all">All</option>
            {OOE_DIAGNOSTICS_PANEL_COMPARTMENT_OPTIONS.map((option) => (
              <option key={option.compartmentId} value={option.compartmentId}>
                {option.compartmentLabel}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  function renderItemRows({
    items,
    selected,
    emptyLabel,
    onSelect,
  }: {
    items: OoeDiagnosticsPanelItem[];
    selected: OoeDiagnosticsPanelItem | null;
    emptyLabel: string;
    onSelect: (id: string) => void;
  }) {
    return (
      <div className="ooe-diagnostics-list" data-testid="ooe-diagnostics-list">
        {items.length === 0 ? (
          <div className="ooe-diagnostics-empty">{emptyLabel}</div>
        ) : items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`ooe-diagnostics-row ${selected?.id === item.id ? 'is-selected' : ''}`}
            data-testid="ooe-diagnostics-row"
            onClick={() => {
              onSelect(item.id);
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
              {item.kind} · {item.hostId} · {item.durationLabel}
            </span>
          </button>
        ))}
      </div>
    );
  }

  function renderCompartmentRows({
    compartments,
    selected,
  }: {
    compartments: OoeDiagnosticsPanelCompartment[];
    selected: OoeDiagnosticsPanelCompartment | null;
  }) {
    return (
      <div className="ooe-diagnostics-list" data-testid="ooe-diagnostics-compartment-list">
        {compartments.length === 0 ? (
          <div className="ooe-diagnostics-empty">No compartment state is available yet.</div>
        ) : compartments.map((compartment) => (
          <button
            key={compartment.compartmentId}
            type="button"
            className={
              `ooe-diagnostics-row ooe-diagnostics-row--${compartment.health}`
              + ` ${selected?.compartmentId === compartment.compartmentId ? 'is-selected' : ''}`
            }
            data-testid="ooe-diagnostics-compartment-row"
            onClick={() => {
              setSelectedCompartmentId(compartment.compartmentId);
              setCopyStatus('');
            }}
          >
            <span className="ooe-diagnostics-row-title">
              {compartment.compartmentLabel}
            </span>
            <span className="ooe-diagnostics-row-meta">
              {compartment.health}
              {' · '}
              {compartment.activeJobCount} active
              {' · '}
              {compartment.recentJobCount} recent
            </span>
            <span className="ooe-diagnostics-row-meta">
              {[
                compartment.latestIssue?.summary,
                compartment.latestEvent?.routeLabel,
                compartment.latestEvent?.hostId,
              ].filter(Boolean).join(' · ') || 'No current issue'}
            </span>
          </button>
        ))}
      </div>
    );
  }

  function renderSelectedDetail(item: OoeDiagnosticsPanelItem | null) {
    return (
      <section className="ooe-diagnostics-detail" data-testid="ooe-diagnostics-detail">
        {item ? (
          <>
            <div className="ooe-diagnostics-detail-header">
              <div>
                <span className="ooe-diagnostics-kicker">{item.kind}</span>
                <strong>{item.routeLabel}</strong>
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
                <dd>{item.status}</dd>
              </div>
              <div>
                <dt>Commit</dt>
                <dd>{item.commitDecision ?? 'n/a'}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>{item.planId}</dd>
              </div>
              <div>
                <dt>Host</dt>
                <dd>{item.hostId}</dd>
              </div>
            </dl>
            {item.evidenceLines.length > 0 ? (
              <div className="ooe-diagnostics-evidence">
                <span className="ooe-diagnostics-kicker">Evidence</span>
                {item.evidenceLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
            <pre className="ooe-diagnostics-json">
              {serializeOoeDiagnosticsPanelItem(item)}
            </pre>
          </>
        ) : (
          <div className="ooe-diagnostics-empty">Select a diagnostics record.</div>
        )}
      </section>
    );
  }

  function renderSelectedCompartmentDetail(compartment: OoeDiagnosticsPanelCompartment | null) {
    return (
      <section
        className="ooe-diagnostics-detail"
        data-testid="ooe-diagnostics-compartment-detail"
      >
        {compartment ? (
          <>
            <div className="ooe-diagnostics-detail-header">
              <div>
                <span className="ooe-diagnostics-kicker">compartment</span>
                <strong>{compartment.compartmentLabel}</strong>
              </div>
              <button
                type="button"
                disabled={!compartment.inspectTarget}
                onClick={inspectSelectedCompartmentEvidence}
              >
                Inspect evidence
              </button>
            </div>
            <dl className="ooe-diagnostics-facts">
              <div>
                <dt>Health</dt>
                <dd>{compartment.health}</dd>
              </div>
              <div>
                <dt>Active</dt>
                <dd>{compartment.activeJobCount}</dd>
              </div>
              <div>
                <dt>Recent</dt>
                <dd>{compartment.recentJobCount}</dd>
              </div>
              <div>
                <dt>Inspect</dt>
                <dd>
                  {compartment.inspectTarget
                    ? `${compartment.inspectTarget.panel}${compartment.inspectTarget.id
                      ? ` · ${compartment.inspectTarget.id}`
                      : ''}`
                    : 'n/a'}
                </dd>
              </div>
              <div>
                <dt>State surface</dt>
                <dd>{compartment.contract.stateSurface}</dd>
              </div>
              <div>
                <dt>Surface</dt>
                <dd>{compartment.contract.surfaceExposureCandidate}</dd>
              </div>
              <div>
                <dt>Owned paths</dt>
                <dd>{summarizeList(compartment.contract.ownedPaths)}</dd>
              </div>
              <div>
                <dt>Public seams</dt>
                <dd>{summarizeList(compartment.contract.publicSeams)}</dd>
              </div>
              <div>
                <dt>Policies</dt>
                <dd>{summarizeList(compartment.contract.dependencyPolicies)}</dd>
              </div>
              <div>
                <dt>Evidence sources</dt>
                <dd>
                  {[
                    `events ${compartment.evidenceCounts.events}`,
                    `records ${compartment.evidenceCounts.diagnosticsRecords}`,
                    `active ${compartment.evidenceCounts.activeJobs}`,
                    `recent ${compartment.evidenceCounts.recentJobs}`,
                    `ui ${compartment.evidenceCounts.uiBoundaryRecords}`,
                  ].join(' · ')}
                </dd>
              </div>
            </dl>
            {compartment.latestEvent ? (
              <div className="ooe-diagnostics-evidence">
                <span className="ooe-diagnostics-kicker">Latest event</span>
                <p>{compartment.latestEvent.type}</p>
                <p>
                  {[
                    `#${compartment.latestEvent.sequence}`,
                    compartment.latestEvent.routeLabel,
                    compartment.latestEvent.capabilityId,
                    compartment.latestEvent.hostId,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
            ) : null}
            {compartment.latestIssue ? (
              <div className="ooe-diagnostics-evidence">
                <span className="ooe-diagnostics-kicker">Latest issue</span>
                <p>{compartment.latestIssue.summary}</p>
                <p>
                  {[
                    compartment.latestIssue.severity,
                    compartment.latestIssue.source,
                    compartment.latestIssue.routeLabel,
                    compartment.latestIssue.capabilityId,
                    compartment.latestIssue.hostId,
                    compartment.latestIssue.evidenceId,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
            ) : (
              <div className="ooe-diagnostics-empty">No current issue for this compartment.</div>
            )}
          </>
        ) : (
          <div className="ooe-diagnostics-empty">Select a compartment.</div>
        )}
      </section>
    );
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

      <div className="ooe-diagnostics-summary" data-testid="ooe-diagnostics-summary">
        <span>{snapshot.diagnosticsCount} records</span>
        <span>{snapshot.activeJobCount} active</span>
        <span>{snapshot.recentJobCount} recent jobs</span>
        <span>{snapshot.eventCount} events</span>
        <span>{snapshot.uiIssueCount} UI issues</span>
        <span>{snapshot.compartmentCount} compartments</span>
      </div>

      <div className="ooe-diagnostics-tabs" role="tablist" aria-label="OOE diagnostics views">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`ooe-diagnostics-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            data-testid={`ooe-diagnostics-tab-${tab.id}`}
            onClick={() => {
              setActiveTab(tab.id);
              setCopyStatus('');
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`ooe-diagnostics-tab-panel ooe-diagnostics-tab-panel--${activeTab}`}>
        {activeTab === 'events' ? (
          <>
            {renderEventToolbar()}
            <section className="ooe-diagnostics-events" data-testid="ooe-diagnostics-events">
              <div className="ooe-diagnostics-events-header">
                <span className="ooe-diagnostics-kicker">Event timeline</span>
                <span>{snapshot.eventItems.length} shown</span>
              </div>
              {snapshot.eventItems.length === 0 ? (
                <div className="ooe-diagnostics-empty">No OOE events yet.</div>
              ) : snapshot.eventItems.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className={
                    `ooe-diagnostics-event-row ooe-diagnostics-event-row--${event.severity}`
                    + ` ${selectedEventItem?.id === event.id ? 'is-selected' : ''}`
                  }
                  data-testid="ooe-diagnostics-event-row"
                  onClick={() => {
                    setSelectedEventId(event.id);
                    setCopyStatus('');
                  }}
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
                </button>
              ))}
            </section>
          </>
        ) : null}

        {activeTab === 'records' ? (
          <>
            {renderStatusAndQueryToolbar()}
            <div className="ooe-diagnostics-body">
              {renderSelectedDetail(selectedRecordItem)}
              {renderItemRows({
                items: recordItems,
                selected: selectedRecordItem,
                emptyLabel: 'No OOE diagnostics records yet.',
                onSelect: setSelectedRecordId,
              })}
            </div>
          </>
        ) : null}

        {activeTab === 'jobs' ? (
          <>
            {renderStatusAndQueryToolbar()}
            <div className="ooe-diagnostics-body">
              {renderSelectedDetail(selectedJobItem)}
              {renderItemRows({
                items: jobItems,
                selected: selectedJobItem,
                emptyLabel: 'No OOE jobs match the current filters.',
                onSelect: setSelectedJobId,
              })}
            </div>
          </>
        ) : null}

        {activeTab === 'compartments' ? (
          <div className="ooe-diagnostics-body ooe-diagnostics-body--compartments">
            {renderSelectedCompartmentDetail(selectedCompartment)}
            {renderCompartmentRows({
              compartments: snapshot.compartments,
              selected: selectedCompartment,
            })}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
