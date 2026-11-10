import { buildRequest, selectSequence, useStore } from '../../store';

/** 出力を作って確認画面を開く主要ボタンと、処理の進捗 */
export function ConfirmButton({ seqLength }: { seqLength: number }) {
  const job = useStore((s) => s.job);
  const runJob = useStore((s) => s.runJob);
  const setPreviewOpen = useStore((s) => s.setPreviewOpen);
  // 依頼が組めるか（入力ミスがないか）を毎回確かめる
  const problem = useStore((s) => {
    const built = buildRequest(s, selectSequence(s));
    return 'problem' in built ? built.problem : null;
  });
  const running = job.status === 'running';
  const pct = job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;

  return (
    <div className="confirm">
      {job.status === 'done' ? (
        <button type="button" className="button button-primary" onClick={() => setPreviewOpen(true)}>
          確認画面を開く
        </button>
      ) : (
        <button
          type="button"
          className="button button-primary"
          disabled={running || problem !== null}
          onClick={() => void runJob()}
        >
          {running ? '処理中…' : '確認'}
        </button>
      )}
      {problem && !running && seqLength >= 0 && <p className="hint">{problem}</p>}
      {running && (
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="処理の進み具合">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
          <span className="hint">
            処理中 {job.done}/{job.total}
          </span>
        </div>
      )}
    </div>
  );
}
