from django.urls import path
from .consumers import OcrProgressConsumer

websocket_urlpatterns = [
    path("documents/<int:document_id>/", OcrProgressConsumer.as_asgi()),
]
