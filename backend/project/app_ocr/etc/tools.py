from pathlib import Path
import pypdfium2
import numpy as np
import cv2
import io
# import tifffile
# 頃合いを見てtifffileはuvから排除する

# (.venv/lib64/python3.13/site-packages/yomitoku/constants.py)
# models.pyの定義に合わせる　modelsとtoolsで拡張子定義が個別なのを後で修正したい
SUPPORT_INPUT_FORMAT = ["jpg", "png", "pdf"]
# filesizeはDjangoのバリデーターで十分であると判断
# /root/Django/RestOCR/.venv/lib64/python3.13/site-packages/yomitoku/data/functions.py を参考にする
# yomitokuにはRGBの入力が必要

# 最低限のメタ情報 拡張子とページ数を返す
def inspect_file(file):
    ext = Path(file.name).suffix.lstrip('.').lower()
    ext = exchange_ext(ext)
    if ext not in SUPPORT_INPUT_FORMAT:
        raise ValueError(
            f"Unsupported file format. Supported formats are {SUPPORT_INPUT_FORMAT}")
    file.seek(0)
    pdf = None
    try:
        if ext == 'pdf':
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

# def analyze_tif(file, type=".png"): 廃止

# 1枚ずつimgを返す
def render_page(file, page_number, input_ext, output_ext=".png", dpi=300):
    if page_number < 1:
        raise ValueError("page_number must be 1-based (>= 1)")        

    if input_ext not in SUPPORT_INPUT_FORMAT:
        raise ValueError(
            f"Unsupported file format. Supported formats are {SUPPORT_INPUT_FORMAT}")
    file.seek(0)
    pdf = None
    try:
        if input_ext == 'pdf':
            pdf = pypdfium2.PdfDocument(file)
            page = pdf[page_number - 1]
            img_pixels = page.render(scale=dpi/72, rotation=0).to_numpy() 
            img_bytes = cv2.imencode(output_ext, img_pixels)[1].tobytes()
            return img_bytes

        file_bytes = file.read()
        file_bytes_uint8_ndarray = np.frombuffer(file_bytes, np.uint8)
        img_pixels = cv2.imdecode(file_bytes_uint8_ndarray, cv2.IMREAD_UNCHANGED)
        img_bytes = cv2.imencode(output_ext, img_pixels)[1].tobytes()
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
    ALIAS = {
        "jpeg": "jpg", "jpg": "jpg",
        "png":  "png",
        "pdf":  "pdf",
    }
    return ALIAS[ext]


# wordのデフォルトソートを整理する関数
def _bbox_bounds(points):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)

def _sort_key(w):
    points = w.get("points") 
    x_min, y_min, x_max, _y_max = _bbox_bounds(points)
    direction = w.get("direction")

    if direction == "horizontal":
        # 横書き: 上→下、左→右
        return (y_min, x_min, -x_max)

    # 縦書き: 右→左、上→下
    return (-x_max, y_min, x_min)

def default_word_sort(words):
    return sorted(words, key=_sort_key)