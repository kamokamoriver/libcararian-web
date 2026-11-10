import { create } from 'zustand';
import * as A from './domain/arrangement';
import { DEFAULT_BOOKLET, DEFAULT_PAGES, bookletFileName, parseBooklet, parsePages, zipName } from './domain/settings';
import { DEFAULT_SONGS_INITIAL_PAGE, nextSongRow, validateSongs } from './domain/songs';
import type {
  Arrangement,
  BookletSettings,
  OutputFile,
  OutputMode,
  PagesSettings,
  SequencePage,
  SongRow,
  SongsSettings,
  SourceFile,
} from './domain/types';
import { release } from './lib/pdfjs';
import { inspectWorker, renderWorker } from './lib/workerClient';
import type { JobRequest } from './worker/protocol';

export interface OutputResult {
  mode: OutputMode;
  /** 小冊子（B4見開き）として出力したか。確認画面の単位（面／ページ）に使う */
  booklet: boolean;
  files: OutputFile[];
  zipName: string;
}

export interface JobState {
  status: 'idle' | 'running' | 'done' | 'error';
  done: number;
  total: number;
  result: OutputResult | null;
  error?: string;
}

export interface Toast {
  id: number;
  kind: 'info' | 'error';
  text: string;
}

interface State {
  sources: Record<string, SourceFile>;
  arrangement: Arrangement;
  mode: OutputMode;
  booklet: BookletSettings;
  songs: SongsSettings;
  pages: PagesSettings;
  job: JobState;
  /** 並びか設定が変わるたびに増える。古い処理結果を捨てるのに使う（不変条件15） */
  revision: number;
  previewOpen: boolean;
  toasts: Toast[];

  addFiles(files: File[]): Promise<void>;
  removeGroup(groupId: string): void;
  clear(): void;
  moveGroup(from: number, to: number): void;
  sortByName(): void;
  insertBlank(groupId: string, index: number): void;
  removeBlank(itemId: string): void;
  rotatePage(itemId: string): void;
  rotateGroup(groupId: string): void;
  setMode(mode: OutputMode): void;
  updateBooklet(patch: Partial<BookletSettings>): void;
  updateSongs(patch: Partial<Omit<SongsSettings, 'rows'>>): void;
  updateSongRow(id: string, patch: Partial<SongRow>): void;
  addSongRow(): void;
  removeSongRow(id: string): void;
  updatePages(patch: Partial<PagesSettings>): void;
  runJob(): Promise<void>;
  setPreviewOpen(open: boolean): void;
  toast(kind: Toast['kind'], text: string): void;
  dismissToast(id: number): void;
}

const idleJob: JobState = { status: 'idle', done: 0, total: 0, result: null };
const newId = () => crypto.randomUUID();
let toastId = 1;

export const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

/** 通しページ（派生値。保存しない） */
export function selectSequence(s: Pick<State, 'arrangement' | 'sources'>): SequencePage[] {
  return A.flatten(s.arrangement, (id) => s.sources[id]?.status === 'ready');
}

/** 今の出力方法の設定を検証し、Worker に渡す依頼を作る。問題があれば理由を返す */
export function buildRequest(
  s: State,
  seq: SequencePage[],
): { req: JobRequest; zipName: string } | { problem: string } {
  if (seq.length === 0) return { problem: 'PDFを追加してください' };
  const ids = [...new Set(seq.flatMap((p) => (p.kind === 'source' ? [p.sourceId] : [])))];
  const sources = ids.map((id) => ({ id, name: s.sources[id].name, bytes: s.sources[id].bytes }));
  if (s.mode === 'booklet') {
    const { options } = parseBooklet(s.booklet);
    if (!options) return { problem: '設定の入力に誤りがあります' };
    return { req: { kind: 'booklet', sources, seq, options, name: bookletFileName(s.booklet) }, zipName: '' };
  }
  if (s.mode === 'songs') {
    const v = validateSongs(s.songs, seq.length);
    if (!v.options) return { problem: '曲リストの入力に誤りがあります' };
    return { req: { kind: 'songs', sources, seq, options: v.options }, zipName: zipName(v.options.prefix, 'songs') };
  }
  const { options } = parsePages(s.pages);
  if (!options) return { problem: '設定の入力に誤りがあります' };
  return { req: { kind: 'pages', sources, seq, options }, zipName: zipName(options.prefix, 'pages') };
}

