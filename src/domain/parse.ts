/** 全角数字や前後の空白を許して整数として読む。整数でなければ null */
export function parseIntLoose(s: string): number | null {
  const t = s.normalize('NFKC').trim();
  return /^-?\d+$/.test(t) ? Number(t) : null;
}

/** 全角を許して数値（小数可）として読む。数値でなければ null */
export function parseNumberLoose(s: string): number | null {
  const t = s.normalize('NFKC').trim();
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

/** Windows でファイル名に使えない文字と制御文字 */
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f]/;
export const FORBIDDEN_LABEL = '\\ / : * ? " < > |';

export function hasForbiddenChars(s: string): boolean {
  return FORBIDDEN.test(s);
}
