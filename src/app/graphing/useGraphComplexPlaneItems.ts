import { useMemo } from 'react';
import {
  normalizeGraphItemPresentation,
  resolveGraphPresentationColor,
  type GraphDocumentV4,
  type GraphSpatialSceneRuntimeV2,
} from '../../lib/graphing';
import type { GraphComplexPlaneInput } from './GraphComplexViewport';

/** Loci and root points drawn in the Complex pane, with their sampled geometry and item colour. */
export function useGraphComplexPlaneItems(document: GraphDocumentV4, scene: GraphSpatialSceneRuntimeV2 | null,
  colorVisionMode: 'standard' | 'color-vision-friendly'): GraphComplexPlaneInput[] {
  return useMemo(() => document.items.flatMap((item): GraphComplexPlaneInput[] => {
    if (item.kind !== 'relation' || !item.visible
      || (item.relation.kind !== 'complex-locus' && item.relation.kind !== 'complex-roots')) return [];
    const planar = scene?.planarScene;
    return [{
      itemId: item.itemId,
      color: resolveGraphPresentationColor(normalizeGraphItemPresentation(item.presentation), colorVisionMode),
      paths: (planar?.paths ?? []).filter((path) => path.itemId === item.itemId)
        .map((path) => ({ coordinates: path.coordinates, segmentOffsets: path.segmentOffsets, strict: path.strokeRole === 'strict-boundary' })),
      regions: (planar?.regions ?? []).filter((region) => region.itemId === item.itemId),
      roots: item.relation.kind === 'complex-roots' ? { left: item.relation.left, right: item.relation.right } : null,
    }];
  }), [colorVisionMode, document.items, scene]);
}
