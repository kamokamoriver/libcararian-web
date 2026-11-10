import { useMemo } from 'react';
import type { OutputMode } from '../../domain/types';
import { selectSequence, useStore } from '../../store';
import { ConfirmButton } from '../job/ConfirmButton';
import { BookletForm } from './BookletForm';
import { PagesForm } from './PagesForm';
import { SongsForm } from './SongsForm';

const TABS: Array<{ mode: OutputMode; label: string }> = [
  { mode: 'booklet', label: '結合・小冊子' },
  { mode: 'songs', label: '曲ごと' },
  { mode: 'pages', label: 'ページごと' },
];

export function SettingsPanel() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const arrangement = useStore((s) => s.arrangement);
  const sources = useStore((s) => s.sources);
  const seq = useMemo(() => selectSequence({ arrangement, sources }), [arrangement, sources]);
  const errorCount = Object.values(sources).filter((s) => s.status === 'error').length;

  return (
    <div className="settings">
      <div className="tabs" role="tablist" aria-label="出力方法">
        {TABS.map((t) => (
          <button
            key={t.mode}
            type="button"
            role="tab"
            id={`tab-${t.mode}`}
            aria-selected={mode === t.mode}
            aria-controls={`tabpanel-${t.mode}`}
            className="tab"
            onClick={() => setMode(t.mode)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tabpanel" role="tabpanel" id={`tabpanel-${mode}`} aria-labelledby={`tab-${mode}`}>
        {mode === 'booklet' && <BookletForm />}
        {mode === 'songs' && <SongsForm totalPages={seq.length} />}
        {mode === 'pages' && <PagesForm />}
      </div>
      {errorCount > 0 && (
        <p className="alert alert-warn">読み込めないファイルが {errorCount} 件あります。そのファイルは出力に含めません。</p>
      )}
      <ConfirmButton seqLength={seq.length} />
    </div>
  );
}
