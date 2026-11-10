// pdf-lib で出力 PDF を作る。Worker の中でも Node（compat テスト）でも動く。
import {
  PDFDocument,
  PDFEmbeddedPage,
  PDFFont,
  PDFPage,
  StandardFonts,
  concatTransformationMatrix,
  degrees,
  drawObject,
  popGraphicsState,
  pushGraphicsState,
  rgb,
} from 'pdf-lib';
import { bookletOrder, bookletScaleX, paddedLength } from '../domain/booklet';
import { B4_SIZE, B5_SIZE, MARGIN_Y, NUMBER_FONT_SIZE, NUMBER_X } from '../domain/constants';
import { pageLabel } from '../domain/numbering';
import { pageFileName } from '../domain/settings';
import { songFileName } from '../domain/songs';
import type { BookletOptions, OutputFile, PagesOptions, SequencePage, SongsOptions } from '../domain/types';
import { fitMatrix, type Rect } from './geometry';

export interface RenderSource {
  id: string;
  name: string;
  bytes: ArrayBuffer | Uint8Array;
}

export type ProgressFn = (done: number, total: number) => void;

/** 読み込んだ元ファイル（sourceId → PDFDocument） */
type Docs = Map<string, { doc: PDFDocument; name: string }>;

export async function loadDocs(sources: RenderSource[]): Promise<Docs> {
  const docs: Docs = new Map();
  for (const s of sources) docs.set(s.id, { doc: await loadPdf(s.bytes, s.name), name: s.name });
  return docs;
}

export async function loadPdf(bytes: ArrayBuffer | Uint8Array, name: string): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    const encrypted = e instanceof Error && /encrypt/i.test(e.message + e.name);
    throw new Error(
      encrypted
        ? `「${name}」はパスワードなどで保護されているため読み込めません`
        : `「${name}」をPDFとして読み込めませんでした`,
      { cause: e },
    );
  }
}

interface Placed {
  embedded: PDFEmbeddedPage;
  rotation: number;
}

/**
 * 通しページを target 文書へ埋め込む。白紙は null。
 * 同じ元文書のページはまとめて埋め込み、フォントなどの共有リソースを二重にコピーしない。
 * ページ枠（MediaBox）の原点が (0,0) でなくても内容がずれないよう、実際の MediaBox を切り出し範囲にする。
 */
async function embedSequence(target: PDFDocument, seq: SequencePage[], docs: Docs): Promise<(Placed | null)[]> {
  const result: (Placed | null)[] = seq.map(() => null);
  const bySource = new Map<string, number[]>();
  seq.forEach((p, i) => {
    if (p.kind !== 'source') return;
    const list = bySource.get(p.sourceId) ?? [];
    list.push(i);
    bySource.set(p.sourceId, list);
  });
  for (const [sourceId, positions] of bySource) {
    const entry = docs.get(sourceId);
    if (!entry) throw new Error('元ファイルが見つかりません');
    const items = positions.map((i) => seq[i] as Extract<SequencePage, { kind: 'source' }>);
    const pages = items.map((p) => entry.doc.getPage(p.pageIndex));
    const boxes = pages.map((page) => {
      const mb = page.getMediaBox();
      return { left: mb.x, bottom: mb.y, right: mb.x + mb.width, top: mb.y + mb.height };
    });
    const embedded = await target.embedPages(pages, boxes);
    // 元の /Rotate に、利用者が付けた回転を足す（DESIGN 4. rotation）
    embedded.forEach(
      (ep, k) => (result[positions[k]] = { embedded: ep, rotation: pages[k].getRotation().angle + items[k].rotation }),
    );
  }
  return result;
}

/** 埋め込んだページを、回転を焼き込んだうえで rect にぴったり収めて描く */
function placePage(target: PDFPage, placed: Placed, rect: Rect): void {
  const { embedded, rotation } = placed;
  const m = fitMatrix(embedded.width, embedded.height, rotation, rect);
  const name = target.node.newXObject('EmbeddedPdfPage', embedded.ref);
  target.pushOperators(pushGraphicsState(), concatTransformationMatrix(...m), drawObject(name), popGraphicsState());
}

function drawNumber(page: PDFPage, font: PDFFont, text: string | null, x: number): void {
  if (text === null) return;
  page.drawText(text, { x, y: MARGIN_Y, size: NUMBER_FONT_SIZE, font, color: rgb(0, 0, 0) });
}

const B5_RECT: Rect = { x: 0, y: 0, ...B5_SIZE };

