from channels.routing import URLRouter
from django.urls import path

import app_ocr.routing

websocket_urlpatterns = [
    path("ws/", URLRouter(app_ocr.routing.websocket_urlpatterns)),
]
