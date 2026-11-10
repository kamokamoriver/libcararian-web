import { useEffect, useRef, useState } from 'react';
import { downloadOutputs } from '../../lib/download';
import { release, renderPage } from '../../lib/pdfjs';
import { useStore, type OutputResult } from '../../store';

const PREVIEW_WIDTH = 900;

function PageImage({ docKey, bytes, pageIndex, alt }: { docKey: string; bytes: Uint8Array; pageIndex: number; alt: string }) {
  const [state, setState] = useState<{ key: string; url: string | null; failed: boolean }>({ key: '', url: null, failed: false });
  const key = `${docKey}:${pageIndex}`;
  useEffect(() => {
    let alive = true;
    renderPage(docKey, bytes, pageIndex, PREVIEW_WIDTH).then(
      (url) => alive && setState({ key, url, failed: false }),
      (e) => {
        // 閉じたあとの描画の中止は想定どおりなので記録しない
        if (!alive) return;
        console.error(e);
        setState({ key, url: null, failed: true });
      },
    );
    return () => {
      alive = false;
    };
  }, [docKey, bytes, pageIndex, key]);
  const current = state.key === key ? state : { url: null, failed: false };
  if (current.url) return <img className="preview-sheet" src={current.url} alt={alt} />;
  return <div className="preview-loading hint">{current.failed ? '表示できませんでした' : '表示しています…'}</div>;
}

function PreviewBody({ result, revision }: { result: OutputResult; revision: number }) {
  const [fileIndex, setFileIndex] = useState(0);
  const [page, setPage] = useState(0);
  const file = result.files[fileIndex];
  const docKey = `out-${revision}-${fileIndex}`;
  const unit = result.booklet ? '面目' : 'ページ';

  // 閉じたら、確認画面で描いた画像を捨てる
  useEffect(() => () => result.files.forEach((_, i) => release(`out-${revision}-${i}`)), [result, revision]);

  return (
    <div className="preview-body">
      {result.files.length > 1 && (
        <ul className="preview-files" aria-label="出力ファイル">
          {result.files.map((f, i) => (
            <li key={f.name}>
              <button
                type="button"
                className={`preview-file ${i === fileIndex ? 'is-current' : ''}`}
                aria-current={i === fileIndex || undefined}
                onClick={() => {
                  setFileIndex(i);
                  setPage(0);
                }}
              >
                <span>{f.name}</span>
                <span className="hint">{f.pageCount}p</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="preview-main">
        <div className="preview-stage">
          <PageImage docKey={docKey} bytes={file.bytes} pageIndex={page} alt={`${file.name} ${page + 1}${unit}`} />
        </div>
        <div className="preview-nav">
          <button type="button" className="button" disabled={page === 0} onClick={() => setPage(page - 1)}>
            前へ
          </button>
          <span>
            {page + 1} / {file.pageCount} {unit}
          </span>
          <button type="button" className="button" disabled={page >= file.pageCount - 1} onClick={() => setPage(page + 1)}>
            次へ
          </button>
        </div>
      </div>
    </div>
  );
}

export function PreviewDialog() {
  const open = useStore((s) => s.previewOpen);
  const result = useStore((s) => s.job.result);
  const revision = useStore((s) => s.revision);
  const setOpen = useStore((s) => s.setPreviewOpen);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && result && !d.open) d.showModal();
    if ((!open || !result) && d.open) d.close();
  }, [open, result]);

  const summary =
    result &&
    (result.files.length === 1
      ? `${result.files[0].name}（${result.files[0].pageCount}${result.booklet ? '面（B4）' : 'ページ'}）`
      : `${result.files.length}ファイル → ${result.zipName}`);

  return (
    <dialog ref={ref} className="preview" onClose={() => setOpen(false)} aria-labelledby="preview-title">
      {open && result && (
        <>
          <header className="preview-header">
            <div>
              <h2 id="preview-title">出力の確認</h2>
              <p className="hint">{summary}</p>
            </div>
            <div className="preview-actions">
              <button type="button" className="button" onClick={() => setOpen(false)}>
                閉じる
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => downloadOutputs(result.files, result.zipName)}
              >
                ダウンロード
              </button>
            </div>
          </header>
          <PreviewBody result={result} revision={revision} />
        </>
      )}
    </dialog>
  );
}
