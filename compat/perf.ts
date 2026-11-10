// 300ページの入力で、小冊子の出力にかかる時間を測る（DESIGN 9. 性能）
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { addGroup, createGroup, emptyArrangement, flatten } from '../src/domain/arrangement';
import { loadDocs, renderBooklet } from '../src/pdf/render';

const here = dirname(fileURLToPath(import.meta.url));
const src = await PDFDocument.load(readFileSync(join(here, 'fixtures', 'a4_score.pdf')));
const big = await PDFDocument.create();
for (let i = 0; i < 50; i++) for (const p of await big.copyPages(src, src.getPageIndices())) big.addPage(p);
const bytes = await big.save();
const t0 = performance.now();
const docs = await loadDocs([{ id: 'a', name: 'big.pdf', bytes }]);
const seq = flatten(addGroup(emptyArrangement(), createGroup('a', big.getPageCount())), () => true);
const out = await renderBooklet(docs, seq, { booklet: true, centerGapMm: 20, numbering: true, startNumber: 1, coverPages: 0 }, 'x.pdf');
console.log(`${seq.length}ページ → ${out.pageCount}面, ${Math.round(performance.now() - t0)}ms, ${(out.bytes.length / 1e6).toFixed(1)}MB`);
