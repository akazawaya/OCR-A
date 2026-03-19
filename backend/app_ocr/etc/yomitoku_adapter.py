import cv2
import numpy as np
from yomitoku.ocr import OCR
from functools import lru_cache


def init_engine():
    return OCR(visualize=False, device="auto")


@lru_cache(maxsize=1)
def get_engine():
    return init_engine()


# 1ページずつ処理する方針
def yomitoku_ocr(img_bytes, ocr_instance):
    words = []
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    arr_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if arr_bgr is None:
        raise ValueError("failed to read")
    img_rgb = cv2.cvtColor(arr_bgr, cv2.COLOR_BGR2RGB)  # yomitokuはrgb入力想定

    results, _ = ocr_instance(img_rgb)
    # ocrの初期化は外部入力を必要とする
    for w in results.words:
        content = {
            "points": w.points,
            "content": w.content,
            "direction": w.direction,
            "det_score": w.det_score,
            "rec_score": w.rec_score,
        }
        words.append(content)
    return words
