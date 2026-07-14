import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model';
import { AllSelection, TextSelection } from '@tiptap/pm/state';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ChevronDown,
  List,
  ListCollapse,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
} from 'lucide-react';
import { useRef } from 'react';

import {
  NOTEBOOK_BULLET_STYLES,
  NOTEBOOK_LINE_SPACINGS,
  NOTEBOOK_ORDERED_STYLES,
  NOTEBOOK_PARAGRAPH_LEFT_INDENTS_PT,
  NOTEBOOK_PARAGRAPH_SPACES_PT,
  type NotebookBulletStyle,
  type NotebookLineSpacing,
  type NotebookOrderedStyle,
  type NotebookParagraphSpacePt,
  type NotebookTextAlignment,
} from '../../../../lib/notebook';
import { NotebookFloatingLayer, useNotebookTransientLayer } from '../transient-ui';
import {
  captureNotebookToolbarSelection,
  restoreNotebookToolbarSelection,
  type NotebookToolbarSelection,
} from './notebookToolbarSelection';

type AttributeState<T> = {
  eligible: boolean;
  mixed: boolean;
  value: T | null;
};

type IndentTarget = {
  node: ProseMirrorNode;
  position: number;
  insideList: boolean;
};

type IndentSelectionKind = 'prose' | 'list' | 'mixed' | 'none';

function selectedNodes(editor: Editor, types: readonly string[]) {
  const nodes: ProseMirrorNode[] = [];
  const seen = new Set<ProseMirrorNode>();
  const add = (node: ProseMirrorNode) => {
    if (types.includes(node.type.name) && !seen.has(node)) {
      seen.add(node);
      nodes.push(node);
    }
  };
  const { doc, selection } = editor.state;
  if (selection.empty) {
    for (let depth = selection.$from.depth; depth >= 0; depth -= 1) {
      add(selection.$from.node(depth));
    }
  } else {
    doc.nodesBetween(selection.from, selection.to, add);
    for (let depth = selection.$from.depth; depth >= 0; depth -= 1) {
      add(selection.$from.node(depth));
    }
    for (let depth = selection.$to.depth; depth >= 0; depth -= 1) {
      add(selection.$to.node(depth));
    }
  }
  return nodes;
}

function textBlockAt($position: ResolvedPos): IndentTarget | null {
  let textBlockDepth = -1;
  let insideList = false;
  for (let depth = $position.depth; depth >= 0; depth -= 1) {
    const node = $position.node(depth);
    if (node.type.name === 'listItem') {
      insideList = true;
    }
    if (textBlockDepth < 0 && (node.type.name === 'paragraph' || node.type.name === 'heading')) {
      textBlockDepth = depth;
    }
  }
  if (textBlockDepth < 0) {
    return null;
  }
  return {
    node: $position.node(textBlockDepth),
    position: $position.before(textBlockDepth),
    insideList,
  };
}

function selectedIndentTargets(editor: Editor): IndentTarget[] {
  const { doc, selection } = editor.state;
  const targets = new Map<number, IndentTarget>();
  const add = (target: IndentTarget | null) => {
    if (target) {
      targets.set(target.position, target);
    }
  };

  if (selection.empty) {
    add(textBlockAt(selection.$from));
  } else {
    doc.nodesBetween(selection.from, selection.to, (node, position) => {
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        add(textBlockAt(doc.resolve(position + 1)));
      }
    });
    add(textBlockAt(selection.$from));
    add(textBlockAt(selection.$to));
  }

  return [...targets.values()];
}

function indentSelectionKind(targets: readonly IndentTarget[]): IndentSelectionKind {
  if (!targets.length) {
    return 'none';
  }
  const kinds = new Set(targets.map((target) => target.insideList ? 'list' : 'prose'));
  return kinds.size === 1 ? [...kinds][0]! : 'mixed';
}

