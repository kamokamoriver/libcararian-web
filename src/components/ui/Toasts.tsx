import { useStore } from '../../store';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'error' ? 'toast-error' : ''}`}>
          <span>{t.text}</span>
          <button type="button" className="link-button" onClick={() => dismiss(t.id)}>
            閉じる
          </button>
        </div>
      ))}
    </div>
  );
}
