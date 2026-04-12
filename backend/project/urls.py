from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

urlpatterns = [
    path("", include("app_ocr.urls")),
]

# 開発環境(DEBUG = True)ならならアップロードファイル(MEDIA)を配信
# djangoでは開発者が用意したファイルをstatic、ユーザー側からアップロードされたファイルをmedia filesと称する
if settings.DEBUG:
    # ファイルの配信(MEDIA_URL,MEDIA_ROOTがsettingで未設定の場合はデフォルトの"”を参照する)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
