import type { BookletOptions, OutputFile, PagesOptions, SequencePage, SongsOptions } from '../domain/types';
import type { RenderSource } from '../pdf/render';

export type JobRequest =
  | { kind: 'inspect'; name: string; bytes: ArrayBuffer }
  | { kind: 'booklet'; sources: RenderSource[]; seq: SequencePage[]; options: BookletOptions; name: string }
  | { kind: 'songs'; sources: RenderSource[]; seq: SequencePage[]; options: SongsOptions }
  | { kind: 'pages'; sources: RenderSource[]; seq: SequencePage[]; options: PagesOptions };

export type JobResult = { pageCount: number } | { outputs: OutputFile[] };

export type WorkerMessage =
  | { id: number; type: 'progress'; done: number; total: number }
  | { id: number; type: 'result'; result: JobResult }
  | { id: number; type: 'error'; message: string };