export const useStore = create<State>()((set, get) => {
  /** 並びか設定を変える。出力結果は古くなるので捨てる（不変条件15） */
  const change = (patch: Partial<State> | ((s: State) => Partial<State>)) =>
    set((s) => ({
      ...(typeof patch === 'function' ? patch(s) : patch),
      job: idleJob,
      revision: s.revision + 1,
      previewOpen: false,
    }));

  return {
    sources: {},
    arrangement: A.emptyArrangement(),
    mode: 'booklet',
    booklet: DEFAULT_BOOKLET,
    songs: { prefix: '', initialPage: DEFAULT_SONGS_INITIAL_PAGE, rows: [nextSongRow([], newId())] },
    pages: DEFAULT_PAGES,
    job: idleJob,
    revision: 0,
    previewOpen: false,
    toasts: [],

    async addFiles(files) {
      const pdfs = files.filter(isPdf);
      const skipped = files.length - pdfs.length;
      const existing = Object.values(get().sources);
      const fresh = pdfs.filter(
        (f) => !existing.some((e) => e.name === f.name && e.size === f.size && e.lastModified === f.lastModified),
      );
      const dup = pdfs.length - fresh.length;
      if (skipped) get().toast('info', `PDF以外のファイル ${skipped} 件は追加しませんでした`);
      if (dup) get().toast('info', `追加済みのファイル ${dup} 件は追加しませんでした`);

      const loaded = await Promise.all(
        fresh.map(async (f) => {
          const source: SourceFile = {
            id: newId(),
            name: f.name,
            size: f.size,
            lastModified: f.lastModified,
            bytes: await f.arrayBuffer(),
            status: 'loading',
          };
          return source;
        }),
      );
      change((s) => {
        const sources = { ...s.sources };
        let arrangement = s.arrangement;
        for (const src of loaded) {
          sources[src.id] = src;
          arrangement = A.addGroup(arrangement, A.createGroup(src.id, 0));
        }
        return { sources, arrangement };
      });

      await Promise.all(
        loaded.map(async (src) => {
          try {
            const copy = src.bytes.slice(0);
            const r = await inspectWorker.run({ kind: 'inspect', name: src.name, bytes: copy }, [copy]);
            const pageCount = 'pageCount' in r ? r.pageCount : 0;
            if (!get().sources[src.id]) return; // 読み込み中に外された
            change((s) => ({
              sources: { ...s.sources, [src.id]: { ...s.sources[src.id], status: 'ready', pageCount } },
              arrangement: A.setGroupPages(s.arrangement, src.id, pageCount),
            }));
          } catch (e) {
            if (!get().sources[src.id]) return;
            const error = e instanceof Error ? e.message : String(e);
            change((s) => ({ sources: { ...s.sources, [src.id]: { ...s.sources[src.id], status: 'error', error } } }));
          }
        }),
      );
    },

    removeGroup(groupId) {
      const g = get().arrangement.groups.find((x) => x.id === groupId);
      if (!g) return;
      release(g.sourceId);
      change((s) => {
        const sources = { ...s.sources };
        delete sources[g.sourceId];
        return { sources, arrangement: A.removeGroup(s.arrangement, groupId) };
      });
    },

    clear() {
      for (const id of Object.keys(get().sources)) release(id);
      change({ sources: {}, arrangement: A.emptyArrangement() });
    },

    moveGroup: (from, to) => change((s) => ({ arrangement: A.moveGroup(s.arrangement, from, to) })),
    sortByName: () =>
      change((s) => ({ arrangement: A.sortGroupsByName(s.arrangement, (id) => s.sources[id]?.name ?? '') })),
    insertBlank: (groupId, index) => change((s) => ({ arrangement: A.insertBlank(s.arrangement, groupId, index) })),
    removeBlank: (itemId) => change((s) => ({ arrangement: A.removeBlank(s.arrangement, itemId) })),
    rotatePage: (itemId) => change((s) => ({ arrangement: A.rotatePage(s.arrangement, itemId) })),
    rotateGroup: (groupId) => change((s) => ({ arrangement: A.rotateGroup(s.arrangement, groupId) })),

    setMode: (mode) => change({ mode }),
    updateBooklet: (patch) => change((s) => ({ booklet: { ...s.booklet, ...patch } })),
    updateSongs: (patch) => change((s) => ({ songs: { ...s.songs, ...patch } })),
    updateSongRow: (id, patch) =>
      change((s) => ({ songs: { ...s.songs, rows: s.songs.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) } })),
    addSongRow: () => change((s) => ({ songs: { ...s.songs, rows: [...s.songs.rows, nextSongRow(s.songs.rows, newId())] } })),
    removeSongRow: (id) =>
      change((s) => {
        const rows = s.songs.rows.filter((r) => r.id !== id);
        // 最低1行は残す
        return { songs: { ...s.songs, rows: rows.length ? rows : [nextSongRow([], newId())] } };
      }),
    updatePages: (patch) => change((s) => ({ pages: { ...s.pages, ...patch } })),

    async runJob() {
      const s = get();
      if (s.job.status === 'running') return;
      const built = buildRequest(s, selectSequence(s));
      if ('problem' in built) {
        get().toast('error', built.problem);
        return;
      }
      const revision = s.revision;
      const mode = s.mode;
      const booklet = built.req.kind === 'booklet' && built.req.options.booklet;
      set({ job: { ...idleJob, status: 'running' } });
      const stale = () => get().revision !== revision;
      try {
        // Worker には元ファイルの写しを渡す（手元の bytes は使い続ける）
        const req = built.req;
        if (req.kind !== 'inspect') req.sources = req.sources.map((x) => ({ ...x, bytes: (x.bytes as ArrayBuffer).slice(0) }));
        const transfer = req.kind === 'inspect' ? [] : req.sources.map((x) => x.bytes as ArrayBuffer);
        const r = await renderWorker.run(req, transfer, (done, total) => {
          if (!stale()) set((st) => ({ job: { ...st.job, done, total } }));
        });
        if (stale()) return;
        const files = 'outputs' in r ? r.outputs : [];
        set({ job: { status: 'done', done: 1, total: 1, result: { mode, booklet, files, zipName: built.zipName } }, previewOpen: true });
      } catch (e) {
        if (stale()) return;
        const message = e instanceof Error ? e.message : String(e);
        set({ job: { ...idleJob, status: 'error', error: message } });
        get().toast('error', `出力できませんでした: ${message}`);
      }
    },

    setPreviewOpen: (open) => set({ previewOpen: open }),
    toast(kind, text) {
      const id = toastId++;
      set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
      setTimeout(() => get().dismissToast(id), kind === 'error' ? 8000 : 4000);
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});
