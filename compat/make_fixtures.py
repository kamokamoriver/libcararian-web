"""互換テスト用の入力PDFを compat/fixtures/ に作る。

向きの取り違えや鏡像を見つけられるよう、各ページの左上に塗りつぶした三角形を置く。
"""
from pathlib import Path

import pymupdf
from pypdf import PdfReader, PdfWriter, Transformation
from pypdf.generic import RectangleObject

OUT = Path(__file__).parent / "fixtures"
A4 = (595.28, 841.89)
B5_JIS = (515.9, 728.5)


def draw_score_page(page: pymupdf.Page, label: str) -> None:
    w, h = page.rect.width, page.rect.height
    page.draw_rect(pymupdf.Rect(20, 20, w - 20, h - 20), color=(0, 0, 0), width=2)
    # 左上の向きマーカー（pymupdf は左上原点）
    page.draw_polyline([(30, 30), (110, 30), (30, 110), (30, 30)], color=(0, 0, 0), fill=(0, 0, 0))
    page.insert_text((140, 90), label, fontsize=36, fontname="helv")
    # 五線譜らしい横線
    y = 160
    while y < h - 80:
        for k in range(5):
            page.draw_line((40, y + k * 8), (w - 40, y + k * 8), color=(0, 0, 0), width=0.8)
        page.draw_line((40, y), (40, y + 32), color=(0, 0, 0), width=1.2)
        y += 90
    page.draw_circle((w - 80, h - 80), 25, color=(0, 0, 0), fill=(0.3, 0.3, 0.3))


def make(name: str, size, labels, rotations=None) -> None:
    doc = pymupdf.open()
    for i, label in enumerate(labels):
        page = doc.new_page(width=size[0], height=size[1])
        draw_score_page(page, label)
        if rotations:
            page.set_rotation(rotations[i])
    doc.save(OUT / name)


def make_offset_box() -> None:
    """MediaBox の原点が (50, 50) にずれたページ（現行版は内容がずれる。3章 No.11）"""
    src = pymupdf.open()
    draw_score_page(src.new_page(width=A4[0], height=A4[1]), "Offset box")
    tmp = OUT / "_tmp.pdf"
    src.save(tmp)
    reader = PdfReader(tmp)
    page = reader.pages[0]
    page.add_transformation(Transformation().translate(50, 50))
    page.mediabox = RectangleObject((50, 50, 50 + A4[0], 50 + A4[1]))
    writer = PdfWriter()
    writer.add_page(page)
    with open(OUT / "offset_box.pdf", "wb") as f:
        writer.write(f)
    tmp.unlink()


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    make("a4_score.pdf", A4, [f"A4 page {i}" for i in range(1, 7)])
    make("rotated.pdf", A4, ["Rotate 90", "Rotate 270"], rotations=[90, 270])
    make("b5_small.pdf", B5_JIS, [f"B5 page {i}" for i in range(1, 4)])
    make("rotated180.pdf", A4, ["Rotate 180"], rotations=[180])
    make_offset_box()
    print("fixtures:", sorted(p.name for p in OUT.glob("*.pdf")))