function currentLeftIndentPt(node: ProseMirrorNode) {
  return NOTEBOOK_PARAGRAPH_LEFT_INDENTS_PT.find(
    (value) => value === node.attrs.notebookLeftIndentPt,
  ) ?? 0;
}

function applyProseIndent(
  editor: Editor,
  selection: NotebookToolbarSelection | null,
  amount: number,
) {
  restoreNotebookToolbarSelection(editor, selection).run();
  const transaction = editor.state.tr;
  const minimum = NOTEBOOK_PARAGRAPH_LEFT_INDENTS_PT[0] ?? 0;
  const maximum = NOTEBOOK_PARAGRAPH_LEFT_INDENTS_PT.at(-1) ?? 288;
  selectedIndentTargets(editor)
    .filter((target) => !target.insideList)
    .forEach((target) => {
      const next = Math.max(minimum, Math.min(maximum, currentLeftIndentPt(target.node) + amount));
      const nextAttribute = next === minimum ? null : next;
      if ((target.node.attrs.notebookLeftIndentPt ?? null) !== nextAttribute) {
        transaction.setNodeMarkup(target.position, undefined, {
          ...target.node.attrs,
          notebookLeftIndentPt: nextAttribute,
        });
      }
    });
  if (transaction.docChanged) {
    editor.view.dispatch(transaction.scrollIntoView());
  }
}

function attributeState<T>(
  nodes: readonly ProseMirrorNode[],
  attribute: string,
  fallback: T | null = null,
): AttributeState<T> {
  if (!nodes.length) {
    return { eligible: false, mixed: false, value: null };
  }
  const values = new Set<T | null>();
  nodes.forEach((node) => {
    const value = node.attrs[attribute];
    values.add(value === null || value === undefined ? fallback : value as T);
  });
  return values.size === 1
    ? { eligible: true, mixed: false, value: [...values][0] ?? null }
    : { eligible: true, mixed: true, value: null };
}

function applyParagraphAttributes(
  editor: Editor,
  selection: NotebookToolbarSelection | null,
  attributes: Record<string, unknown>,
) {
  restoreNotebookToolbarSelection(editor, selection)
    .updateAttributes('paragraph', attributes)
    .updateAttributes('heading', attributes)
    .run();
}

const ALIGNMENTS: Array<{
  value: NotebookTextAlignment;
  label: string;
  icon: typeof AlignLeft;
}> = [
  { value: 'left', label: 'Align left', icon: AlignLeft },
  { value: 'center', label: 'Align center', icon: AlignCenter },
  { value: 'right', label: 'Align right', icon: AlignRight },
  { value: 'justify', label: 'Justify', icon: AlignJustify },
];

const BULLET_LABELS: Record<NotebookBulletStyle, string> = {
  disc: 'Disc bullets',
  circle: 'Circle bullets',
  square: 'Square bullets',
  dash: 'Dash bullets',
};

const ORDERED_LABELS: Record<NotebookOrderedStyle, string> = {
  decimal: 'Decimal numbering',
  'lower-alpha': 'Lower-alpha numbering',
  'lower-roman': 'Lower-roman numbering',
};

const BULLET_PREVIEWS: Record<NotebookBulletStyle, readonly string[]> = {
  disc: ['•', '•', '•'],
  circle: ['○', '○', '○'],
  square: ['▪', '▪', '▪'],
  dash: ['–', '–', '–'],
};

const ORDERED_PREVIEWS: Record<NotebookOrderedStyle, readonly string[]> = {
  decimal: ['1.', '2.', '3.'],
  'lower-alpha': ['a.', 'b.', 'c.'],
  'lower-roman': ['i.', 'ii.', 'iii.'],
};

