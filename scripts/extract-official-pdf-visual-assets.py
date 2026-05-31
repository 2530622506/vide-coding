#!/usr/bin/env python3
import hashlib
import json
import re
import sys
import time
import urllib.request
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
LOCAL_DEPS = ROOT / ".python-deps"
if LOCAL_DEPS.exists():
    sys.path.insert(0, str(LOCAL_DEPS))

try:
    import fitz
except ImportError as error:
    raise SystemExit(
        "PyMuPDF is required. Install it with: python3 -m pip install --target .python-deps PyMuPDF"
    ) from error

INPUT_PATH = ROOT / "data/problem-ingestion/official-pdf-problems.json"
OUTPUT_PATH = ROOT / "data/problem-ingestion/official-pdf-visual-assets.json"
ASSET_DIR = ROOT / "apps/web/public/gesp-assets/official-pdf"
PUBLIC_PREFIX = "/gesp-assets/official-pdf"
USER_AGENT = "gesp-classification-catalog/0.1 (+official-pdf-visual-asset-extractor)"


def normalize_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


def section_type(line):
    if re.search(r"^3\.\d+\s+编程题", line):
        return None
    if "单选题" in line:
        return "selection"
    if "判断题" in line:
        return "judgment"
    if "编程题" in line or "程序设计题" in line:
        return "programming"
    return None


def safe_slug(value):
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", value).strip("_")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


def download_pdf(document, output_dir):
    request = urllib.request.Request(document["source_pdf_url"], headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=45) as response:
        data = response.read()

    actual_hash = sha256_bytes(data)
    expected_hash = document.get("source_document_sha256")
    if expected_hash and actual_hash != expected_hash:
        raise RuntimeError(f"sha256 mismatch: expected {expected_hash}, got {actual_hash}")

    path = Path(output_dir) / f"{actual_hash}.pdf"
    path.write_bytes(data)
    return path


def text_lines(page):
    lines = []
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = normalize_text("".join(span.get("text", "") for span in line.get("spans", [])))
            if text:
                lines.append({"text": text, "bbox": tuple(line["bbox"])})
    return sorted(lines, key=lambda item: (item["bbox"][1], item["bbox"][0]))


def build_problem_lookup(document):
    lookup = {}
    for problem in document["problems"]:
        lookup[(problem["question_type"], int(problem["question_number"]))] = problem
    return lookup


def page_markers(page, current_type, problem_lookup):
    markers = []
    for line in text_lines(page):
        text = line["text"]
        next_type = section_type(text)
        if next_type:
            current_type = next_type
            continue

        problem = None
        if current_type in {"selection", "judgment"}:
            match = re.match(r"^第\s*(\d{1,2})\s*题\b", text)
            if match:
                problem = problem_lookup.get((current_type, int(match.group(1))))
        elif current_type == "programming":
            match = re.match(r"^3\.(\d{1,2})\s+编程题", text)
            if match:
                problem = problem_lookup.get((current_type, int(match.group(1))))

        if problem:
            markers.append({"y": float(line["bbox"][1]), "problem": problem})

    return markers, current_type


def valid_image_rect(rect, page_rect):
    width = rect.width
    height = rect.height
    if width < 36 or height < 12:
        return False
    if width * height < 900:
        return False
    if rect.y1 > page_rect.height - 30:
        return False
    if width > page_rect.width * 0.95 and height > page_rect.height * 0.85:
        return False
    return True


def assign_problem(markers, carry_problem, center_y):
    if not markers:
        return carry_problem

    if center_y < markers[0]["y"] - 8:
        return carry_problem

    assigned = None
    for marker in markers:
        if center_y >= marker["y"] - 8:
            assigned = marker["problem"]
        else:
            break
    return assigned


def expand_rect(rect, page_rect, margin=4):
    expanded = fitz.Rect(rect.x0 - margin, rect.y0 - margin, rect.x1 + margin, rect.y1 + margin)
    return expanded & page_rect


def render_asset(page, rect, output_path):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=rect, alpha=False)
    pixmap.save(str(output_path))
    return {"width_px": pixmap.width, "height_px": pixmap.height}


