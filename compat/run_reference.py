"""現行のデスクトップ版のコードで cases.json を処理し、compat/out/ref/ に出力する。

使い方: python compat/run_reference.py <Libcararian_GUI フォルダのパス>
"""
import json
import shutil
import sys
from pathlib import Path

import pymupdf

HERE = Path(__file__).parent
GUI_DIR = Path(sys.argv[1] if len(sys.argv) > 1 else HERE.parent.parent / "Libcararian_GUI")
sys.path.insert(0, str(GUI_DIR))

from pypdf import PdfReader, PdfWriter  # noqa: E402

import booklet_utils  # noqa: E402

booklet_utils.print = lambda *a, **k: None  # 現行コードのデバッグ出力を抑える

FIX = HERE / "fixtures"
OUT = HERE / "out" / "ref"


def run_merge(files, o, out_dir):
    booklet_utils.process_pdf_with_options(
        files,
        str(out_dir / "merged.pdf"),
        add_page_numbers=o["numbering"],
        create_booklet=o["booklet"],
        start_page=o["startNumber"],
        unnumbering_pages=o["coverPages"],
        center_gap_mm=o["centerGapMm"],
    )


def run_songs(files, o, out_dir):
    booklet_utils.create_song_pdfs(files, o["songs"], o["prefix"], o["initialPage"], out_dir)


def run_split(files, o, out_dir):
    counter = 1
    if o["convertToB5"]:
        # libcararian_complete.py の _execute_b5_split_thread と同じ処理
        for path in files:
            for page in PdfReader(path).pages:
                writer = PdfWriter()
                writer.add_page(booklet_utils.convert_to_B5(page))
                with open(out_dir / f"{o['prefix']}{counter:03d}.pdf", "wb") as f:
                    writer.write(f)
                counter += 1
    else:
        # pdf_page_splitter.py の export_pages と同じ処理
        for path in files:
            doc = pymupdf.open(path)
            for n in range(len(doc)):
                new_doc = pymupdf.open()
                new_doc.insert_pdf(doc, from_page=n, to_page=n)
                new_doc.save(out_dir / f"{o['prefix']}{counter:03d}.pdf")
                counter += 1


RUNNERS = {"merge": run_merge, "songs": run_songs, "split": run_split}

if __name__ == "__main__":
    shutil.rmtree(OUT, ignore_errors=True)
    for case in json.loads((HERE / "cases.json").read_text(encoding="utf-8")):
        out_dir = OUT / case["name"]
        out_dir.mkdir(parents=True)
        RUNNERS[case["kind"]]([str(FIX / f) for f in case["files"]], case["options"], out_dir)
        print("ref:", case["name"], sorted(p.name for p in out_dir.iterdir()))
