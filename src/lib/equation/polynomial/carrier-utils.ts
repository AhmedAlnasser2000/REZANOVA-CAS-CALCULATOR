export const ROOT_TOLERANCE = 1e-8;

export function sortAndDedupeRoots<T extends { numeric: number }>(roots: T[]) {
  return roots
    .slice()
    .sort((left, right) => left.numeric - right.numeric)
    .filter((root, index, list) =>
      index === 0 || Math.abs(root.numeric - list[index - 1].numeric) > ROOT_TOLERANCE);
}
