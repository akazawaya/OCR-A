import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer


class OcrProgressConsumer(WebsocketConsumer):
    def connect(self):
        self.accept()
        self.group_name = "broadcast"
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)

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