/** 一括結合（小冊子あり・なし）。DESIGN 不変条件5〜9 */
export async function renderBooklet(
  docs: Docs,
  seq: SequencePage[],
  opts: BookletOptions,
  name: string,
  onProgress: ProgressFn = () => {},
): Promise<OutputFile> {
  const n = seq.length;
  if (n === 0) throw new Error('結合するページがありません');
  const out = await PDFDocument.create();
  const placed = await embedSequence(out, seq, docs);
  const font = await out.embedFont(StandardFonts.Helvetica);

  if (!opts.booklet) {
    for (let i = 0; i < n; i++) {
      const page = out.addPage([B5_SIZE.width, B5_SIZE.height]);
      const p = placed[i];
      if (p) placePage(page, p, B5_RECT);
      drawNumber(page, font, pageLabel(i, seq[i], opts), NUMBER_X.single);
      onProgress(i + 1, n + 1);
    }
  } else {
    const total = paddedLength(n);
    const w = B5_SIZE.width * bookletScaleX(opts.centerGapMm);
    const sheets = bookletOrder(total);
    sheets.forEach(([l, r], k) => {
      const sheet = out.addPage([B4_SIZE.width, B4_SIZE.height]);
      const pl = placed[l];
      const pr = placed[r];
      if (pl) placePage(sheet, pl, { x: 0, y: 0, width: w, height: B5_SIZE.height });
      if (pr) placePage(sheet, pr, { x: B4_SIZE.width - w, y: 0, width: w, height: B5_SIZE.height });
      drawNumber(sheet, font, pageLabel(l, seq[l], opts), NUMBER_X.bookletLeft);
      drawNumber(sheet, font, pageLabel(r, seq[r], opts), NUMBER_X.bookletRight);
      onProgress(k + 1, sheets.length + 1);
    });
  }
  const bytes = await out.save();
  onProgress(1, 1);
  return { name, bytes, pageCount: out.getPageCount() };
}

/** 曲ごと分割。開始・終了は印刷されているページ番号（不変条件10） */
export async function renderSongs(
  docs: Docs,
  seq: SequencePage[],
  opts: SongsOptions,
  onProgress: ProgressFn = () => {},
): Promise<OutputFile[]> {
  const outputs: OutputFile[] = [];
  for (const [k, song] of opts.songs.entries()) {
    const picked: SequencePage[] = [];
    for (let p = song.start; p <= song.end; p++) {
      const i = p - opts.initialPage;
      if (i >= 0 && i < seq.length) picked.push(seq[i]);
    }
    const name = songFileName(opts.prefix, song);
    if (picked.length === 0) throw new Error(`「${name}」のページが楽譜の範囲外です`);
    const doc = await PDFDocument.create();
    const placed = await embedSequence(doc, picked, docs);
    for (const p of placed) {
      const page = doc.addPage([B5_SIZE.width, B5_SIZE.height]);
      if (p) placePage(page, p, B5_RECT);
    }
    outputs.push({ name, bytes: await doc.save(), pageCount: picked.length });
    onProgress(k + 1, opts.songs.length);
  }
  return outputs;
}

/** ページごと分割。白紙も1ページとして出力する（不変条件14） */
export async function renderPages(
  docs: Docs,
  seq: SequencePage[],
  opts: PagesOptions,
  onProgress: ProgressFn = () => {},
): Promise<OutputFile[]> {
  if (seq.length === 0) throw new Error('出力するページがありません');
  const outputs: OutputFile[] = [];
  for (const [i, sp] of seq.entries()) {
    const doc = await PDFDocument.create();
    if (sp.kind === 'blank') {
      doc.addPage([B5_SIZE.width, B5_SIZE.height]);
    } else if (opts.convertToB5) {
      const [p] = await embedSequence(doc, [sp], docs);
      const page = doc.addPage([B5_SIZE.width, B5_SIZE.height]);
      if (p) placePage(page, p, B5_RECT);
    } else {
      const src = docs.get(sp.sourceId);
      if (!src) throw new Error('元ファイルが見つかりません');
      const [copied] = await doc.copyPages(src.doc, [sp.pageIndex]);
      // 元のサイズのまま、/Rotate に回転を足す（不変条件3b）
      if (sp.rotation) copied.setRotation(degrees((copied.getRotation().angle + sp.rotation) % 360));
      doc.addPage(copied);
    }
    outputs.push({ name: pageFileName(opts.prefix, i + 1), bytes: await doc.save(), pageCount: 1 });
    onProgress(i + 1, seq.length);
  }
  return outputs;
}
