from channels.generic.websocket import WebsocketConsumer

class MyConsumer(WebsocketConsumer):

    def connect(self):
        self.accept()
        self.group_name = "broadcast"
        self.channel_layer.group_add(self.group_name, self.channel_name)

    # close_codeが未使用だが、disconnectはChannels側からdisconnect(self, close_code)の形で呼ばれるので必須
    def disconnect(self, close_code):
        self.channel_layer.group_discard(self.group_name, self.channel_name)

    # worker: {"type": "document_state_changed", "document_id": 1, "state": "SUCCESS"}
    def document_state_changed(self, event):
        document_id = event.get("document_id")
        state = event.get("state")
        self.send(text_data=f"Document {document_id} state changed to {state}")
