from django.urls import path
from .consumers import OcrProgressConsumer

websocket_urlpatterns = [
    path("documents/", OcrProgressConsumer.as_asgi()),
]
