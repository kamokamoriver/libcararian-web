// pdf.js でページを画像にする（サムネイルと確認画面）。
// 一度に描く枚数を制限し、描いた画像はキャッシュする。
import { GlobalWorkerOptions, getDocument, type PDFDocumentLoadingTask, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_CONCURRENT = 4;
const docs = new Map<string, PDFDocumentLoadingTask>();
const images = new Map<string, Promise<string>>();
let running = 0;
const queue: Array<() => void> = [];

function schedule<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      running++;
      task()
        .then(resolve, reject)
        .finally(() => {
          running--;
          queue.shift()?.();
        });
    };
    if (running < MAX_CONCURRENT) start();
    else queue.push(start);
  });
}

/** key ごとに文書を開く。pdf.js は渡したバッファを手放すので写しを渡す */
function openDoc(key: string, bytes: ArrayBuffer | Uint8Array): Promise<PDFDocumentProxy> {
  let task = docs.get(key);
  if (!task) {
    const data = new Uint8Array(bytes.slice(0));
    task = getDocument({ data, enableXfa: false });
    // release() で途中で捨てたときの「Loading aborted」を未処理エラーにしない（使う側は別に受け取る）
    task.promise.catch(() => {});
    docs.set(key, task);
  }
  return task.promise;
}

/**
 * ページを画像にして、その URL を返す。
 * width は回転後の幅(px)。rotation は元の /Rotate に足す右回りの角度
 */
export function renderPage(
  key: string,
  bytes: ArrayBuffer | Uint8Array,
  pageIndex: number,
  width: number,
  rotation = 0,
): Promise<string> {
  const cacheKey = `${key}:${pageIndex}:${width}:${rotation}`;
  let img = images.get(cacheKey);
  if (!img) {
    img = schedule(async () => {
      const doc = await openDoc(key, bytes);
      const page = await doc.getPage(pageIndex + 1);
      const angle = (page.rotate + rotation) % 360;
      const base = page.getViewport({ scale: 1, rotation: angle });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width * ratio) / base.width, rotation: angle });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      if (!blob) throw new Error('画像を作れませんでした');
      return URL.createObjectURL(blob);
    });
    images.set(cacheKey, img);
    img.catch(() => images.delete(cacheKey));
  }
  return img;
}

/** key で始まる文書と画像を捨てる */
export function release(key: string): void {
  const task = docs.get(key);
  if (task) {
    docs.delete(key);
    task.destroy().catch(() => {});
  }
  for (const [k, img] of images) {
    if (k.startsWith(`${key}:`)) {
      images.delete(k);
      img.then((url) => URL.revokeObjectURL(url)).catch(() => {});
    }
  }
}
