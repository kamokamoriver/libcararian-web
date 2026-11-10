import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useMemo, useRef } from 'react';
import { selectSequence, useStore } from '../../store';
import { GroupCard } from './GroupCard';

function EmptyDropzone() {
  const addFiles = useStore((s) => s.addFiles);
  const input = useRef<HTMLInputElement>(null);
  return (
    <button type="button" className="dropzone" onClick={() => input.current?.click()}>
      <span className="dropzone-main">PDFをここにドロップ</span>
      <span className="hint">またはクリックして選択（複数可）。並べた順番で出力します。</span>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={(e) => {
          void addFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
    </button>
  );
}

export function PageList() {
  const arrangement = useStore((s) => s.arrangement);
  const sources = useStore((s) => s.sources);
  const moveGroup = useStore((s) => s.moveGroup);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const seq = useMemo(() => selectSequence({ arrangement, sources }), [arrangement, sources]);
  const positions = useMemo(() => new Map(seq.map((p, i) => [p.itemId, i])), [seq]);

  if (arrangement.groups.length === 0) return <EmptyDropzone />;

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = arrangement.groups.map((g) => g.id);
    moveGroup(ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
  };

  return (
    <div className="page-list">
      <div className="page-list-head">
        <h2>ページ一覧</h2>
        <span className="hint">
          通し {seq.length} ページ。番号をドラッグしてファイルを並べ替え、ページの間の「＋」で白紙を入れます。
        </span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={arrangement.groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          {arrangement.groups.map((g, i) => {
            const source = sources[g.sourceId];
            return source ? <GroupCard key={g.id} group={g} order={i + 1} source={source} positions={positions} /> : null;
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}
