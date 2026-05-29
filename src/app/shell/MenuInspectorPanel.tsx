import { LauncherWorkspace } from './LauncherWorkspace';

type MenuInspectorPanelPresentation = 'outboard' | 'overlay';

type MenuInspectorPanelProps = {
  presentation: MenuInspectorPanelPresentation;
  launcherState: Parameters<typeof LauncherWorkspace>[0]['launcherState'];
  launcherCategories: Parameters<typeof LauncherWorkspace>[0]['launcherCategories'];
  activeLauncherCategory: Parameters<typeof LauncherWorkspace>[0]['activeLauncherCategory'];
  activeLauncherLeafId: Parameters<typeof LauncherWorkspace>[0]['activeLauncherLeafId'];
  onClose: () => void;
  onOpenCategory: Parameters<typeof LauncherWorkspace>[0]['onOpenCategory'];
  onLaunchApp: Parameters<typeof LauncherWorkspace>[0]['onLaunchApp'];
  onSetLauncherState: Parameters<typeof LauncherWorkspace>[0]['onSetLauncherState'];
};

function MenuInspectorPanel({
  presentation,
  launcherState,
  launcherCategories,
  activeLauncherCategory,
  activeLauncherLeafId,
  onClose,
  onOpenCategory,
  onLaunchApp,
  onSetLauncherState,
}: MenuInspectorPanelProps) {
  return (
    <aside
      className={`left-inspector-panel left-inspector-panel--${presentation}`}
      data-testid="left-menu-inspector"
      data-left-inspector-presentation={presentation}
    >
      <div className="left-inspector-header">
        <strong>Menu</strong>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <LauncherWorkspace
        variant="inspector"
        launcherState={launcherState}
        launcherCategories={launcherCategories}
        activeLauncherCategory={activeLauncherCategory}
        activeLauncherLeafId={activeLauncherLeafId}
        onOpenCategory={onOpenCategory}
        onLaunchApp={onLaunchApp}
        onSetLauncherState={onSetLauncherState}
      />
    </aside>
  );
}

export { MenuInspectorPanel };
