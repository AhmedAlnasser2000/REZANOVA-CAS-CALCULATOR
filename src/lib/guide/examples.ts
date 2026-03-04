import type { GuideArticle, GuideExample } from '../../types/calculator';

export function getSelectedGuideExample(
  article: GuideArticle | undefined,
  selectedIndex: number,
) {
  if (!article || article.examples.length === 0) {
    return undefined;
  }

  const clampedIndex = Math.min(Math.max(selectedIndex, 0), article.examples.length - 1);
  return article.examples[clampedIndex];
}

export function copyableGuideExampleLatex(example: GuideExample | undefined) {
  if (!example) {
    return '';
  }

  return example.copyLatex ?? (example.launch.kind === 'load-expression' ? example.launch.latex : '');
}
