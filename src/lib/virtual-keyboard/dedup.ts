import type { KeyboardKeySpec, KeyboardPageSpec } from '../../types/calculator';

export type DuplicateIssue = {
  scope: 'page' | 'layouts';
  duplicateGroup: string;
  pageId?: string;
  keyIds: string[];
};

function flattenPrimaryKeys(page: KeyboardPageSpec) {
  return page.rows.flat().filter((key) => key.supportLevel !== 'hidden');
}

function duplicateToken(key: KeyboardKeySpec) {
  return key.duplicateGroup ?? '';
}

export function findKeyboardDuplicateIssues(
  pages: readonly KeyboardPageSpec[],
): DuplicateIssue[] {
  const issues: DuplicateIssue[] = [];
  const globalGroups = new Map<string, KeyboardKeySpec[]>();

  for (const page of pages) {
    const seenInPage = new Map<string, KeyboardKeySpec[]>();
    for (const key of flattenPrimaryKeys(page)) {
      const token = duplicateToken(key);
      if (!token) {
        continue;
      }

      const pageKeys = seenInPage.get(token) ?? [];
      pageKeys.push(key);
      seenInPage.set(token, pageKeys);

      const globalKeys = globalGroups.get(token) ?? [];
      globalKeys.push(key);
      globalGroups.set(token, globalKeys);
    }

    for (const [group, keys] of seenInPage) {
      if (keys.length > 1) {
        issues.push({
          scope: 'page',
          duplicateGroup: group,
          pageId: page.id,
          keyIds: keys.map((key) => key.id),
        });
      }
    }
  }

  for (const [group, keys] of globalGroups) {
    if (keys.length > 1) {
      issues.push({
        scope: 'layouts',
        duplicateGroup: group,
        keyIds: keys.map((key) => key.id),
      });
    }
  }

  return issues;
}

export function assertNoKeyboardDuplicates(pages: readonly KeyboardPageSpec[]) {
  const issues = findKeyboardDuplicateIssues(pages);
  if (issues.length === 0) {
    return;
  }

  const message = issues
    .map((issue) =>
      issue.scope === 'page'
        ? `page:${issue.pageId}:${issue.duplicateGroup}:${issue.keyIds.join(',')}`
        : `layouts:${issue.duplicateGroup}:${issue.keyIds.join(',')}`,
    )
    .join(' | ');

  throw new Error(`Duplicate virtual keyboard keys detected: ${message}`);
}
