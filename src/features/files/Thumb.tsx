import { useEffect, useRef, useState } from 'react';
import { renderPage } from '../../lib/pdfjs';

export const THUMB_WIDTH = 96;

interface Props {
  sourceId: string;
  bytes: ArrayBuffer;
  pageIndex: number;
  /** 利用者が付けた回転（右回り） */
  rotation: number;
  label: string;
}

/** 見えるようになってから描くサムネイル */
export function Thumb({ sourceId, bytes, pageIndex, rotation, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    renderPage(sourceId, bytes, pageIndex, THUMB_WIDTH, rotation).then(
      (u) => alive && setUrl(u),
      (e) => {
        // 外したファイルの描画の中止は想定どおりなので記録しない
        if (!alive) return;
        console.error(e);
        setFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [visible, sourceId, bytes, pageIndex, rotation]);

  return (
    <div ref={ref} className="thumb-sheet">
      {url ? (
        <img src={url} alt={label} draggable={false} />
      ) : (
        <span className="thumb-placeholder">{failed ? '表示できません' : ''}</span>
      )}
    </div>
  );
}
