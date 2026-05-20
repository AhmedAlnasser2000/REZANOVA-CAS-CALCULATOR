import type { CSSProperties, ReactNode } from 'react';

type SideSurfacePresentation = 'outboard' | 'overlay';

type SideSurfaceHostProps = {
  sideSurface: string;
  side: 'left' | 'right';
  hostStyle: CSSProperties;
  outboardOpen: boolean;
  overlayOpen: boolean;
  onClose: () => void;
  renderSurface: (presentation: SideSurfacePresentation) => ReactNode;
};

function SideSurfaceHost({
  sideSurface,
  side,
  hostStyle,
  outboardOpen,
  overlayOpen,
  onClose,
  renderSurface,
}: SideSurfaceHostProps) {
  return (
    <>
      {outboardOpen ? (
        <div
          className={`side-surface-host side-surface-host--${side}`}
          data-testid="side-surface-host"
          data-side-surface={sideSurface}
          data-side-surface-presentation="outboard"
          data-side-surface-side={side}
          style={hostStyle}
        >
          {renderSurface('outboard')}
        </div>
      ) : null}

      {overlayOpen ? (
        <>
          <button
            type="button"
            className="side-surface-overlay-backdrop"
            data-testid="side-surface-overlay-backdrop"
            aria-label="Close side panel"
            onClick={onClose}
          />
          {renderSurface('overlay')}
        </>
      ) : null}
    </>
  );
}

export { SideSurfaceHost };
