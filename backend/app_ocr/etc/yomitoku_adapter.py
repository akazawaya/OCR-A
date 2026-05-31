from functools import lru_cache

import cv2
import numpy as np
from yomitoku.ocr import OCR

from .tools import apply_offset_to_points, crop_img_by_bbox


def init_engine():
    return OCR(visualize=False, device="auto")


@lru_cache(maxsize=1)
def get_engine():
    return init_engine()


# 1ページずつ処理する方針
def yomitoku_ocr(img_bytes, ocr_instance, bbox=None):
    words = []
    offset = None

    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bbox is not None:
        img_bgr, offset = crop_img_by_bbox(img_bgr, bbox)

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    results, _ = ocr_instance(img_rgb)
    for w in results.words:
        points = w.points
        if offset is not None:
            points = apply_offset_to_points(points, offset)

        content = {
            "points": points,
            "content": w.content,
            "direction": w.direction,
            "det_score": w.det_score,
            "rec_score": w.rec_score,
        }
        words.append(content)

    return words
