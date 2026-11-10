// Web版のPDF処理（src/pdf）で cases.json を処理し、compat/out/web/ に出力する。
// 使い方: npm run compat（このあと compare.py が現行版の出力 out/ref と比べる）
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addGroup, createGroup, emptyArrangement, flatten } from '../src/domain/arrangement';
import type { OutputFile } from '../src/domain/types';
import { loadDocs, renderBooklet, renderPages, renderSongs, type RenderSource } from '../src/pdf/render';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out', 'web');
const cases = JSON.parse(readFileSync(join(here, 'cases.json'), 'utf-8'));

rmSync(out, { recursive: true, force: true });
for (const c of cases) {
  const sources: RenderSource[] = c.files.map((name: string, i: number) => ({
    id: `s${i}`,
    name,
    bytes: new Uint8Array(readFileSync(join(here, 'fixtures', name))),
  }));
  const docs = await loadDocs(sources);
  let arr = emptyArrangement();
  for (const s of sources) arr = addGroup(arr, createGroup(s.id, docs.get(s.id)!.doc.getPageCount()));
  const seq = flatten(arr, () => true);

  let outputs: OutputFile[];
  if (c.kind === 'merge') outputs = [await renderBooklet(docs, seq, c.options, 'merged.pdf')];
  else if (c.kind === 'songs') outputs = await renderSongs(docs, seq, c.options);
  else outputs = await renderPages(docs, seq, c.options);

  const dir = join(out, c.name);
  mkdirSync(dir, { recursive: true });
  for (const o of outputs) writeFileSync(join(dir, o.name), o.bytes);
  console.log('web:', c.name, outputs.map((o) => o.name));
}
