from pathlib import Path
import pypdfium2
import numpy as np
import cv2
import io
import tifffile


# (.venv/lib64/python3.13/site-packages/yomitoku/constants.py)
# models.pyの定義に合わせる　modelsとtoolsで拡張子定義が個別なのを後で修正したい
SUPPORT_INPUT_FORMAT = ["jpg", "png", "bmp", "tif", "pdf"]
# SUPPORT_OUTPUT_FORMAT = ["json", "csv", "html", "markdown", "md", "pdf"]
# MIN_IMAGE_SIZE = 32
# WARNING_IMAGE_SIZE = 720
# filesizeはDjangoのバリデーターで十分であると判断
# /root/Django/RestOCR/.venv/lib64/python3.13/site-packages/yomitoku/data/functions.py を参考にする
# yomitokuにはRGBの入力が必要

def validate_and_analyze(file):
    ext = Path(file.name).suffix.lstrip('.').lower()
    ext = exchange_ext(ext)
    if ext not in SUPPORT_INPUT_FORMAT:
        raise ValueError(
            f"Unsupported file format. Supported formats are {SUPPORT_INPUT_FORMAT}")
    if ext == 'pdf':
       image_list, total_pages = analyze_pdf(file)
    elif ext in ["tif", "tiff"]:
        image_list, total_pages = analyze_tif(file)
    else:
        image_list, total_pages = analyze_img(file)
    return image_list, ext, total_pages


def analyze_pdf(file, type=".png", dpi=300):
    scale = dpi / 72 
    images = []
    pdf = pypdfium2.PdfDocument(file)
    for page in pdf:
        array = page.render(scale=scale, rotation=0).to_numpy() 
        images.append(cv2.imencode(type, array)[1].tobytes())
    return images, len(images)


def analyze_tif(file, type=".png"):
    file.seek(0)
    blob = file.read()
    images = []

    with tifffile.TiffFile(io.BytesIO(blob)) as tf:
        for s in tf.series:
            tif = s.asarray()
        # tifが複数枚の場合は(N, H, W) と要素が３つに増える
        if tif.ndim >= 3:
            tif_list = list(tif)
        else:
            tif_list = [tif]

    for img in tif_list:
        images.append(cv2.imencode(type, img)[1].tobytes())
    return images, len(images)


def analyze_img(file, type=".png"):
    # cv2.imreadmulti(str(file)) だと、Djangoではfileが不確定なケースがあるため seekでバイナリを読む
    # FieldFile（保存済み）、TemporaryUploadedFilefile.temporary_file_path() が取れることがある（実在パス）
    # InMemoryUploadedFile（アップロード直後・小さめ)実在パスが存在しない の三種類がある
    file.seek(0)
    blob = file.read() # blobはbinary large objectの意
    array = np.frombuffer(blob, np.uint8)
    img = cv2.imdecode(array, cv2.IMREAD_UNCHANGED)
    images = [cv2.imencode(type, img)[1].tobytes()]
    return images, 1

def exchange_ext(ext):
    """
    拡張子の表記ゆれを吸収する関数
        Returns:は3文字(深い理由はない)
    """
    ALIAS = {
        "jpeg": "jpg", "jpg": "jpg",
        "png":  "png",
        "bmp":  "bmp",
        "tiff":  "tif", "tif": "tif",
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