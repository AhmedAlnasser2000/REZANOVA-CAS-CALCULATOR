import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useEffectEvent,
  useState,
} from 'react';

const SETTINGS_DOCK_BREAKPOINT = 1180;
const APP_SHELL_PADDING = 28;
const CALCULATOR_SHELL_MAX_WIDTH = 1480;
const SIDE_SURFACE_WIDTH = 400;
const SIDE_SURFACE_GAP = 24;
const SIDE_SURFACE_MIN_SLACK = SIDE_SURFACE_WIDTH + SIDE_SURFACE_GAP;

export type SideSurface = 'none' | 'settings' | 'history';
export type SideSurfacePresentation = 'outboard' | 'overlay';

type UseSideSurfaceRuntimeOptions = {
  appStageRef: RefObject<HTMLDivElement | null>;
  calculatorShellRef: RefObject<HTMLDivElement | null>;
  uiScale: number;
  mathScale: number;
  resultScale: number;
};

export function useSideSurfaceRuntime({
  appStageRef,
  calculatorShellRef,
  uiScale,
  mathScale,
  resultScale,
}: UseSideSurfaceRuntimeOptions) {
  const [sideSurface, setSideSurface] = useState<SideSurface>('none');
  const [sideSurfaceOutboardEligible, setSideSurfaceOutboardEligible] = useState(false);
  const [sideSurfaceOutboardLeft, setSideSurfaceOutboardLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? SETTINGS_DOCK_BREAKPOINT : window.innerWidth,
  );

  const settingsOpen = sideSurface === 'settings';
  const historyOpen = sideSurface === 'history';
  const sideSurfaceSide = 'right' as const;
  const sideSurfacePresentation: SideSurfacePresentation =
    sideSurfaceOutboardEligible ? 'outboard' : 'overlay';
  const sideSurfaceOverlayOpen = sideSurface !== 'none' && sideSurfacePresentation === 'overlay';
  const sideSurfaceOutboardOpen =
    sideSurface !== 'none' && sideSurfacePresentation === 'outboard';

  const calculatorShellStyle = {
    '--ui-scale': `${uiScale / 100}`,
    '--math-scale': `${mathScale / 100}`,
    '--result-scale': `${resultScale / 100}`,
  } as CSSProperties;

  const sideSurfaceHostStyle = {
    left: `${sideSurfaceOutboardLeft}px`,
    width: `${SIDE_SURFACE_WIDTH}px`,
  } as CSSProperties;

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const measureSideSurfaceLayout = useEffectEvent(() => {
    let availableRightSlack = 0;
    let nextOutboardLeft = 0;

    const stageRect = appStageRef.current?.getBoundingClientRect();
    const shellRect = calculatorShellRef.current?.getBoundingClientRect();

    if (stageRect && shellRect && stageRect.width > 0 && shellRect.width > 0) {
      availableRightSlack = Math.max(0, stageRect.right - shellRect.right);
      nextOutboardLeft = Math.max(0, shellRect.right - stageRect.left + SIDE_SURFACE_GAP);
    } else {
      const appInnerWidth = Math.max(viewportWidth - APP_SHELL_PADDING * 2, 0);
      const shellWidth = Math.min(appInnerWidth, CALCULATOR_SHELL_MAX_WIDTH);
      const shellLeft = Math.max((appInnerWidth - shellWidth) / 2, 0);
      availableRightSlack = Math.max(0, appInnerWidth - (shellLeft + shellWidth));
      nextOutboardLeft = shellLeft + shellWidth + SIDE_SURFACE_GAP;
    }

    setSideSurfaceOutboardEligible(
      viewportWidth >= SETTINGS_DOCK_BREAKPOINT && availableRightSlack >= SIDE_SURFACE_MIN_SLACK,
    );
    setSideSurfaceOutboardLeft(nextOutboardLeft);
  });

  useEffect(() => {
    measureSideSurfaceLayout();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      measureSideSurfaceLayout();
    });

    if (appStageRef.current) {
      observer.observe(appStageRef.current);
    }

    if (calculatorShellRef.current) {
      observer.observe(calculatorShellRef.current);
    }

    return () => observer.disconnect();
  }, [appStageRef, calculatorShellRef, uiScale, viewportWidth]);

  function closeSettingsPanel() {
    setSideSurface((currentSurface) => (currentSurface === 'settings' ? 'none' : currentSurface));
  }

  function closeHistoryPanel() {
    setSideSurface((currentSurface) => (currentSurface === 'history' ? 'none' : currentSurface));
  }

  function closeSideSurface() {
    setSideSurface('none');
  }

  function toggleSettingsPanel() {
    setSideSurface((currentSurface) =>
      currentSurface === 'settings' ? 'none' : 'settings',
    );
  }

  function toggleHistoryPanel() {
    setSideSurface((currentSurface) =>
      currentSurface === 'history' ? 'none' : 'history',
    );
  }

  return {
    calculatorShellStyle,
    closeHistoryPanel,
    closeSettingsPanel,
    closeSideSurface,
    historyOpen,
    settingsOpen,
    sideSurface,
    sideSurfaceHostStyle,
    sideSurfaceOutboardOpen,
    sideSurfaceOverlayOpen,
    sideSurfacePresentation,
    sideSurfaceSide,
    toggleHistoryPanel,
    toggleSettingsPanel,
  };
}