def extract_document_assets(document, pdf_path):
    doc = fitz.open(pdf_path)
    problem_lookup = build_problem_lookup(document)
    current_type = "unknown"
    carry_problem = None
    assets = []
    seen = set()

    for page_index in range(doc.page_count):
        page = doc[page_index]
        page_number = page_index + 1
        carry_in = carry_problem
        markers, current_type = page_markers(page, current_type, problem_lookup)
        if markers:
            carry_problem = markers[-1]["problem"]

        image_infos = page.get_image_info(xrefs=True)
        asset_index = 1
        for image_info in image_infos:
            rect = fitz.Rect(image_info.get("bbox", (0, 0, 0, 0))) & page.rect
            if not valid_image_rect(rect, page.rect):
                continue

            fingerprint = (
                page_number,
                round(rect.x0, 1),
                round(rect.y0, 1),
                round(rect.x1, 1),
                round(rect.y1, 1),
            )
            if fingerprint in seen:
                continue
            seen.add(fingerprint)

            problem = assign_problem(markers, carry_in, (rect.y0 + rect.y1) / 2)
            if not problem:
                continue

            clip = expand_rect(rect, page.rect)
            file_stem = safe_slug(f"{problem['id']}_p{page_number}_a{asset_index}")
            file_name = f"{file_stem}.png"
            output_path = ASSET_DIR / file_name
            dimensions = render_asset(page, clip, output_path)
            data = output_path.read_bytes()

            assets.append(
                {
                    "id": f"official-pdf-visual:{problem['id']}:p{page_number}:a{asset_index}",
                    "official_problem_id": problem["id"],
                    "question_type": problem["question_type"],
                    "question_number": problem["question_number"],
                    "title": problem["title"],
                    "asset_kind": "pdf_image_region",
                    "asset_url": f"{PUBLIC_PREFIX}/{file_name}",
                    "local_path": str(output_path.relative_to(ROOT)),
                    "source_url": document["source_pdf_url"],
                    "source_page": page_number,
                    "bbox": [round(clip.x0, 2), round(clip.y0, 2), round(clip.x1, 2), round(clip.y1, 2)],
                    "width_px": dimensions["width_px"],
                    "height_px": dimensions["height_px"],
                    "sha256": sha256_bytes(data),
                    "alt_text": f"官方 PDF 第 {page_number} 页题目图片或代码截图，需人工复核。",
                    "source_status": "source_extracted",
                    "review_status": "needs_review",
                    "extraction_method": "pymupdf_image_region_crop"
                }
            )
            asset_index += 1

    return assets


def main():
    source = read_json(INPUT_PATH)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    documents = []
    failures = []

    with TemporaryDirectory(prefix="gesp-pdf-assets-") as temp_dir:
        for index, document in enumerate(source["documents"]):
            try:
                if index:
                    time.sleep(0.6)
                pdf_path = download_pdf(document, temp_dir)
                assets = extract_document_assets(document, pdf_path)
                documents.append(
                    {
                        "source_pdf_url": document["source_pdf_url"],
                        "source_document_sha256": document["source_document_sha256"],
                        "inferred_session": document.get("inferred_session"),
                        "inferred_language": document.get("inferred_language"),
                        "inferred_level": document.get("inferred_level"),
                        "page_count": document.get("page_count"),
                        "asset_count": len(assets),
                        "problem_with_assets_count": len({asset["official_problem_id"] for asset in assets}),
                        "assets": assets
                    }
                )
                print(f"extracted {len(assets)} visual assets from level {document.get('inferred_level')}")
            except Exception as error:
                failures.append({"source_pdf_url": document.get("source_pdf_url"), "reason": str(error)})

    all_assets = [asset for document in documents for asset in document["assets"]]
    output = {
        "schema_version": 1,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "generator": "scripts/extract-official-pdf-visual-assets.py",
        "source": str(INPUT_PATH.relative_to(ROOT)),
        "storage_policy": {
            "asset_files": "store cropped PDF image regions under apps/web/public/gesp-assets; do not store full PDF pages",
            "review_status": "all extracted visual assets remain needs_review until manually checked against the original PDF"
        },
        "summary": {
            "document_count": len(documents),
            "asset_count": len(all_assets),
            "problem_with_assets_count": len({asset["official_problem_id"] for asset in all_assets}),
            "failure_count": len(failures)
        },
        "documents": documents,
        "failures": failures
    }
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"official PDF visual asset count: {output['summary']['asset_count']}")
    print(f"problem with visual assets count: {output['summary']['problem_with_assets_count']}")
    print(f"wrote {OUTPUT_PATH.relative_to(ROOT)}")

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
