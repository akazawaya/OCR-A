from pathlib import Path

import cv2
import numpy as np
import pypdfium2

from app_ocr.input_constraints import (
    ALLOWED_UPLOAD_FILE_EXTENSIONS,
    UPLOAD_FILE_EXTENSION_ALIASES,
)

# filesizeはDjangoのバリデーターで十分であると判断


# 最低限のメタ情報 拡張子とページ数を返す
def inspect_file(file):
    ext = Path(file.name).suffix.lstrip(".").lower()
    try:
        ext = exchange_ext(ext)
    except KeyError as err:
        raise ValueError(
            "Unsupported file format. Supported formats are "
            f"{sorted(ALLOWED_UPLOAD_FILE_EXTENSIONS)}"
        ) from err

    file.seek(0)
    pdf = None
    try:
        if ext == "pdf":
            pdf = pypdfium2.PdfDocument(file)
            total_pages = len(pdf)
            return ext, total_pages
        # pdfじゃない時 = img系で1枚確定
        return ext, 1
    finally:
        if pdf is not None:
            try:
                pdf.close()
            except Exception:
                pass
        file.seek(0)


# 1枚ずつimgを返す
def render_page(file, page_number, input_ext, output_ext=".png", dpi=300):
    if page_number < 1:
        raise ValueError("page_number must be 1-based (>= 1)")

    try:
        input_ext = exchange_ext(input_ext)
    except KeyError as err:
        raise ValueError(
            "Unsupported file format. Supported formats are "
            f"{sorted(ALLOWED_UPLOAD_FILE_EXTENSIONS)}"
        ) from err

    if input_ext not in ALLOWED_UPLOAD_FILE_EXTENSIONS:
        raise ValueError(
            "Unsupported file format. Supported formats are "
            f"{sorted(ALLOWED_UPLOAD_FILE_EXTENSIONS)}"
        )
    file.seek(0)
    pdf = None
    try:
        if input_ext == "pdf":
            pdf = pypdfium2.PdfDocument(file)
            page = pdf[page_number - 1]
            # preserved:色・階調・透明度を可能な限り維持した画像配列
            img_arr_preserved = page.render(
                scale=dpi / 72,
                rotation=0,
                fill_color=(255, 255, 255, 0),
            ).to_numpy()
            img_bytes = cv2.imencode(output_ext, img_arr_preserved)[1].tobytes()
            return img_bytes

        # jpg, pngの場合、output_extに拡張子を揃えるためエンコード、デコードを経由する
        img_bytes = file.read()
        img_arr_1d = np.frombuffer(img_bytes, np.uint8)
        img_arr_unchanged = cv2.imdecode(img_arr_1d, cv2.IMREAD_UNCHANGED)
        img_bytes = cv2.imencode(output_ext, img_arr_unchanged)[1].tobytes()
        return img_bytes
    finally:
        if pdf is not None:
            try:
                pdf.close()
            except Exception:
                pass
        file.seek(0)


def exchange_ext(ext):
    """
    拡張子の表記ゆれを吸収する関数
        Returns:は3文字(深い理由はない)
    """
    ext = UPLOAD_FILE_EXTENSION_ALIASES.get(ext, ext)
    if ext in ALLOWED_UPLOAD_FILE_EXTENSIONS:
        return ext
    raise KeyError(ext)


def crop_img_by_bbox(img, bbox):
    xs = [p[0] for p in bbox]
    ys = [p[1] for p in bbox]

    h, w = img.shape[:2]

    x_min = max(0, int(min(xs)))
    y_min = max(0, int(min(ys)))
    x_max = min(w, int(max(xs)))
    y_max = min(h, int(max(ys)))

    if x_min >= x_max or y_min >= y_max:
        raise ValueError("invalid bbox")

    cropped_img = img[y_min:y_max, x_min:x_max]
    offset = (x_min, y_min)

    return cropped_img, offset


def apply_offset_to_points(points, offset):
    ox, oy = offset

    return [[x + ox, y + oy] for x, y in points]
