import { describe, expect, it } from 'vitest';
import {
  addGroup,
  createGroup,
  emptyArrangement,
  flatten,
  insertBlank,
  moveGroup,
  removeBlank,
  removeGroup,
  rotateGroup,
  rotatePage,
  sortGroupsByName,
} from './arrangement';
import { bookletOrder, bookletScaleX, paddedLength } from './booklet';
import { pageLabel } from './numbering';
import { parseBooklet, DEFAULT_BOOKLET, pageFileName, bookletFileName } from './settings';
import { nextSongRow, songFileName, validateSongs } from './songs';
import type { SequencePage, SongRow } from './types';

const ids = () => {
  let n = 0;
  return () => `id${n++}`;
};

describe('arrangement', () => {
  const build = () => {
    const newId = ids();
    let arr = emptyArrangement();
    arr = addGroup(arr, createGroup('A', 2, newId));
    arr = addGroup(arr, createGroup('B', 3, newId));
    return { arr, newId };
  };
  const shape = (seq: SequencePage[]) => seq.map((p) => (p.kind === 'blank' ? '_' : `${p.sourceId}${p.pageIndex}`));

  it('元のページを元の順番で全部並べる', () => {
    const { arr } = build();
    expect(shape(flatten(arr, () => true))).toEqual(['A0', 'A1', 'B0', 'B1', 'B2']);
  });

  it('任意の位置に白紙を入れられ、取り除ける', () => {
    const { arr, newId } = build();
    const b = arr.groups[1].id;
    const withBlank = insertBlank(insertBlank(arr, b, 0, newId), b, 2, newId);
    expect(shape(flatten(withBlank, () => true))).toEqual(['A0', 'A1', '_', 'B0', '_', 'B1', 'B2']);
    const blankId = withBlank.groups[1].pages[0].id;
    expect(shape(flatten(removeBlank(withBlank, blankId), () => true))).toEqual(['A0', 'A1', 'B0', '_', 'B1', 'B2']);
  });

  it('元のページは removeBlank で取り除けない', () => {
    const { arr } = build();
    const pageId = arr.groups[0].pages[0].id;
    expect(removeBlank(arr, pageId)).toEqual(arr);
  });

  it('ファイルを並べ替えると白紙も一緒に動く', () => {
    const { arr, newId } = build();
    const moved = moveGroup(insertBlank(arr, arr.groups[0].id, 2, newId), 0, 1);
    expect(shape(flatten(moved, () => true))).toEqual(['B0', 'B1', 'B2', 'A0', 'A1', '_']);
  });

  it('ページを右回りに90°ずつ回し、270の次は0に戻る（白紙は回らない）', () => {
    const { arr, newId } = build();
    const withBlank = insertBlank(arr, arr.groups[0].id, 0, newId);
    const blankId = withBlank.groups[0].pages[0].id;
    const pageId = withBlank.groups[0].pages[1].id;
    let r = withBlank;
    const seen: number[] = [];
    for (let k = 0; k < 4; k++) {
      r = rotatePage(r, pageId);
      const p = flatten(r, () => true)[1];
      seen.push(p.kind === 'source' ? p.rotation : -1);
    }
    expect(seen).toEqual([90, 180, 270, 0]);
    expect(rotatePage(withBlank, blankId)).toEqual(withBlank);
  });

  it('ファイル単位で全ページを回せる', () => {
    const { arr } = build();
    const rot = flatten(rotateGroup(arr, arr.groups[1].id), () => true).map((p) => (p.kind === 'source' ? p.rotation : -1));
    expect(rot).toEqual([0, 0, 90, 90, 90]);
  });

  it('名前順は数字を数値として比べ、大文字小文字を区別しない', () => {
    const newId = ids();
    let arr = emptyArrangement();
    for (const s of ['s10', 'S2', 's1']) arr = addGroup(arr, createGroup(s, 1, newId));
    const sorted = sortGroupsByName(arr, (id) => id);
    expect(sorted.groups.map((g) => g.sourceId)).toEqual(['s1', 'S2', 's10']);
  });

  it('読み込めていないファイルは出力に含めない', () => {
    const { arr } = build();
    expect(shape(flatten(arr, (id) => id !== 'A'))).toEqual(['B0', 'B1', 'B2']);
    expect(removeGroup(arr, arr.groups[0].id).groups).toHaveLength(1);
  });
});

describe('booklet', () => {
  it('4の倍数に切り上げる', () => {
    expect([0, 1, 4, 5, 8].map(paddedLength)).toEqual([0, 4, 4, 8, 8]);
  });

  it('面付け順は現行版と同じ', () => {
    expect(bookletOrder(8)).toEqual([
      [7, 0],
      [1, 6],
      [5, 2],
      [3, 4],
    ]);
  });

  it('横方向の倍率は現行版の換算（2.83）で計算する', () => {
    expect(bookletScaleX(0)).toBeCloseTo(1, 6);
    expect(bookletScaleX(20)).toBeCloseTo((1031.8 - 56.6) / 2 / 515.9, 6);
  });
});

