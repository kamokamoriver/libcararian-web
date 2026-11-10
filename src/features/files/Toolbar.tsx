import { useRef, useState } from 'react';
import { useStore } from '../../store';

export function Toolbar() {
  const addFiles = useStore((s) => s.addFiles);
  const sortByName = useStore((s) => s.sortByName);
  const clear = useStore((s) => s.clear);
  const count = useStore((s) => s.arrangement.groups.length);
  const input = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="toolbar">
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        data-testid="file-input"
        onChange={(e) => {
          void addFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
      <button type="button" className="button" onClick={() => input.current?.click()}>
        PDFを追加
      </button>
      <button type="button" className="button" onClick={sortByName} disabled={count < 2}>
        名前順
      </button>
      {confirming ? (
        <span className="confirm-inline" role="group" aria-label="すべてのファイルを外しますか">
          <span>すべて外しますか？</span>
          <button
            type="button"
            className="button button-danger"
            onClick={() => {
              clear();
              setConfirming(false);
            }}
          >
            外す
          </button>
          <button type="button" className="button" onClick={() => setConfirming(false)}>
            やめる
          </button>
        </span>
      ) : (
        <button type="button" className="button" onClick={() => setConfirming(true)} disabled={count === 0}>
          クリア
        </button>
      )}
    </div>
  );
}
