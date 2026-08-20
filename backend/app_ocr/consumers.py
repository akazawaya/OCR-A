import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

from app_ocr.channel_groups import get_ocr_progress_group_name


class OcrProgressConsumer(WebsocketConsumer):
    def connect(self):
        user = self.scope["user"]
        self.group_name = get_ocr_progress_group_name(user.pk)
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)
        self.accept()

    # close_codeが未使用だが、
    # disconnectはChannels側からdisconnect(self, close_code)の形で呼ばれるので必須
    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name, self.channel_name
        )

    # Document一覧の再取得トリガーとしてのみ使う。
    def document_changed(self, event):
        payload = {"type": "document_changed"}
        self.send(text_data=json.dumps(payload))

    def preview_word_ocr_changed(self, event):
        payload = {
            "type": "preview_word_ocr_changed",
            "preview_job_id": event.get("preview_job_id"),
            "state": event.get("state"),
        }
        self.send(text_data=json.dumps(payload))
