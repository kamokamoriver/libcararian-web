import { FORBIDDEN_LABEL, hasForbiddenChars, parseIntLoose } from './parse';
import type { Song, SongRow, SongsOptions, SongsSettings } from './types';

/** 現行版と同じ命名: {接頭辞}{No.を2桁ゼロ埋め}{曲名}.pdf */
export function songFileName(prefix: string, song: Pick<Song, 'number' | 'name'>): string {
  return `${prefix}${String(song.number).padStart(2, '0')}${song.name}.pdf`;
}

export interface RowIssue {
  level: 'error' | 'warning';
  message: string;
}

export interface SongsValidation {
  options: SongsOptions | null;
  /** 行 id ごとの問題 */
  rowIssues: Record<string, RowIssue[]>;
  /** 行に紐づかない問題 */
  generalErrors: string[];
  hasErrors: boolean;
}

export const PREFIX_CANDIDATES = ['混声', '女声', '男声'];

export const DEFAULT_SONGS_INITIAL_PAGE = '1';

export function isBlankRow(r: SongRow): boolean {
  return !r.number.trim() && !r.name.trim() && !r.start.trim() && !r.end.trim();
}

/**
 * 曲リストを検証する（DESIGN 不変条件10〜13）。
 * 全部が空の行は無視する。totalPages は通しページの総数。
 */
export function validateSongs(s: SongsSettings, totalPages: number): SongsValidation {
  const rowIssues: Record<string, RowIssue[]> = {};
  const generalErrors: string[] = [];
  const songs: Song[] = [];
  const seen = new Map<string, number>();

  const prefix = s.prefix.trim();
  if (hasForbiddenChars(prefix)) generalErrors.push(`接頭辞に使えない文字（${FORBIDDEN_LABEL}）が含まれています`);
  const initialPage = parseIntLoose(s.initialPage);
  if (initialPage === null) generalErrors.push('冒頭ページ番号を整数で入力してください');

  s.rows.forEach((r, rowIndex) => {
    if (isBlankRow(r)) return;
    const issues: RowIssue[] = [];
    const err = (message: string) => issues.push({ level: 'error', message });

    const number = parseIntLoose(r.number);
    if (!r.number.trim()) err('No. を入力してください');
    else if (number === null || number < 0) err('No. は0以上の整数で入力してください');

    const name = r.name.trim();
    if (!name) err('曲名を入力してください');
    else if (hasForbiddenChars(name)) err(`曲名に使えない文字（${FORBIDDEN_LABEL}）が含まれています`);

    const start = parseIntLoose(r.start);
    const end = parseIntLoose(r.end);
    if (start === null || end === null) err('開始・終了ページを整数で入力してください');
    else if (end < start) err('終了ページが開始ページより前になっています');
    else if (initialPage !== null) {
      const first = start - initialPage;
      const last = end - initialPage;
      const inRange = Math.max(0, Math.min(last, totalPages - 1) - Math.max(first, 0) + 1);
      const range = totalPages > 0 ? `${initialPage}〜${initialPage + totalPages - 1}` : 'なし';
      if (inRange === 0) err(`ページ ${start}〜${end} が楽譜の範囲（${range}）の外にあります`);
      else if (inRange < last - first + 1) {
        issues.push({
          level: 'warning',
          message: `一部のページが楽譜の範囲（${range}）の外にあるため、その分は含まれません`,
        });
      }
    }

    if (!issues.some((i) => i.level === 'error') && number !== null && start !== null && end !== null) {
      const song: Song = { number, name, start, end };
      const fname = songFileName(prefix, song);
      const dup = seen.get(fname.toLowerCase());
      if (dup !== undefined) err(`ファイル名「${fname}」が ${dup + 1} 行目と重なっています`);
      else {
        seen.set(fname.toLowerCase(), rowIndex);
        songs.push(song);
      }
    }
    if (issues.length) rowIssues[r.id] = issues;
  });

  const anyRowError = Object.values(rowIssues).some((list) => list.some((i) => i.level === 'error'));
  if (songs.length === 0 && !anyRowError && generalErrors.length === 0) generalErrors.push('曲を1つ以上入力してください');
  const hasErrors = anyRowError || generalErrors.length > 0;
  return {
    options: hasErrors || initialPage === null ? null : { prefix, initialPage, songs },
    rowIssues,
    generalErrors,
    hasErrors,
  };
}

/** 「曲を追加」で入れる行。前の行の次の No. と、前の行の終了の次のページを入れる */
export function nextSongRow(rows: SongRow[], id: string): SongRow {
  const last = rows[rows.length - 1];
  const n = last ? parseIntLoose(last.number) : null;
  const e = last ? parseIntLoose(last.end) : null;
  return {
    id,
    number: n !== null ? String(n + 1) : rows.length === 0 ? '1' : '',
    name: '',
    start: e !== null ? String(e + 1) : '',
    end: '',
  };
}
