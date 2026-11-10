import { Fragment, useId } from 'react';
import { Field } from '../../components/ui/Field';
import { PREFIX_CANDIDATES, validateSongs } from '../../domain/songs';
import { useStore } from '../../store';

export function SongsForm({ totalPages }: { totalPages: number }) {
  const s = useStore((st) => st.songs);
  const update = useStore((st) => st.updateSongs);
  const updateRow = useStore((st) => st.updateSongRow);
  const addRow = useStore((st) => st.addSongRow);
  const removeRow = useStore((st) => st.removeSongRow);
  const listId = useId();
  const v = validateSongs(s, totalPages);

  return (
    <div className="form">
      <p className="hint">
        並べたページを、曲ごとのPDF（接頭辞＋No.2桁＋曲名.pdf）に分けてZIPにまとめます。ページは楽譜に印刷されている番号で指定します。
      </p>
      <div className="row">
        <Field label="接頭辞" hint="空欄も可">
          {(id, d) => (
            <>
              <input
                id={id}
                aria-describedby={d}
                list={listId}
                value={s.prefix}
                placeholder="例：混声"
                onChange={(e) => update({ prefix: e.target.value })}
              />
              <datalist id={listId}>
                {PREFIX_CANDIDATES.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="冒頭ページ番号" hint="1ページ目に印刷されている番号">
          {(id, d) => (
            <input
              id={id}
              aria-describedby={d}
              className="input-number"
              inputMode="numeric"
              value={s.initialPage}
              onChange={(e) => update({ initialPage: e.target.value })}
            />
          )}
        </Field>
      </div>

      <table className="songs-table">
        <thead>
          <tr>
            <th scope="col">No.</th>
            <th scope="col">曲名</th>
            <th scope="col">開始</th>
            <th scope="col">終了</th>
            <th scope="col">
              <span className="visually-hidden">操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {s.rows.map((r, i) => {
            const issues = v.rowIssues[r.id] ?? [];
            const level = issues.some((x) => x.level === 'error') ? 'error' : issues.length ? 'warn' : '';
            const cell = (key: 'number' | 'name' | 'start' | 'end', label: string, numeric: boolean) => (
              <td>
                <input
                  aria-label={`${i + 1}行目の${label}`}
                  aria-invalid={level === 'error' || undefined}
                  inputMode={numeric ? 'numeric' : undefined}
                  value={r[key]}
                  onChange={(e) => updateRow(r.id, { [key]: e.target.value })}
                />
              </td>
            );
            return (
              <Fragment key={r.id}>
                <tr className={level ? `row-${level}` : undefined}>
                  {cell('number', 'No.', true)}
                  {cell('name', '曲名', false)}
                  {cell('start', '開始ページ', true)}
                  {cell('end', '終了ページ', true)}
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => removeRow(r.id)}
                      aria-label={`${i + 1}行目を削除`}
                    >
                      削除
                    </button>
                  </td>
                </tr>
                {issues.length > 0 && (
                  <tr className={`row-issues row-${level}`}>
                    <td colSpan={5}>
                      {issues.map((x, k) => (
                        <p key={k} className={x.level === 'error' ? 'field-error' : 'field-warn'}>
                          {x.message}
                        </p>
                      ))}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <button type="button" className="button" onClick={addRow}>
        曲を追加
      </button>
      {v.generalErrors.length > 0 && (
        <div className="alert alert-error">
          {v.generalErrors.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}
    </div>
  );
}

