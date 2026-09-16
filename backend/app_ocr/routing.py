from django.urls import path

from .consumers import OcrProgressConsumer

websocket_urlpatterns = [
    path("ocr/", OcrProgressConsumer.as_asgi()),
]
