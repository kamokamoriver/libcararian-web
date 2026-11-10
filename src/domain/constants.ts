// 寸法はすべて PDF のポイント（1pt = 1/72 インチ）。
// 値は現行のデスクトップ版（booklet_utils.py）と同じにしてある。docs/CURRENT_SPEC.md 参照。

/** B4 横向き（見開き1枚） */
export const B4_SIZE = { width: 1031.8, height: 728.5 } as const;
/** B5 縦向き */
export const B5_SIZE = { width: 515.9, height: 728.5 } as const;

/**
 * 現行版は小冊子なしのページ番号の位置を reportlab の B5（ISO, 176mm）の幅から計算していた。
 * 実際の出力ページ幅（515.9pt）とは違うが、番号の位置を変えないためにそのまま使う。
 */
export const REPORTLAB_B5_WIDTH = (176 * 72) / 25.4;

export const MARGIN_X = 15;
export const MARGIN_Y = 10;

/** 現行版の mm → pt 換算（1mm = 2.83pt として計算していた） */
export const LEGACY_PT_PER_MM = 2.83;

/** ページ番号の書式（現行版は reportlab の初期値 Helvetica 12pt） */
export const NUMBER_FONT_SIZE = 12;

/** 番号のベースライン左端の x 座標（現行版の値） */
export const NUMBER_X = {
  single: REPORTLAB_B5_WIDTH - MARGIN_X + 3,
  bookletLeft: MARGIN_X,
  bookletRight: B4_SIZE.width - MARGIN_X + 3 - 15,
} as const;
