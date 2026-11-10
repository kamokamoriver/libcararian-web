/** PDF の変換行列 [a b c d e f]（x' = a x + c y + e, y' = b x + d y + f） */
export type Matrix = [number, number, number, number, number, number];

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function normalizeRotation(angle: number): 0 | 90 | 180 | 270 {
  const r = ((Math.round(angle) % 360) + 360) % 360;
  return r === 90 || r === 180 || r === 270 ? r : 0;
}

/**
 * /Rotate（時計回り）を中身の回転として焼き込む行列と、回転後の幅・高さ。
 * 現行版 convert_to_B5 の「回転 + 平行移動」と同じ結果になる。
 */
export function rotationMatrix(
  rotation: 0 | 90 | 180 | 270,
  width: number,
  height: number,
): { matrix: Matrix; width: number; height: number } {
  switch (rotation) {
    case 90:
      return { matrix: [0, -1, 1, 0, 0, width], width: height, height: width };
    case 180:
      return { matrix: [-1, 0, 0, -1, width, height], width, height };
    case 270:
      return { matrix: [0, 1, -1, 0, height, 0], width: height, height: width };
    default:
      return { matrix: [1, 0, 0, 1, 0, 0], width, height };
  }
}

/**
 * 幅 width・高さ height・回転 rotation のページを、rect にぴったり収める行列。
 * 現行版と同じく縦横を別々の倍率で拡縮する（縦横比は保たない）。
 */
export function fitMatrix(width: number, height: number, rotation: number, rect: Rect): Matrix {
  const r = rotationMatrix(normalizeRotation(rotation), width, height);
  const sx = rect.width / r.width;
  const sy = rect.height / r.height;
  const [a, b, c, d, e, f] = r.matrix;
  return [a * sx, b * sy, c * sx, d * sy, e * sx + rect.x, f * sy + rect.y];
}

export function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}
