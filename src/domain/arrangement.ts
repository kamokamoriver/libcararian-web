import type { Arrangement, FileGroup, PageItem, Rotation, SequencePage } from './types';

export type NewId = () => string;
const uuid: NewId = () => crypto.randomUUID();

export const emptyArrangement = (): Arrangement => ({ groups: [] });

/** 元ファイル1つ分のまとまりを作る。元のページを元の順番で全部入れる（不変条件3） */
export function createGroup(sourceId: string, pageCount: number, newId: NewId = uuid): FileGroup {
  return {
    id: newId(),
    sourceId,
    pages: Array.from({ length: pageCount }, (_, pageIndex) => ({
      id: newId(),
      kind: 'source' as const,
      sourceId,
      pageIndex,
      rotation: 0 as const,
    })),
  };
}

export function addGroup(arr: Arrangement, group: FileGroup): Arrangement {
  return { groups: [...arr.groups, group] };
}

/** 読み込みが終わったまとまりのページを入れ直す（読み込み中はページ数が分からないため） */
export function setGroupPages(arr: Arrangement, sourceId: string, pageCount: number, newId: NewId = uuid): Arrangement {
  return {
    groups: arr.groups.map((g) => (g.sourceId === sourceId ? { ...createGroup(sourceId, pageCount, newId), id: g.id } : g)),
  };
}

export function removeGroup(arr: Arrangement, groupId: string): Arrangement {
  return { groups: arr.groups.filter((g) => g.id !== groupId) };
}

/** まとまりの位置 index（0〜pages.length）に白紙を1枚入れる */
export function insertBlank(arr: Arrangement, groupId: string, index: number, newId: NewId = uuid): Arrangement {
  return {
    groups: arr.groups.map((g) => {
      if (g.id !== groupId) return g;
      const at = Math.max(0, Math.min(index, g.pages.length));
      const pages = [...g.pages];
      pages.splice(at, 0, { id: newId(), kind: 'blank' });
      return { ...g, pages };
    }),
  };
}

/** 挿入した白紙を取り除く。元のページは取り除けない（不変条件3） */
export function removeBlank(arr: Arrangement, itemId: string): Arrangement {
  return {
    groups: arr.groups.map((g) =>
      g.pages.some((p) => p.id === itemId && p.kind === 'blank')
        ? { ...g, pages: g.pages.filter((p) => p.id !== itemId) }
        : g,
    ),
  };
}

/** 右回りに90°（不変条件3a）。270の次は0に戻る */
export function nextRotation(r: Rotation): Rotation {
  return ((r + 90) % 360) as Rotation;
}

const rotateItem = (p: PageItem): PageItem => (p.kind === 'source' ? { ...p, rotation: nextRotation(p.rotation) } : p);

/** ページを右回りに90°回す。白紙は回せない */
export function rotatePage(arr: Arrangement, itemId: string): Arrangement {
  return {
    groups: arr.groups.map((g) =>
      g.pages.some((p) => p.id === itemId) ? { ...g, pages: g.pages.map((p) => (p.id === itemId ? rotateItem(p) : p)) } : g,
    ),
  };
}

/** まとまりの全ページを右回りに90°回す */
export function rotateGroup(arr: Arrangement, groupId: string): Arrangement {
  return { groups: arr.groups.map((g) => (g.id === groupId ? { ...g, pages: g.pages.map(rotateItem) } : g)) };
}

export function moveGroup(arr: Arrangement, from: number, to: number): Arrangement {
  if (from === to || from < 0 || from >= arr.groups.length) return arr;
  const groups = [...arr.groups];
  const [g] = groups.splice(from, 1);
  groups.splice(Math.max(0, Math.min(to, groups.length)), 0, g);
  return { groups };
}

/** ファイル名順（大文字小文字を区別しない。数字は数値として比べる） */
export function sortGroupsByName(arr: Arrangement, nameOf: (sourceId: string) => string): Arrangement {
  const collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' });
  return { groups: [...arr.groups].sort((a, b) => collator.compare(nameOf(a.sourceId), nameOf(b.sourceId))) };
}

/** 並びを平らにする。読み込めていないファイルのまとまりは含めない（不変条件2） */
export function flatten(arr: Arrangement, isReady: (sourceId: string) => boolean): SequencePage[] {
  const seq: SequencePage[] = [];
  for (const g of arr.groups) {
    if (!isReady(g.sourceId)) continue;
    for (const p of g.pages) {
      seq.push(
        p.kind === 'blank'
          ? { kind: 'blank', itemId: p.id }
          : { kind: 'source', itemId: p.id, sourceId: p.sourceId, pageIndex: p.pageIndex, rotation: p.rotation },
      );
    }
  }
  return seq;
}
