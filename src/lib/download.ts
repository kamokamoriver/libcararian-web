import { zipSync } from 'fflate';
import type { OutputFile } from '../domain/types';

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 1ファイルなら PDF、複数なら ZIP にまとめてダウンロードする */
export function downloadOutputs(files: OutputFile[], zipName: string): void {
  if (files.length === 1) {
    downloadBlob(new Blob([files[0].bytes as BlobPart], { type: 'application/pdf' }), files[0].name);
    return;
  }
  // PDF はもともと圧縮されているので、ZIP では圧縮しない（速さ優先）
  const entries = Object.fromEntries(files.map((f) => [f.name, [f.bytes, { level: 0 }] as const]));
  const zip = zipSync(entries as Parameters<typeof zipSync>[0]);
  downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), zipName);
}
