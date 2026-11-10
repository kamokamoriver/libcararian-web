import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { B5_SIZE } from '../domain/constants';
import type { SequencePage } from '../domain/types';
import { applyMatrix, fitMatrix } from './geometry';
import { loadDocs, renderPages } from './render';

const B5 = { x: 0, y: 0, ...B5_SIZE };

describe('geometry', () => {
  it('横長のページを右に90°回すと、元の左下がB5の左上に来て、枠いっぱいに収まる', () => {
    const m = fitMatrix(842, 595, 90, B5);
    const [x0, y0] = applyMatrix(m, 0, 0);
    expect(x0).toBeCloseTo(0, 6);
    expect(y0).toBeCloseTo(B5_SIZE.height, 6);
    const [x1, y1] = applyMatrix(m, 842, 595);
    expect(x1).toBeCloseTo(B5_SIZE.width, 6);
    expect(y1).toBeCloseTo(0, 6);
  });

  it('/Rotate と利用者の回転の合計が360°なら回さない', () => {
    expect(fitMatrix(500, 700, 270 + 90, B5)).toEqual(fitMatrix(500, 700, 0, B5));
  });
});

describe('render', () => {
  const fixture = (name: string) => new Uint8Array(readFileSync(join(import.meta.dirname, '..', '..', 'compat', 'fixtures', name)));

  it('B5に変換しないページごと分割では、/Rotate に回転を足す', async () => {
    const docs = await loadDocs([{ id: 'a', name: 'b5_small.pdf', bytes: fixture('b5_small.pdf') }]);
    const seq: SequencePage[] = [
      { kind: 'source', itemId: 'p0', sourceId: 'a', pageIndex: 0, rotation: 90 },
      { kind: 'source', itemId: 'p1', sourceId: 'a', pageIndex: 1, rotation: 0 },
    ];
    const out = await renderPages(docs, seq, { prefix: '', convertToB5: false });
    const angles = await Promise.all(
      out.map(async (o) => (await PDFDocument.load(o.bytes)).getPage(0).getRotation().angle),
    );
    expect(angles).toEqual([90, 0]);
  });
});
