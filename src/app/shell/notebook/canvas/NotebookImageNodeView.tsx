import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper, useEditorState } from '@tiptap/react';
import { ImageOff } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import type { NotebookAssetPort } from '../../../../lib/notebook';

type ImageLoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; url: string };

export function createNotebookImageNodeView(assetPort: NotebookAssetPort) {
  return function NotebookImageNodeView({
    editor,
    getPos,
    node,
    selected,
  }: ReactNodeViewProps) {
    const assetId = String(node.attrs.assetId ?? '');
    const [loadState, setLoadState] = useState<ImageLoadState>({ status: 'loading' });
    const figureNumber = useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => {
        const ownPosition = getPos();
        if (typeof ownPosition !== 'number' || node.attrs.numbered !== true) return null;
        let count = 0;
        currentEditor.state.doc.descendants((candidate, position) => {
          if (position > ownPosition) return false;
          if (candidate.type.name === 'imageFigure' && candidate.attrs.numbered === true) count += 1;
          return position < ownPosition;
        });
        return count || null;
      },
    });

    useEffect(() => {
      let cancelled = false;
      let objectUrl: string | null = null;
      setLoadState({ status: 'loading' });
      void assetPort.load(assetId).then((payload) => {
        if (cancelled) return;
        if (!payload) {
          setLoadState({ status: 'missing' });
          return;
        }
        objectUrl = URL.createObjectURL(new Blob(
          [payload.bytes as BlobPart],
          { type: payload.metadata.mimeType },
        ));
        setLoadState({ status: 'ready', url: objectUrl });
      }).catch(() => {
        if (!cancelled) setLoadState({ status: 'missing' });
      });
      return () => {
        cancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }, [assetId]);

    const cropStyle = useMemo<CSSProperties | undefined>(() => {
      const { cropX, cropY, cropWidth, cropHeight } = node.attrs;
      if (![cropX, cropY, cropWidth, cropHeight].every((value) => typeof value === 'number')) {
        return undefined;
      }
      return {
        clipPath: `inset(${cropY * 100}% ${(1 - cropX - cropWidth) * 100}% ${(1 - cropY - cropHeight) * 100}% ${cropX * 100}%)`,
      };
    }, [node.attrs]);
    const figureStyle = {
      '--notebook-image-width': `${Number(node.attrs.widthPercent ?? 100)}%`,
      '--notebook-image-rotation': `${Number(node.attrs.rotation ?? 0)}deg`,
    } as CSSProperties;
    const caption = String(node.attrs.caption ?? '').trim();
    const altText = node.attrs.decorative === true ? '' : String(node.attrs.altText ?? '');

    return (
      <NodeViewWrapper
        as="figure"
        className={`notebook-image-figure${selected ? ' is-selected' : ''}`}
        contentEditable={false}
        data-testid="notebook-image-figure"
        data-image-alignment={String(node.attrs.alignment ?? 'center')}
        data-image-placement={String(node.attrs.placement ?? 'normal')}
        onClick={() => {
          const position = getPos();
          if (typeof position === 'number') {
            editor.chain().focus().setNodeSelection(position).run();
          }
        }}
        style={figureStyle}
      >
        <div className="notebook-image-frame">
          {loadState.status === 'ready' ? (
            <img
              alt={altText}
              src={loadState.url}
              style={cropStyle}
            />
          ) : loadState.status === 'missing' ? (
            <div className="notebook-image-missing" role="img" aria-label="Image asset is unavailable">
              <ImageOff aria-hidden="true" size={24} />
              <span>Image asset unavailable</span>
            </div>
          ) : (
            <div className="notebook-image-loading" role="status">Loading image…</div>
          )}
        </div>
        {caption ? (
          <figcaption>
            {figureNumber ? <strong>{`Figure ${figureNumber}. `}</strong> : null}
            {caption}
          </figcaption>
        ) : null}
      </NodeViewWrapper>
    );
  };
}
