import type { BookletOptions, SequencePage } from './types';

/**
 * 通しページ位置 index に印刷する番号。印刷しないなら null。
 * - 値は 位置 + 開始番号 − 表紙のページ数（現行版と同じ）
 * - 白紙は番号を1つ消費するが印刷しない（不変条件6）。page が undefined は調整の白紙
 * - 表紙より前は印刷しない（不変条件7）
 */
export function pageLabel(
  index: number,
  page: SequencePage | undefined,
  opts: Pick<BookletOptions, 'numbering' | 'startNumber' | 'coverPages'>,
): string | null {
  if (!opts.numbering) return null;
  if (page === undefined || page.kind === 'blank') return null;
  if (index < opts.coverPages) return null;
  return String(index + opts.startNumber - opts.coverPages);
}
