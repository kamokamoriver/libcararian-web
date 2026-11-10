import type { JobRequest, JobResult, WorkerMessage } from '../worker/protocol';

type Pending = {
  resolve: (r: JobResult) => void;
  reject: (e: Error) => void;
  onProgress?: (done: number, total: number) => void;
};

export interface WorkerClient {
  run(req: JobRequest, transfer?: Transferable[], onProgress?: (done: number, total: number) => void): Promise<JobResult>;
}

/** Worker 1つ分の呼び出し口。読み込み用と出力用で別々に作り、互いを待たせない */
export function createWorkerClient(): WorkerClient {
  let worker: Worker | null = null;
  let nextId = 1;
  const pending = new Map<number, Pending>();

  const get = () => {
    if (worker) return worker;
    worker = new Worker(new URL('../worker/jobs.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      const p = pending.get(msg.id);
      if (!p) return;
      if (msg.type === 'progress') p.onProgress?.(msg.done, msg.total);
      else {
        pending.delete(msg.id);
        if (msg.type === 'result') p.resolve(msg.result);
        else p.reject(new Error(msg.message));
      }
    };
    worker.onerror = (e) => {
      console.error(e);
      for (const p of pending.values()) p.reject(new Error('処理中に予期しないエラーが起きました'));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  };

  return {
    run(req, transfer = [], onProgress) {
      const id = nextId++;
      return new Promise<JobResult>((resolve, reject) => {
        pending.set(id, { resolve, reject, onProgress });
        get().postMessage({ id, req }, transfer);
      });
    },
  };
}

export const inspectWorker = createWorkerClient();
export const renderWorker = createWorkerClient();
