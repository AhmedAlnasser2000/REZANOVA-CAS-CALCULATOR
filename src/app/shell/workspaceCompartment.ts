import type { ModeId } from '../../types/calculator';
import { MODE_LABELS } from '../../lib/navigation/menu';
import type { CompartmentId } from '../../lib/compartments/manifest';

export type WorkspaceCompartmentSurface = {
  compartmentId: CompartmentId;
  compartmentLabel: string;
  surfaceLabel: string;
};

export function resolveWorkspaceCompartment(
  currentMode: ModeId,
  isLauncherOpen: boolean,
): WorkspaceCompartmentSurface {
  if (isLauncherOpen) {
    return {
      compartmentId: 'app-shell',
      compartmentLabel: 'App Shell',
      surfaceLabel: 'Launcher workspace',
    };
  }

  if (currentMode === 'matrix' || currentMode === 'vector') {
    return {
      compartmentId: 'linear-algebra',
      compartmentLabel: 'Linear Algebra',
      surfaceLabel: `${MODE_LABELS[currentMode]} workspace`,
    };
  }

  if (currentMode === 'guide') {
    return {
      compartmentId: 'guide',
      compartmentLabel: 'Guide',
      surfaceLabel: 'Guide workspace',
    };
  }

  if (currentMode === 'labs') {
    return {
      compartmentId: 'labs',
      compartmentLabel: 'Labs',
      surfaceLabel: 'Labs workspace',
    };
  }

  return {
    compartmentId: currentMode,
    compartmentLabel: MODE_LABELS[currentMode],
    surfaceLabel: `${MODE_LABELS[currentMode]} workspace`,
  };
}
