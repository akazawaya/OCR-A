import os

ALLOWED_UPLOAD_FILE_EXTENSIONS = frozenset({"jpg", "jpeg", "png", "pdf"})
UPLOAD_FILE_EXTENSION_ALIASES = {"jpeg": "jpg"}
MAX_UPLOAD_FILE_SIZE = int(os.environ["MAX_UPLOAD_FILE_SIZE_MB"]) * 1024 * 1024
MAX_UPLOAD_FILE_NAME_LENGTH = 100
