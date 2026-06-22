from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.urls import include, path

urlpatterns = [
    path("", include("app_ocr.urls")),
]

# 開発環境(DEBUG = True)ならならアップロードファイル(MEDIA)を配信
# djangoでは開発者が用意したファイルをstatic、
# ユーザー側からアップロードされたファイルをmedia filesと称する
if settings.DEBUG:
    # 開発環境ではDjango経由でstaticファイル（DRFやAdminのCSS/JSなど）を配信する
    urlpatterns += staticfiles_urlpatterns()

    # 開発環境ではユーザーがアップロードしたmediaファイルを配信する
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
