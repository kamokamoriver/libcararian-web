import { B4_SIZE, B5_SIZE, LEGACY_PT_PER_MM } from './constants';

/** 調整の白紙を足したあとの総ページ数（4の倍数、不変条件8） */
export function paddedLength(n: number): number {
  return Math.ceil(n / 4) * 4;
}

/**
 * 中綴じ小冊子の面付け順。総ページ数 n（4の倍数）に対し、B4の1枚ごとに
 * [左面, 右面] の通しページ位置（0始まり）を返す。現行版と同じ順番。
 */
export function bookletOrder(n: number): Array<[number, number]> {
  const order: Array<[number, number]> = [];
  for (let i = 0; i < n / 2; i += 2) {
    order.push([n - 1 - i, i]);
    order.push([i + 1, n - 2 - i]);
  }
  return order;
}

/** 小冊子で各面に掛ける横方向の倍率（現行版どおり縦は縮めない） */
export function bookletScaleX(centerGapMm: number): number {
  const available = (B4_SIZE.width - centerGapMm * LEGACY_PT_PER_MM) / 2;
  return available / B5_SIZE.width;
}
