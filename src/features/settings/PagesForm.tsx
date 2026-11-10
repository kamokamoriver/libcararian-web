import { Field } from '../../components/ui/Field';
import { pageFileName, parsePages } from '../../domain/settings';
import { useStore } from '../../store';

export function PagesForm() {
  const s = useStore((st) => st.pages);
  const update = useStore((st) => st.updatePages);
  const { errors } = parsePages(s);

  return (
    <div className="form">
      <p className="hint">全ページを1ページずつのPDFにし、ZIPにまとめます。挿入した白紙も1ページとして出力します。</p>
      <Field label="ファイル名の接頭辞" hint={`例：${pageFileName(s.prefix.trim() || '2025混声', 1)}`} error={errors.prefix}>
        {(id, d) => (
          <input
            id={id}
            aria-describedby={d}
            value={s.prefix}
            placeholder="例：2025混声"
            onChange={(e) => update({ prefix: e.target.value })}
          />
        )}
      </Field>
      <fieldset className="block">
        <label className="check">
          <input type="checkbox" checked={s.convertToB5} onChange={(e) => update({ convertToB5: e.target.checked })} />
          B5に変換する
        </label>
        <p className="hint">オフにすると、元のサイズのまま出力します。</p>
      </fieldset>
    </div>
  );
}
