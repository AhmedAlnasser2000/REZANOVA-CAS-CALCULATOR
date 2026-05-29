/* eslint-disable @typescript-eslint/no-explicit-any */

type LauncherWorkspaceProps = {
  variant?: 'workspace' | 'inspector';
  launcherState: any;
  launcherCategories: any[];
  activeLauncherCategory: any;
  activeLauncherLeafId: any;
  onOpenCategory: (categoryId: any, activeLeafId?: any) => void;
  onLaunchApp: (entry: any) => void;
  onSetLauncherState: (updater: (currentLauncherState: any) => any) => void;
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
  return (
    <section className={`${variant === 'workspace' ? 'mode-panel ' : ''}launcher-panel launcher-panel--${variant}`}>
      <div className="launcher-list">
        {(launcherState.level === 'root'
          ? launcherCategories
          : (activeLauncherCategory?.entries ?? [])
        ).map((entry: any, index: number) => (
          <button
            key={entry.id}
            className={`launcher-entry ${
              launcherState.level === 'root'
                ? index === launcherState.rootSelectedIndex ? 'is-selected' : ''
                : index === launcherState.categorySelectedIndex ? 'is-selected' : ''
            }`}
            onClick={() =>
              launcherState.level === 'root'
                ? onOpenCategory(entry.id, activeLauncherLeafId ?? undefined)
                : onLaunchApp(entry)}
            onMouseEnter={() =>
              onSetLauncherState((currentLauncherState) => ({
                ...currentLauncherState,
                ...(launcherState.level === 'root'
                  ? { rootSelectedIndex: index }
                  : { categorySelectedIndex: index }),
              }))}
          >
            <span className="launcher-entry-hotkey">{entry.hotkey}</span>
            <span className="launcher-entry-content">
              <strong>{entry.label}</strong>
              <small>{entry.description}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export { LauncherWorkspace };
