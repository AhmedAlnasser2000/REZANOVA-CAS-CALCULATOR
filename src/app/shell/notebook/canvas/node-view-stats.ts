const renderCounts = new Map<string, number>();

export function recordNotebookNodeViewRender(id: string) {
  if (import.meta.env.MODE !== 'production') {
    renderCounts.set(id, (renderCounts.get(id) ?? 0) + 1);
  }
}

export function resetNotebookNodeViewRenderStats() {
  renderCounts.clear();
}

export function getNotebookNodeViewRenderStats() {
  const counts = Object.fromEntries(renderCounts);
  return {
    counts,
    renderedNodeCount: Object.keys(counts).length,
    totalRenders: Object.values(counts).reduce((sum, count) => sum + count, 0),
  };
}