function applyListStyle(
  editor: Editor,
  selection: NotebookToolbarSelection | null,
  kind: 'bulletList' | 'orderedList',
  style: NotebookBulletStyle | NotebookOrderedStyle,
  toggleDefault: boolean,
) {
  restoreNotebookToolbarSelection(editor, selection);
  const { doc, selection: restoredSelection } = editor.state;
  const first = doc.firstChild;
  const last = doc.lastChild;
  if (
    restoredSelection instanceof AllSelection
    && doc.childCount === 2
    && first
    && (first.type.name === 'bulletList' || first.type.name === 'orderedList')
    && last?.type.name === 'paragraph'
    && last.content.size === 0
  ) {
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.between(
      doc.resolve(1),
      doc.resolve(first.nodeSize - 1),
    )));
  }
  const active = editor.isActive(kind);
  const fallback = kind === 'bulletList' ? 'disc' : 'decimal';
  const currentStyle = editor.getAttributes(kind).notebookListStyle ?? fallback;
  if (toggleDefault && active && currentStyle === style) {
    editor.chain().focus().toggleList(kind, 'listItem').run();
    return;
  }
  if (active) {
    editor.chain().focus().updateAttributes(kind, { notebookListStyle: style }).run();
    return;
  }
  editor.chain()
    .focus()
    .toggleList(kind, 'listItem', true, { notebookListStyle: style })
    .updateAttributes(kind, { notebookListStyle: style })
    .run();
}

function ListSplitControl({
  editor,
  kind,
}: {
  editor: Editor;
  kind: 'bulletList' | 'orderedList';
}) {
  const isBullet = kind === 'bulletList';
  const menu = useNotebookTransientLayer({
    id: isBullet ? 'notebook-bullet-style-menu' : 'notebook-number-style-menu',
  });
  const selectionRef = useRef<NotebookToolbarSelection | null>(null);
  const styles = isBullet ? NOTEBOOK_BULLET_STYLES : NOTEBOOK_ORDERED_STYLES;
  const defaultStyle = isBullet ? 'disc' : 'decimal';
  const listNodes = selectedNodes(editor, [kind]);
  const currentStyle = attributeState<string>(listNodes, 'notebookListStyle', defaultStyle);
  const Icon = isBullet ? List : ListOrdered;
  const mainLabel = isBullet ? 'Bullet list' : 'Numbered list';
  const menuLabel = isBullet ? 'Bullet styles' : 'Numbering styles';

  function toggleMenu() {
    if (!menu.isOpen) {
      selectionRef.current = captureNotebookToolbarSelection(editor);
    }
    menu.toggle();
  }

  return (
    <div className="notebook-ribbon-split-control notebook-list-split-control">
      <button
        type="button"
        aria-label={mainLabel}
        aria-pressed={editor.isActive(kind)}
        className={editor.isActive(kind) ? 'is-active' : undefined}
        title={mainLabel}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => applyListStyle(
          editor,
          captureNotebookToolbarSelection(editor),
          kind,
          defaultStyle,
          true,
        )}
      >
        <Icon aria-hidden="true" size={16} />
      </button>
      <button
        data-notebook-transient-trigger={menu.id}
        type="button"
        className="notebook-split-arrow"
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        title={menuLabel}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleMenu}
      >
        <ChevronDown aria-hidden="true" size={12} />
      </button>
      {menu.isOpen ? (
        <NotebookFloatingLayer
          layerId={menu.id}
          className="notebook-list-style-menu"
          role="menu"
          aria-label={menuLabel}
        >
          {styles.map((style) => {
            const label = isBullet
              ? BULLET_LABELS[style as NotebookBulletStyle]
              : ORDERED_LABELS[style as NotebookOrderedStyle];
            const preview = isBullet
              ? BULLET_PREVIEWS[style as NotebookBulletStyle]
              : ORDERED_PREVIEWS[style as NotebookOrderedStyle];
            return (
              <button
                key={style}
                type="button"
                role="menuitemradio"
                aria-label={label}
                aria-checked={!currentStyle.mixed && currentStyle.value === style}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  applyListStyle(editor, selectionRef.current, kind, style, false);
                  menu.close(false);
                }}
              >
                <span className="notebook-list-style-preview" aria-hidden="true">
                  {preview.map((marker, index) => (
                    <span key={`${marker}-${index}`}>
                      <b>{marker}</b>
                      <i />
                    </span>
                  ))}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </NotebookFloatingLayer>
      ) : null}
    </div>
  );
}

