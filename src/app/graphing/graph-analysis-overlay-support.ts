import {
  graphExactMathJsonNumber,
  type GraphAnalysisEvidenceV1,
  type GraphFeatureValueV1,
  type GraphPinnedAnnotationV2,
} from '../../lib/graphing';

export function graphFeatureNumber(value: GraphFeatureValueV1 | undefined) {
  if (!value) return undefined;
  if (value.kind === 'approximate') return value.value;
  return graphExactMathJsonNumber(value.value.mathJson);
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
  if (!entry.coordinates || (entry.level !== 'exact-proved' && entry.level !== 'interval-proved' && entry.level !== 'numeric-validated')) return null;
  // A pin stores exact or validated; an interval proof is pinned as validated (true, and the stored schema is unchanged).
  return { version: 2, annotationId: graphAnalysisAnnotationId(entry), feature: entry.feature,
    level: entry.level === 'interval-proved' ? 'numeric-validated' : entry.level, itemIds: [...entry.itemIds], coordinates: structuredClone(entry.coordinates) };
}
