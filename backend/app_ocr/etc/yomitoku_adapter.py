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


def _decode_image_for_ocr(img_bytes):
    img_arr_1d = np.frombuffer(img_bytes, dtype=np.uint8)
    img_arr_unchanged = cv2.imdecode(img_arr_1d, cv2.IMREAD_UNCHANGED)
    if img_arr_unchanged is None:
        raise ValueError("Invalid image bytes")

    if img_arr_unchanged.ndim == 2:
        return cv2.cvtColor(img_arr_unchanged, cv2.COLOR_GRAY2BGR)

    if img_arr_unchanged.shape[2] == 3:
        return img_arr_unchanged

    if img_arr_unchanged.shape[2] == 4:
        img_arr_bgr = img_arr_unchanged[:, :, :3].astype(np.float32)
        # 透明層alphaは割合に変換して、元画像 * alpha + 白背景 * (1 - alpha)として合成
        alpha_ratio = img_arr_unchanged[:, :, 3:4].astype(np.float32) / 255.0
        white_background = np.full_like(img_arr_bgr, 255.0)
        return np.round(
            img_arr_bgr * alpha_ratio + white_background * (1.0 - alpha_ratio)
        ).astype(np.uint8)

    raise ValueError("Unsupported image channel count")


# 1ページずつ処理する方針
def yomitoku_ocr(img_bytes, ocr_instance, bbox=None):
    words = []
    offset = None

    img_arr_bgr = _decode_image_for_ocr(img_bytes)

    if bbox is not None:
        img_arr_bgr, offset = crop_img_by_bbox(img_arr_bgr, bbox)

    results, _ = ocr_instance(img_arr_bgr)
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
