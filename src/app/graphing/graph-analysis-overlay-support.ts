import type {
  GraphAnalysisEvidenceV1,
  GraphFeatureValueV1,
  GraphPinnedAnnotationV2,
} from '../../lib/graphing';

export function graphFeatureNumber(value: GraphFeatureValueV1 | undefined) {
  if (!value) return undefined;
  if (value.kind === 'approximate') return value.value;
  if (typeof value.value.mathJson === 'number') return value.value.mathJson;
  const node = value.value.mathJson;
  if (Array.isArray(node) && node[0] === 'Rational'
    && typeof node[1] === 'number' && typeof node[2] === 'number' && node[2] !== 0) {
    return node[1] / node[2];
  }
  return undefined;
}

export function graphAnalysisAnnotationId(entry: GraphAnalysisEvidenceV1) {
  const identity = JSON.stringify({
    feature: entry.feature,
    itemIds: entry.itemIds,
    coordinates: entry.coordinates,
  });
  let hash = 0x811c9dc5;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `annotation.${entry.feature}.${(hash >>> 0).toString(36)}`;
}

export function graphPinnedAnnotation(entry: GraphAnalysisEvidenceV1): GraphPinnedAnnotationV2 | null {
  if (!entry.coordinates || (entry.level !== 'exact-proved' && entry.level !== 'numeric-validated')) return null;
  return { version: 2, annotationId: graphAnalysisAnnotationId(entry), feature: entry.feature,
    level: entry.level, itemIds: [...entry.itemIds], coordinates: structuredClone(entry.coordinates) };
}
