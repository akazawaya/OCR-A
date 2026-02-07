from django.urls import path, include
from rest_framework.routers import DefaultRouter
from app_ocr import views
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

"""
標準アクション（ModelViewSet の既定）
snippets
GET /snippets/ → list（一覧）… name=snippet-list
POST /snippets/ → create（作成）… name=snippet-list
GET /snippets/{pk}/ → retrieve（詳細）… name=snippet-detail
PUT /snippets/{pk}/ → update（全更新）… name=snippet-detail
PATCH /snippets/{pk}/ → partial_update（部分更新）… name=snippet-detail
DELETE /snippets/{pk}/ → destroy（削除）… name=snippet-detail
"""

# ルーターを作成し、ViewSet をそのルーターに登録します。
router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'documents', views.DocumentViewSet, basename='document')
router.register(r'pages', views.PageViewSet, basename='page')
router.register(r'words', views.WordViewSet, basename='word')

# これにより、APIのURLはルーターによって自動的に決定されます。
urlpatterns = [
    path('', include(router.urls)),
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema')),
]
