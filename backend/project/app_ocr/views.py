from django.contrib.auth.models import User
from app_ocr.models import FileType, Direction, Document, Page, Word

from rest_framework.response import Response

from django.core.files.base import ContentFile
from app_ocr.serializers import UserSerializer, DocumentSerializer, PageSerializer, WordSerializer

#from app_ocr.permissions import IsOwnerOrReadOnly
from rest_framework.decorators import action
from rest_framework import mixins, viewsets
from rest_framework import status
from app_ocr.etc.tools import inspect_file
from app_ocr.etc.e_yomitoku import init_engine, test_ocr

from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction

from django_filters.rest_framework import DjangoFilterBackend
from app_ocr.filters import DocumentFilter
from rest_framework.filters import OrderingFilter
from app_ocr.tasks import ocr_page

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = DocumentFilter

    @action(detail=False, methods=['post'])
    def start_ocr(self, request):
        file = request.FILES.get('file') 
        ext_label, total_pages = inspect_file(file)
        doc = DocumentSerializer(data={
            "file":file, 
            "file_name":file.name,
            "file_type":FileType.label_to_value(ext_label), 
            "total_pages":total_pages
        })
        doc.is_valid(raise_exception=True)

        with transaction.atomic():
            doc.save()
            # テストでocr_page実行
            transaction.on_commit(lambda: ocr_page.delay(doc.instance.pk, 1))
        return Response({"document": doc.data}, status=status.HTTP_202_ACCEPTED) 

"""
→/services/ocr.py 的なフォルダに移行
ocr = init_engine()
for p, img in enumerate(images):
    words = test_ocr(img_bytes=img, ocr=ocr)
    words = default_word_sort(words) 
    img_file = ContentFile(img, name=f"{p}.png")
    page = PageSerializer(data={"doc":doc.instance.pk, "image":img_file, "page_number":p+1})
    if page.is_valid(raise_exception=True):
        page.save()
        # breakpoint() 
        for w in words:
            word = WordSerializer(data={"page":page.instance.pk, "bbox":w["points"], "content":w["content"], "direction":Direction.label_to_value(w["direction"]), "rec_score":w["rec_score"], "det_score":w["det_score"]})
            if word.is_valid(raise_exception=True):
                word.save()
"""
                        
        
class PageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Page.objects.all()
    serializer_class = PageSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["doc"]

class WordViewSet(mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet):
    # UpdateModelMixin を多重継承で足すとPATCH/PUTが生える
    # ReadOnlyModelViewSetはREAD単体用の合成クラスというだけで他CRUDをロックしているわけではない
    queryset = Word.objects.all()
    serializer_class = WordSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["page__page_number", "page__doc", "page"]
