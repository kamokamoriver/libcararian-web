"""compat/out/ref（現行版）と compat/out/web（Web版）の出力を、ページごとに画像化して比べる。

ファイル名・ページ数・ページサイズが一致し、1画素以内のずれを除いた描画の差がしきい値以下なら一致とみなす。
cases.json の expectDiff に書いたページは、意図した修正による差として扱う。
終了コード: 想定外の差があれば 1。
"""
import json
import sys
from pathlib import Path

import numpy as np
import pymupdf

HERE = Path(__file__).parent
REF, WEB = HERE / "out" / "ref", HERE / "out" / "web"
DPI = 200
MAX_BAD_PIXELS = 24  # 1画素ずらしても合わないインクの画素がこれ以下なら一致（ページ番号「10」の欠落で約250画素）


def ink(page: pymupdf.Page) -> np.ndarray:
    """インクの乗った画素（濃いグレー）のマスク"""
    pix = page.get_pixmap(dpi=DPI, colorspace=pymupdf.csGRAY, alpha=False)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width) < 128


def dilate(m: np.ndarray) -> np.ndarray:
    p = np.pad(m, 1)
    h, w = m.shape
    out = np.zeros_like(m)
    for dy in range(3):
        for dx in range(3):
            out |= p[dy : dy + h, dx : dx + w]
    return out


def page_diff(a: pymupdf.Page, b: pymupdf.Page) -> int:
    """片方にだけインクがある画素の数。文字の輪郭がラスタライザの都合で1画素ずれる分は許す"""
    ma, mb = ink(a), ink(b)
    if ma.shape != mb.shape:
        return -1
    return int(max((ma & ~dilate(mb)).sum(), (mb & ~dilate(ma)).sum()))


def main() -> int:
    cases = json.loads((HERE / "cases.json").read_text(encoding="utf-8"))
    failures = 0
    for case in cases:
        name = case["name"]
        expected = set(case.get("expectDiff", {}).get("pages", []))
        ref_files = sorted(p.name for p in (REF / name).iterdir())
        web_files = sorted(p.name for p in (WEB / name).iterdir())
        if ref_files != web_files:
            print(f"NG  {name}: ファイル名が違う\n    ref={ref_files}\n    web={web_files}")
            failures += 1
            continue
        for fname in ref_files:
            ref, web = pymupdf.open(REF / name / fname), pymupdf.open(WEB / name / fname)
            if len(ref) != len(web):
                print(f"NG  {name}/{fname}: ページ数 ref={len(ref)} web={len(web)}")
                failures += 1
                continue
            for i in range(len(ref)):
                rs, ws = ref[i].rect, web[i].rect
                size_ok = abs(rs.width - ws.width) < 0.5 and abs(rs.height - ws.height) < 0.5
                d = page_diff(ref[i], web[i]) if size_ok else -1
                same = size_ok and 0 <= d <= MAX_BAD_PIXELS
                label = f"{name}/{fname} p{i + 1}"
                if same and i not in expected:
                    print(f"OK  {label} (差 {d}画素)")
                elif not same and i in expected:
                    print(f"OK* {label} (差 {d}画素) 意図した差: {case['expectDiff']['reason']}")
                elif same and i in expected:
                    print(f"NG  {label}: 差が出るはずなのに一致した")
                    failures += 1
                else:
                    detail = f"差 {d}画素" if size_ok else f"サイズ ref={rs} web={ws}"
                    print(f"NG  {label}: {detail}")
                    failures += 1
    print("\n結果:", "すべて一致" if failures == 0 else f"{failures} 件の想定外の差")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