function IndentControls({ editor }: { editor: Editor }) {
  const targets = selectedIndentTargets(editor);
  const kind = indentSelectionKind(targets);
  const minimum = NOTEBOOK_PARAGRAPH_LEFT_INDENTS_PT[0] ?? 0;
  const maximum = NOTEBOOK_PARAGRAPH_LEFT_INDENTS_PT.at(-1) ?? 288;
  const proseCanIncrease = targets.some(
    (target) => !target.insideList && currentLeftIndentPt(target.node) < maximum,
  );
  const proseCanDecrease = targets.some(
    (target) => !target.insideList && currentLeftIndentPt(target.node) > minimum,
  );
  const canIncrease = kind === 'prose'
    ? proseCanIncrease
    : kind === 'list'
      ? editor.can().sinkListItem('listItem')
      : false;
  const canDecrease = kind === 'prose'
    ? proseCanDecrease
    : kind === 'list'
      ? editor.can().liftListItem('listItem')
      : false;
  const blockedMessage = kind === 'mixed'
    ? 'Select only prose or only list items to change indentation'
    : kind === 'none'
      ? 'Select a paragraph, heading, or list item to change indentation'
      : null;

  function increaseIndent() {
    const selection = captureNotebookToolbarSelection(editor);
    if (kind === 'list') {
      restoreNotebookToolbarSelection(editor, selection).sinkListItem('listItem').run();
      return;
    }
    if (kind === 'prose') {
      applyProseIndent(editor, selection, 36);
    }
  }

  function decreaseIndent() {
    const selection = captureNotebookToolbarSelection(editor);
    if (kind === 'list') {
      restoreNotebookToolbarSelection(editor, selection).liftListItem('listItem').run();
      return;
    }
    if (kind === 'prose') {
      applyProseIndent(editor, selection, -36);
    }
  }

  return (
    <div className="notebook-indent-controls" role="group" aria-label="Paragraph indentation">
      <button
        type="button"
        disabled={!canDecrease}
        aria-label="Decrease indent"
        title={blockedMessage ?? (kind === 'list'
          ? 'Promote list item'
          : canDecrease ? 'Decrease indent' : 'Already at the minimum indent')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={decreaseIndent}
      >
        <ListIndentDecrease aria-hidden="true" size={16} />
      </button>
      <button
        type="button"
        disabled={!canIncrease}
        aria-label="Increase indent"
        title={blockedMessage ?? (kind === 'list'
          ? 'Make list item a subitem'
          : canIncrease ? 'Increase indent' : 'Already at the maximum indent')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={increaseIndent}
      >
        <ListIndentIncrease aria-hidden="true" size={16} />
      </button>
    </div>
  );
}

function SpacingControl({ editor }: { editor: Editor }) {
  const menu = useNotebookTransientLayer({ id: 'notebook-paragraph-spacing-menu' });
  const selectionRef = useRef<NotebookToolbarSelection | null>(null);
  const paragraphNodes = selectedNodes(editor, ['paragraph', 'heading']);
  const line = attributeState<NotebookLineSpacing>(paragraphNodes, 'notebookLineSpacing');
  const before = attributeState<NotebookParagraphSpacePt>(paragraphNodes, 'notebookSpaceBeforePt');
  const after = attributeState<NotebookParagraphSpacePt>(paragraphNodes, 'notebookSpaceAfterPt');
  const mixed = line.mixed || before.mixed || after.mixed;
  const isDefault = !mixed && line.value === null && before.value === null && after.value === null;
  const stateLabel = mixed
    ? 'Mixed'
    : isDefault
      ? 'Default'
      : before.value !== null || after.value !== null
        ? 'Custom'
        : `${line.value} lines`;

  function toggleMenu() {
    if (!menu.isOpen) {
      selectionRef.current = captureNotebookToolbarSelection(editor);
    }
    menu.toggle();
  }

  function apply(attributes: Record<string, unknown>) {
    applyParagraphAttributes(editor, selectionRef.current, attributes);
    menu.close(false);
  }

  return (
    <div className="notebook-spacing-control">
      <button
        data-notebook-transient-trigger={menu.id}
        type="button"
        disabled={!line.eligible}
        className={!isDefault || mixed ? 'is-active' : undefined}
        aria-label={`Line and paragraph spacing: ${stateLabel}`}
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        title="Line and paragraph spacing"
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleMenu}
      >
        <ListCollapse aria-hidden="true" size={16} />
        <ChevronDown aria-hidden="true" size={12} />
      </button>
      {menu.isOpen ? (
        <NotebookFloatingLayer
          align="end"
          layerId={menu.id}
          className="notebook-spacing-menu"
          role="menu"
          aria-label="Line and paragraph spacing"
        >
          <button
            type="button"
            className="notebook-spacing-reset"
            role="menuitemradio"
            aria-checked={isDefault}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => apply({
              notebookLineSpacing: null,
              notebookSpaceBeforePt: null,
              notebookSpaceAfterPt: null,
            })}
          >
            Default spacing
          </button>
          <SpacingChoices
            label="Line spacing"
            values={NOTEBOOK_LINE_SPACINGS}
            current={line}
            suffix=""
            onApply={(value) => apply({ notebookLineSpacing: value })}
          />
          <SpacingChoices
            label="Before"
            values={NOTEBOOK_PARAGRAPH_SPACES_PT}
            current={before}
            suffix=" pt"
            onApply={(value) => apply({ notebookSpaceBeforePt: value })}
          />
          <SpacingChoices
            label="After"
            values={NOTEBOOK_PARAGRAPH_SPACES_PT}
            current={after}
            suffix=" pt"
            onApply={(value) => apply({ notebookSpaceAfterPt: value })}
          />
        </NotebookFloatingLayer>
      ) : null}
    </div>
  );
}

