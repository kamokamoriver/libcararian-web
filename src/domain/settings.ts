import { FORBIDDEN_LABEL, hasForbiddenChars, parseIntLoose, parseNumberLoose } from './parse';
import type { BookletOptions, BookletSettings, PagesOptions, PagesSettings } from './types';

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export interface Parsed<T, K extends string> {
  options: T | null;
  errors: FieldErrors<K>;
}

/** 初期値は現行版と同じ（小冊子・番号はオフ、余白20mm、開始1、表紙0） */
export const DEFAULT_BOOKLET: BookletSettings = {
  fileName: '',
  booklet: false,
  centerGapMm: '20',
  numbering: false,
  startNumber: '1',
  coverPages: '0',
};

export const DEFAULT_PAGES: PagesSettings = { prefix: '', convertToB5: true };

export const DEFAULT_BOOKLET_NAME = '結合ファイル';

export type BookletField = 'fileName' | 'centerGapMm' | 'startNumber' | 'coverPages';

/** 入力欄の値を検証する。オフになっている項目は検証しない */
export function parseBooklet(s: BookletSettings): Parsed<BookletOptions, BookletField> {
  const errors: FieldErrors<BookletField> = {};
  if (hasForbiddenChars(s.fileName)) errors.fileName = `使えない文字（${FORBIDDEN_LABEL}）が含まれています`;

  let centerGapMm = 20;
  if (s.booklet) {
    const v = parseNumberLoose(s.centerGapMm);
    if (v === null || v < 0 || v > 100) errors.centerGapMm = '0〜100 の数で入力してください';
    else centerGapMm = v;
  }

  let startNumber = 1;
  let coverPages = 0;
  if (s.numbering) {
    const st = parseIntLoose(s.startNumber);
    if (st === null) errors.startNumber = '整数で入力してください';
    else startNumber = st;
    const cv = parseIntLoose(s.coverPages);
    if (cv === null || cv < 0) errors.coverPages = '0以上の整数で入力してください';
    else coverPages = cv;
  }

  const ok = Object.keys(errors).length === 0;
  return {
    options: ok ? { booklet: s.booklet, centerGapMm, numbering: s.numbering, startNumber, coverPages } : null,
    errors,
  };
}

export function bookletFileName(s: BookletSettings): string {
  return `${s.fileName.trim() || DEFAULT_BOOKLET_NAME}.pdf`;
}

export function parsePages(s: PagesSettings): Parsed<PagesOptions, 'prefix'> {
  if (hasForbiddenChars(s.prefix)) {
    return { options: null, errors: { prefix: `使えない文字（${FORBIDDEN_LABEL}）が含まれています` } };
  }
  return { options: { prefix: s.prefix.trim(), convertToB5: s.convertToB5 }, errors: {} };
}

/** 現行版と同じ命名: {接頭辞}{3桁の連番}.pdf */
export function pageFileName(prefix: string, counter: number): string {
  return `${prefix}${String(counter).padStart(3, '0')}.pdf`;
}

export function zipName(prefix: string, kind: 'songs' | 'pages'): string {
  return `${prefix.trim()}${kind === 'songs' ? '曲ごと' : 'ページごと'}.zip`;
}
