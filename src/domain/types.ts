export type OutputMode = 'booklet' | 'songs' | 'pages';

export type SourceStatus = 'loading' | 'ready' | 'error';

/** 追加された PDF 1つ */
export interface SourceFile {
  id: string;
  name: string;
  size: number;
  /** UNIX ミリ秒 */
  lastModified: number;
  /** PDF の中身。メモリにだけ置く */
  bytes: ArrayBuffer;
  status: SourceStatus;
  error?: string;
  pageCount?: number;
}

/** 右回りの回転角度 */
export type Rotation = 0 | 90 | 180 | 270;

export type PageItem =
  | { id: string; kind: 'source'; sourceId: string; pageIndex: number; rotation: Rotation }
  | { id: string; kind: 'blank' };

/** ページ一覧での1ファイル分のまとまり */
export interface FileGroup {
  id: string;
  sourceId: string;
  pages: PageItem[];
}

/** 並び。groups の順番が出力の順番 */
export interface Arrangement {
  groups: FileGroup[];
}

/** 並びを平らにした1枚（配列の添字 = 0始まりの通しページ位置） */
export type SequencePage =
  | { kind: 'source'; itemId: string; sourceId: string; pageIndex: number; rotation: Rotation }
  | { kind: 'blank'; itemId: string };

/** 画面の入力欄の値（文字のまま持ち、domain の parse 関数で検証する） */
export interface BookletSettings {
  fileName: string;
  booklet: boolean;
  centerGapMm: string;
  numbering: boolean;
  startNumber: string;
  coverPages: string;
}

export interface SongRow {
  id: string;
  number: string;
  name: string;
  start: string;
  end: string;
}

export interface SongsSettings {
  prefix: string;
  initialPage: string;
  rows: SongRow[];
}

export interface PagesSettings {
  prefix: string;
  convertToB5: boolean;
}

/** 検証済みの出力オプション（Worker に渡す） */
export interface BookletOptions {
  booklet: boolean;
  centerGapMm: number;
  numbering: boolean;
  startNumber: number;
  coverPages: number;
}

export interface Song {
  number: number;
  name: string;
  start: number;
  end: number;
}

export interface SongsOptions {
  prefix: string;
  initialPage: number;
  songs: Song[];
}

export interface PagesOptions {
  prefix: string;
  convertToB5: boolean;
}

export interface OutputFile {
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}
