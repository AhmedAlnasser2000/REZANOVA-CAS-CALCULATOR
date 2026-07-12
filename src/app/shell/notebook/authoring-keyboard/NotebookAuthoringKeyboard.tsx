import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Delete,
  Keyboard,
  Redo2,
  Search,
  Undo2,
} from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import {
  NOTEBOOK_KEYBOARD_ENTRIES,
  NOTEBOOK_KEYBOARD_TABS,
  notebookKeyboardEntries,
  type NotebookKeyboardEntry,
  type NotebookKeyboardTabId,
} from '../../../../lib/notebook';
import { useNotebookMathFieldController } from '../math-field';

const QUICK_ENTRY_IDS = ['fraction', 'square-root', 'power', 'limit', 'integral'];

function keyboardEntry(id: string) {
  return NOTEBOOK_KEYBOARD_ENTRIES.find((entry) => entry.id === id);
}

function NotebookTemplateButton({
  entry,
  onInsert,
}: {
  entry: NotebookKeyboardEntry;
  onInsert: (entry: NotebookKeyboardEntry) => void;
}) {
  return (
    <button
      type="button"
      className={`notebook-authoring-key is-${entry.support}`}
      title={entry.support === 'document-only'
        ? `${entry.label} is available for authored documents but is not sent to calculator tools.`
        : `Insert ${entry.label}`}
      onClick={() => onInsert(entry)}
    >
      <span>{entry.label}</span>
      {entry.support === 'document-only' ? <small>Document</small> : null}
    </button>
  );
}

export function NotebookAuthoringKeyboard() {
  const controller = useNotebookMathFieldController();
  const { active } = controller;
  const [expanded, setExpanded] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<NotebookKeyboardTabId>('core');
  const [anchor, setAnchor] = useState<CSSProperties>({});
  const keyboardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active?.field) {
      return;
    }
    const updateAnchor = () => {
      const rect = active.field.getBoundingClientRect();
      const viewportWidth = window.innerWidth || 1200;
      const viewportHeight = window.innerHeight || 800;
      const toolbarWidth = 540;
      const left = Math.max(16, Math.min(rect.left, viewportWidth - toolbarWidth - 16));
      const below = rect.bottom + 10;
      const top = rect.top > 140
        ? rect.top - 58
        : Math.min(below, viewportHeight - 72);
      setAnchor({ left, top });
    };
    updateAnchor();
    window.addEventListener('resize', updateAnchor);
    window.addEventListener('scroll', updateAnchor, true);
    active.field.addEventListener('selection-change', updateAnchor);
    return () => {
      window.removeEventListener('resize', updateAnchor);
      window.removeEventListener('scroll', updateAnchor, true);
      active.field.removeEventListener('selection-change', updateAnchor);
    };
  }, [active]);

  useLayoutEffect(() => {
    if (!active?.field || !expanded || !keyboardRef.current) {
      return;
    }
    let layoutFrame = 0;
    const frame = requestAnimationFrame(() => {
      layoutFrame = requestAnimationFrame(() => {
        const keyboardBounds = keyboardRef.current?.getBoundingClientRect();
        const fieldBounds = active.field.getBoundingClientRect();
        if (!keyboardBounds || fieldBounds.bottom <= keyboardBounds.top - 16) {
          return;
        }
        const scroller = active.field.closest<HTMLElement>('.notebook-rich-scroll-region');
        if (scroller) {
          scroller.scrollTop += fieldBounds.bottom - keyboardBounds.top + 28;
        } else if (typeof active.field.scrollIntoView === 'function') {
          active.field.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(layoutFrame);
    };
  }, [active, expanded]);

  const entries = useMemo(
    () => notebookKeyboardEntries(query ? { query } : { tab }),
    [query, tab],
  );
  const quickEntries = QUICK_ENTRY_IDS
    .map(keyboardEntry)
    .filter((entry): entry is NotebookKeyboardEntry => Boolean(entry));

  if (!active) {
    return null;
  }

  function insert(entry: NotebookKeyboardEntry) {
    controller.insert(entry.latex);
  }

  return (
    <>
      {expanded ? (
        <div
          className="notebook-template-toolbar"
          data-testid="notebook-template-toolbar"
          style={anchor}
          onPointerDown={(event) => event.preventDefault()}
        >
          {quickEntries.map((entry) => (
            <NotebookTemplateButton key={entry.id} entry={entry} onInsert={insert} />
          ))}
        </div>
      ) : null}
      <section
        ref={keyboardRef}
        aria-label="Notebook math authoring keyboard"
        className={`notebook-authoring-keyboard${expanded ? ' is-expanded' : ' is-collapsed'}`}
        data-testid="notebook-authoring-keyboard"
        onPointerDown={(event) => event.preventDefault()}
      >
        <header className="notebook-authoring-keyboard-header">
          <div>
            <Keyboard aria-hidden="true" size={18} />
            <strong>Math authoring</strong>
            <span>{active.role === 'inline' ? 'Inline math' : 'Display math'}</span>
          </div>
          <div className="notebook-authoring-keyboard-commands">
            <button type="button" aria-label="Undo math" title="Undo math" onClick={() => controller.execute('undo')}><Undo2 size={16} /></button>
            <button type="button" aria-label="Redo math" title="Redo math" onClick={() => controller.execute('redo')}><Redo2 size={16} /></button>
            <button type="button" aria-label="Move math cursor left" title="Move cursor left" onClick={() => controller.execute('moveToPreviousChar')}><ArrowLeft size={16} /></button>
            <button type="button" aria-label="Move math cursor right" title="Move cursor right" onClick={() => controller.execute('moveToNextChar')}><ArrowRight size={16} /></button>
            <button type="button" aria-label="Delete previous math character" title="Delete previous character" onClick={() => controller.execute('deleteBackward')}><Delete size={16} /></button>
            <button
              type="button"
              aria-label={expanded ? 'Collapse math keyboard' : 'Expand math keyboard'}
              aria-expanded={expanded}
              title={expanded ? 'Collapse math keyboard' : 'Expand math keyboard'}
              onClick={() => setExpanded((current) => !current)}
            >
              <ChevronDown className={expanded ? undefined : 'is-rotated'} size={16} />
            </button>
          </div>
        </header>
        {expanded ? (
          <div className="notebook-authoring-keyboard-body">
            <label className="notebook-authoring-keyboard-search">
              <Search aria-hidden="true" size={15} />
              <span className="sr-only">Search math templates</span>
              <input
                type="search"
                placeholder="Search templates and symbols"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="notebook-authoring-keyboard-tabs" role="tablist" aria-label="Math template categories">
              {NOTEBOOK_KEYBOARD_TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={!query && tab === item.id}
                  className={!query && tab === item.id ? 'is-active' : undefined}
                  onClick={() => {
                    setQuery('');
                    setTab(item.id);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="notebook-authoring-keyboard-grid" data-testid="notebook-keyboard-entries">
              {entries.map((entry) => (
                <NotebookTemplateButton key={entry.id} entry={entry} onInsert={insert} />
              ))}
              {entries.length === 0 ? <p>No matching math templates.</p> : null}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