function SpacingChoices<T extends number>({
  label,
  values,
  current,
  suffix,
  onApply,
}: {
  label: string;
  values: readonly T[];
  current: AttributeState<T>;
  suffix: string;
  onApply: (value: T) => void;
}) {
  return (
    <section className="notebook-spacing-choices" aria-label={label}>
      <span>{label}</span>
      <div>
        {values.map((value) => (
          <button
            key={value}
            type="button"
            role="menuitemradio"
            aria-label={`${label} ${value}${suffix}`}
            aria-checked={!current.mixed && current.value === value}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onApply(value)}
          >
            {value}{suffix}
          </button>
        ))}
      </div>
    </section>
  );
}

export function NotebookParagraphControls({ editor }: { editor: Editor }) {
  const paragraphNodes = selectedNodes(editor, ['paragraph', 'heading']);
  const alignment = attributeState<NotebookTextAlignment>(
    paragraphNodes,
    'notebookAlignment',
    'left',
  );

  return (
    <>
      <ListSplitControl editor={editor} kind="bulletList" />
      <ListSplitControl editor={editor} kind="orderedList" />
      <IndentControls editor={editor} />
      <div className="notebook-alignment-controls" role="group" aria-label="Paragraph alignment">
        {ALIGNMENTS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            disabled={!alignment.eligible}
            aria-label={label}
            aria-pressed={!alignment.mixed && alignment.value === value}
            className={!alignment.mixed && alignment.value === value ? 'is-active' : undefined}
            title={label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyParagraphAttributes(
              editor,
              captureNotebookToolbarSelection(editor),
              { notebookAlignment: value },
            )}
          >
            <Icon aria-hidden="true" size={16} />
          </button>
        ))}
      </div>
      <SpacingControl editor={editor} />
    </>
  );
}
