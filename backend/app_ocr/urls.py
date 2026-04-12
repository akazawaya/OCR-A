from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.routers import DefaultRouter

from app_ocr import views

router = DefaultRouter()
router.register(r"users", views.UserViewSet, basename="user")
router.register(r"documents", views.DocumentViewSet, basename="document")
router.register(r"pages", views.PageViewSet, basename="page")
router.register(r"words", views.WordViewSet, basename="word")


urlpatterns = [
    path("", include(router.urls)),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"
    ),
    path("redoc/", SpectacularRedocView.as_view(url_name="schema")),
]
