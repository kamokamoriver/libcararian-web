import { Field } from '../../components/ui/Field';
import { DEFAULT_BOOKLET_NAME, parseBooklet } from '../../domain/settings';
import { useStore } from '../../store';

export function BookletForm() {
  const s = useStore((st) => st.booklet);
  const update = useStore((st) => st.updateBooklet);
  const { errors } = parseBooklet(s);

  return (
    <div className="form">
      <p className="hint">全ページを並び順につなげ、B5に変換して1つのPDFにします。</p>
      <Field label="ファイル名" hint={`空欄なら「${DEFAULT_BOOKLET_NAME}.pdf」`} error={errors.fileName}>
        {(id, d) => (
          <input
            id={id}
            aria-describedby={d}
            value={s.fileName}
            placeholder="例：男声結合ファイル"
            onChange={(e) => update({ fileName: e.target.value })}
          />
        )}
      </Field>

      <fieldset className="block">
        <label className="check">
          <input type="checkbox" checked={s.booklet} onChange={(e) => update({ booklet: e.target.checked })} />
          小冊子にする（B4見開き・中綴じ）
        </label>
        <p className="hint">4の倍数に足りない分は、末尾に白紙を足します。</p>
        {s.booklet && (
          <Field label="中央余白（mm）" error={errors.centerGapMm}>
            {(id, d) => (
              <input
                id={id}
                aria-describedby={d}
                className="input-number"
                inputMode="decimal"
                value={s.centerGapMm}
                onChange={(e) => update({ centerGapMm: e.target.value })}
              />
            )}
          </Field>
        )}
      </fieldset>

      <fieldset className="block">
        <label className="check">
          <input type="checkbox" checked={s.numbering} onChange={(e) => update({ numbering: e.target.checked })} />
          ページ番号を付ける
        </label>
        <p className="hint">白紙には番号を印刷しません（番号は1つ進みます）。</p>
        {s.numbering && (
          <div className="row">
            <Field label="開始番号" error={errors.startNumber}>
              {(id, d) => (
                <input
                  id={id}
                  aria-describedby={d}
                  className="input-number"
                  inputMode="numeric"
                  value={s.startNumber}
                  onChange={(e) => update({ startNumber: e.target.value })}
                />
              )}
            </Field>
            <Field label="表紙のページ数" hint="番号を付けない先頭のページ数" error={errors.coverPages}>
              {(id, d) => (
                <input
                  id={id}
                  aria-describedby={d}
                  className="input-number"
                  inputMode="numeric"
                  value={s.coverPages}
                  onChange={(e) => update({ coverPages: e.target.value })}
                />
              )}
            </Field>
          </div>
        )}
      </fieldset>
    </div>
  );
}
