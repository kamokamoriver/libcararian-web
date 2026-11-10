import { useEffect, useState } from 'react';
import { Toasts } from './components/ui/Toasts';
import { Toolbar } from './features/files/Toolbar';
import { PageList } from './features/files/PageList';
import { PreviewDialog } from './features/preview/PreviewDialog';
import { SettingsPanel } from './features/settings/SettingsPanel';
import { useStore } from './store';

/** 画面のどこにファイルを落としても追加できるようにする */
function useWindowDrop(): boolean {
  const addFiles = useStore((s) => s.addFiles);
  const [over, setOver] = useState(false);
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false;
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setOver(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const overFn = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setOver(false);
      void addFiles([...(e.dataTransfer?.files ?? [])]);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', overFn);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', overFn);
      window.removeEventListener('drop', drop);
    };
  }, [addFiles]);
  return over;
}

export function App() {
  const dragging = useWindowDrop();
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>Libcararian</h1>
          <p className="hint">楽譜PDFの結合・小冊子・曲ごと・ページごと。PDFはこのブラウザの中だけで処理します。</p>
        </div>
        <Toolbar />
      </header>
      <main className="layout">
        <section className="panel pages-panel" aria-label="ページ一覧">
          <PageList />
        </section>
        <aside className="panel settings-panel" aria-label="出力の設定">
          <SettingsPanel />
        </aside>
      </main>
      <footer className="app-footer hint">再読み込みすると、追加したファイルと設定は消えます。</footer>
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          <div>PDFをここにドロップ</div>
        </div>
      )}
      <PreviewDialog />
      <Toasts />
    </div>
  );
}
