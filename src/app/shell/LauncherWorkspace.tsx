import {
  useMemo,
  useState,
  type MouseEvent,
} from 'react';
import { canOpenLauncherEntryInNewTab } from '../../lib/navigation/launcher';
import type {
  LauncherAppEntry,
  LauncherCategory,
  LauncherLaunchIntent,
  LauncherLeafId,
  LauncherState,
} from '../../types/calculator';

type LauncherWorkspaceProps = {
  variant?: 'workspace' | 'inspector';
  launcherState: LauncherState;
  launcherCategories: LauncherCategory[];
  activeLauncherCategory: LauncherCategory | undefined;
  activeLauncherLeafId: LauncherLeafId;
  onOpenCategory: (categoryId: LauncherCategory['id'], activeLeafId?: LauncherLeafId) => void;
  onLaunchApp: (entry: LauncherAppEntry, intent?: LauncherLaunchIntent) => void;
  onSetLauncherState: (updater: (currentLauncherState: LauncherState) => LauncherState) => void;
};

function LauncherWorkspace({
  variant = 'workspace',
  launcherState,
  launcherCategories,
  activeLauncherCategory,
  activeLauncherLeafId,
  onOpenCategory,
  onLaunchApp,
  onSetLauncherState,
}: LauncherWorkspaceProps) {
  const [openActionEntryId, setOpenActionEntryId] = useState<LauncherAppEntry['id'] | null>(null);
  const isRootLevel = launcherState.level === 'root';
  const entries = isRootLevel
    ? launcherCategories
    : (activeLauncherCategory?.entries ?? []);
  const openActionEntry = useMemo(() => {
    if (isRootLevel || !activeLauncherCategory) {
      return null;
    }
    return activeLauncherCategory.entries.find((entry) => entry.id === openActionEntryId) ?? null;
  }, [activeLauncherCategory, isRootLevel, openActionEntryId]);

  function selectIndex(index: number) {
    onSetLauncherState((currentLauncherState) => ({
      ...currentLauncherState,
      ...(isRootLevel
        ? { rootSelectedIndex: index }
        : { categorySelectedIndex: index }),
    }));
  }

  function launchEntry(entry: LauncherAppEntry, intent: LauncherLaunchIntent) {
    setOpenActionEntryId(null);
    onLaunchApp(entry, intent);
  }

  function openEntryActions(
    event: MouseEvent<HTMLElement>,
    entry: LauncherAppEntry,
    index: number,
  ) {
    event.preventDefault();
    selectIndex(index);
    setOpenActionEntryId(entry.id);
  }

  return (
    <section className={`${variant === 'workspace' ? 'mode-panel ' : ''}launcher-panel launcher-panel--${variant}`}>
      <div className="launcher-list">
        {entries.map((entry, index) => {
          const isSelected = isRootLevel
            ? index === launcherState.rootSelectedIndex
            : index === launcherState.categorySelectedIndex;
          const launcherAppEntry = isRootLevel ? null : entry as LauncherAppEntry;
          const canOpenInNewTab =
            launcherAppEntry ? canOpenLauncherEntryInNewTab(launcherAppEntry) : false;

          return (
            <div
              key={entry.id}
              className={`launcher-entry-row ${isSelected ? 'is-selected' : ''}`}
              data-testid={isRootLevel ? 'launcher-category-row' : 'launcher-app-row'}
              onContextMenu={(event) => {
                if (launcherAppEntry) {
                  openEntryActions(event, launcherAppEntry, index);
                }
              }}
              onMouseEnter={() => selectIndex(index)}
            >
              <button
                type="button"
                className={`launcher-entry ${isSelected ? 'is-selected' : ''}`}
                onClick={() =>
                  isRootLevel
                    ? onOpenCategory(entry.id as LauncherCategory['id'], activeLauncherLeafId)
                    : launchEntry(entry as LauncherAppEntry, 'current-tab')}
              >
                <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                <span className="launcher-entry-content">
                  <strong>{entry.label}</strong>
                  <small>{entry.description}</small>
                </span>
              </button>
              {launcherAppEntry && canOpenInNewTab ? (
                <button
                  type="button"
                  className="launcher-entry-new-tab"
                  aria-label="Open in new tab"
                  title={`Open ${launcherAppEntry.label} in new tab`}
                  data-testid="launcher-entry-new-tab"
                  onClick={(event) => {
                    event.stopPropagation();
                    selectIndex(index);
                    launchEntry(launcherAppEntry, 'new-tab');
                  }}
                >
                  +
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {openActionEntry ? (
        <div className="launcher-entry-menu" role="menu" data-testid="launcher-entry-menu">
          <strong>{openActionEntry.label}</strong>
          <button
            type="button"
            role="menuitem"
            onClick={() => launchEntry(openActionEntry, 'current-tab')}
          >
            Open Here
          </button>
          {canOpenLauncherEntryInNewTab(openActionEntry) ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => launchEntry(openActionEntry, 'new-tab')}
            >
              Open in New Tab
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export { LauncherWorkspace };
