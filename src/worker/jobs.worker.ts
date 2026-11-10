// PDF の読み込みと出力は時間がかかるので、画面が固まらないよう Web Worker で行う。
import { loadDocs, loadPdf, renderBooklet, renderPages, renderSongs } from '../pdf/render';
import type { JobRequest, JobResult, WorkerMessage } from './protocol';

const scope = self as unknown as {
  postMessage(msg: WorkerMessage, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<{ id: number; req: JobRequest }>) => void) | null;
};

async function run(req: JobRequest, progress: (done: number, total: number) => void): Promise<JobResult> {
  if (req.kind === 'inspect') {
    const doc = await loadPdf(req.bytes, req.name);
    const pageCount = doc.getPageCount();
    if (pageCount === 0) throw new Error(`「${req.name}」にはページがありません`);
    return { pageCount };
  }
  const docs = await loadDocs(req.sources);
  if (req.kind === 'booklet') return { outputs: [await renderBooklet(docs, req.seq, req.options, req.name, progress)] };
  if (req.kind === 'songs') return { outputs: await renderSongs(docs, req.seq, req.options, progress) };
  return { outputs: await renderPages(docs, req.seq, req.options, progress) };
}

scope.onmessage = async (e) => {
  const { id, req } = e.data;
  let last = 0;
  const progress = (done: number, total: number) => {
    // 進捗の通知が多すぎると画面側が重くなるので間引く
    const now = Date.now();
    if (done < total && now - last < 50) return;
    last = now;
    scope.postMessage({ id, type: 'progress', done, total });
  };
  try {
    const result = await run(req, progress);
    const transfer = 'outputs' in result ? result.outputs.map((o) => o.bytes.buffer as ArrayBuffer) : [];
    scope.postMessage({ id, type: 'result', result }, transfer);
  } catch (err) {
    console.error(err);
    scope.postMessage({ id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
