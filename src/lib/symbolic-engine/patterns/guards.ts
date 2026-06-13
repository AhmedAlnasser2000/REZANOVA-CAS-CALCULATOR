export function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

export function isFiniteNumber(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node);
}
