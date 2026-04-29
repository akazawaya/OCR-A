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

    # {"type": "foo", "document_id": 1, "state": "SUCCESS"}　のようなpayloadを送信
    # ※現状、このイベントはトリガーとしてのみ使っており、payloadの内容自体は未使用
    def document_state_changed(self, event):
        payload = {
            "type": "document_state_changed",
            "document_id": event.get("document_id"),
            "state": event.get("state"),
        }
        self.send(text_data=json.dumps(payload))