describe('numbering', () => {
  const src: SequencePage = { kind: 'source', itemId: 'x', sourceId: 'A', pageIndex: 0, rotation: 0 };
  const blank: SequencePage = { kind: 'blank', itemId: 'b' };
  const opts = { numbering: true, startNumber: 1, coverPages: 2 };

  it('番号は 位置 + 開始番号 − 表紙', () => {
    expect(pageLabel(2, src, opts)).toBe('1');
    expect(pageLabel(5, src, { ...opts, startNumber: 3 })).toBe('6');
  });
  it('表紙・白紙・調整の白紙には印刷しない', () => {
    expect(pageLabel(1, src, opts)).toBeNull();
    expect(pageLabel(3, blank, opts)).toBeNull();
    expect(pageLabel(9, undefined, opts)).toBeNull();
  });
  it('番号オフなら印刷しない', () => {
    expect(pageLabel(5, src, { ...opts, numbering: false })).toBeNull();
  });
});

describe('settings', () => {
  it('初期値は正しく読める', () => {
    expect(parseBooklet(DEFAULT_BOOKLET).options).toEqual({
      booklet: false,
      centerGapMm: 20,
      numbering: false,
      startNumber: 1,
      coverPages: 0,
    });
  });
  it('入力ミスは項目ごとに返し、黙って初期値にしない', () => {
    const r = parseBooklet({ ...DEFAULT_BOOKLET, booklet: true, numbering: true, centerGapMm: 'abc', coverPages: '-1' });
    expect(r.options).toBeNull();
    expect(Object.keys(r.errors).sort()).toEqual(['centerGapMm', 'coverPages']);
  });
  it('全角数字を受け付ける', () => {
    expect(parseBooklet({ ...DEFAULT_BOOKLET, numbering: true, startNumber: '３' }).options?.startNumber).toBe(3);
  });
  it('ファイル名', () => {
    expect(bookletFileName(DEFAULT_BOOKLET)).toBe('結合ファイル.pdf');
    expect(pageFileName('2025混声', 7)).toBe('2025混声007.pdf');
  });
});

describe('songs', () => {
  const row = (id: string, number: string, name: string, start: string, end: string): SongRow => ({
    id,
    number,
    name,
    start,
    end,
  });
  const base = { prefix: '混声', initialPage: '3' };

  it('ファイル名は現行版と同じ', () => {
    expect(songFileName('混声', { number: 1, name: 'はじまりの歌' })).toBe('混声01はじまりの歌.pdf');
  });

  it('正しい行は曲になる', () => {
    const v = validateSongs({ ...base, rows: [row('r1', '1', 'A', '3', '5')] }, 10);
    expect(v.hasErrors).toBe(false);
    expect(v.options?.songs).toEqual([{ number: 1, name: 'A', start: 3, end: 5 }]);
  });

  it('入力ミスの行はエラーにし、黙って飛ばさない', () => {
    const v = validateSongs(
      {
        ...base,
        rows: [
          row('a', '', 'A', '3', '4'),
          row('b', '2', '', '3', '4'),
          row('c', '3', 'C', '5', '4'),
          row('d', '4', 'D:x', '3', '4'),
          row('e', '5', 'E', '50', '60'),
        ],
      },
      10,
    );
    expect(v.hasErrors).toBe(true);
    expect(v.options).toBeNull();
    expect(Object.keys(v.rowIssues).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('一部だけはみ出す行は注意で、実行はできる', () => {
    const v = validateSongs({ ...base, rows: [row('a', '3', 'X', '12', '20')] }, 10);
    expect(v.hasErrors).toBe(false);
    expect(v.rowIssues.a[0].level).toBe('warning');
  });

  it('ファイル名が重なる行はエラー', () => {
    const v = validateSongs({ ...base, rows: [row('a', '1', 'A', '3', '3'), row('b', '01', 'A', '4', '4')] }, 10);
    expect(v.rowIssues.b[0].message).toContain('1 行目');
  });

  it('全部空の行は無視し、曲が0なら全体エラー', () => {
    const v = validateSongs({ ...base, rows: [row('a', '', '', '', '')] }, 10);
    expect(v.rowIssues).toEqual({});
    expect(v.generalErrors).toHaveLength(1);
  });

  it('次の行は No. と開始ページを続きから入れる', () => {
    expect(nextSongRow([row('a', '3', 'A', '5', '8')], 'n')).toEqual(row('n', '4', '', '9', ''));
    expect(nextSongRow([], 'n')).toEqual(row('n', '1', '', '', ''));
  });
});
