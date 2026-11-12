from app_ocr.service.gpu_worker.task_checker import (
    has_active_or_reserved_gpu_worker_tasks,
    has_pending_gpu_worker_queue_tasks,
)

queues = ["ocr_document_queue", "ocr_word_queue"]
active_or_reserved = has_active_or_reserved_gpu_worker_tasks(queues)
pending_in_redis = has_pending_gpu_worker_queue_tasks(queues)

print("active_or_reserved:", active_or_reserved)
print("pending_in_redis:", pending_in_redis)

if active_or_reserved or pending_in_redis:
    raise SystemExit("GPU OCR work exists; aborting deployment before cleanup")
