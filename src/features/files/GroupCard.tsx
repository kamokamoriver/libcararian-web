import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Fragment } from 'react';
import type { FileGroup, SourceFile } from '../../domain/types';
import { useStore } from '../../store';
import { Thumb } from './Thumb';

interface Props {
  group: FileGroup;
  order: number;
  source: SourceFile;
  /** ページ item id → 通しページ位置（0始まり） */
  positions: Map<string, number>;
}

function InsertSlot({ groupId, index }: { groupId: string; index: number }) {
  const insertBlank = useStore((s) => s.insertBlank);
  return (
    <button
      type="button"
      className="insert-slot"
      title="ここに白紙を入れる"
      aria-label="ここに白紙を入れる"
      onClick={() => insertBlank(groupId, index)}
    >
      <span>＋</span>
    </button>
  );
}

export function GroupCard({ group, order, source, positions }: Props) {
  const removeGroup = useStore((s) => s.removeGroup);
  const removeBlank = useStore((s) => s.removeBlank);
  const rotatePage = useStore((s) => s.rotatePage);
  const rotateGroup = useStore((s) => s.rotateGroup);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
  });
  const style = { transform: CSS.Translate.toString(transform), transition };
  const blanks = group.pages.filter((p) => p.kind === 'blank').length;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`group ${isDragging ? 'group-dragging' : ''} ${source.status === 'error' ? 'group-error' : ''}`}
      aria-label={source.name}
    >
      <header className="group-header">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="drag-handle"
          aria-label={`${source.name} を並べ替える`}
          title="ドラッグで並べ替え"
          {...attributes}
          {...listeners}
        >
          <span className="group-order">{String(order).padStart(2, '0')}</span>
        </button>
        <span className="group-name" title={source.name}>
          {source.name}
        </span>
        <span className="hint group-meta">
          {source.status === 'loading' && '読み込み中…'}
          {source.status === 'ready' && `${source.pageCount}ページ${blanks ? `＋白紙${blanks}` : ''}`}
        </span>
        {source.status === 'ready' && (
          <button
            type="button"
            className="link-button"
            onClick={() => rotateGroup(group.id)}
            aria-label={`${source.name} の全ページを右に90°回転`}
            title="全ページを右に90°回転"
          >
            全ページ回転
          </button>
        )}
        <button type="button" className="link-button" onClick={() => removeGroup(group.id)} aria-label={`${source.name} を外す`}>
          外す
        </button>
      </header>

      {source.status === 'error' && (
        <p className="alert alert-error">{source.error ?? '読み込めませんでした'}。このファイルは出力に含めません。</p>
      )}

      {source.status === 'ready' && (
        <div className="thumbs">
          {group.pages.map((p, i) => {
            const pos = positions.get(p.id);
            const caption = pos === undefined ? '' : String(pos + 1);
            return (
              <Fragment key={p.id}>
                <InsertSlot groupId={group.id} index={i} />
                <figure className={`thumb ${p.kind === 'blank' ? 'thumb-blank' : ''}`}>
                  {p.kind === 'source' ? (
                    <Thumb
                      sourceId={source.id}
                      bytes={source.bytes}
                      pageIndex={p.pageIndex}
                      rotation={p.rotation}
                      label={`通しページ ${caption}`}
                    />
                  ) : (
                    <div className="thumb-sheet">
                      <span className="thumb-placeholder">白紙</span>
                    </div>
                  )}
                  <figcaption>
                    <span>
                      {caption}
                      {p.kind === 'source' && p.rotation !== 0 && <span className="thumb-rotation"> {p.rotation}°</span>}
                    </span>
                    {p.kind === 'source' && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => rotatePage(p.id)}
                        aria-label={`通しページ ${caption} を右に90°回転`}
                        title="右に90°回転"
                      >
                        回転
                      </button>
                    )}
                    {p.kind === 'blank' && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => removeBlank(p.id)}
                        aria-label={`通しページ ${caption} の白紙を取り除く`}
                      >
                        取り除く
                      </button>
                    )}
                  </figcaption>
                </figure>
              </Fragment>
            );
          })}
          <InsertSlot groupId={group.id} index={group.pages.length} />
        </div>
      )}
    </article>
  );
}
