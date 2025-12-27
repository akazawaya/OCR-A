from django.contrib.auth.models import User
from app_ocr.models import FileType, Direction, Document, Page, Word

from rest_framework.response import Response

from django.core.files.base import ContentFile
from app_ocr.serializers import UserSerializer, DocumentSerializer, PageSerializer, WordSerializer

#from app_ocr.permissions import IsOwnerOrReadOnly
from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework import status
from app_ocr.etc.tools import validate_and_analyze
from app_ocr.etc.e_yomitoku import init_engine, test_ocr

from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction

from django_filters.rest_framework import DjangoFilterBackend
from app_ocr.filters import DocumentFilter
from rest_framework.filters import OrderingFilter

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
    def analyze(self, request):
        with transaction.atomic():
            file = request.FILES.get('file')   
            images, ext_label, total_pages = validate_and_analyze(file)
            doc = DocumentSerializer(data={"file":file, "file_name":file.name, "file_type":FileType.label_to_value(ext_label), "total_pages":total_pages})
            if doc.is_valid(raise_exception=True):
                doc.save() #　modelインスタンスでないとidを受取れない　doc.instanceでモデルにアクセス可能
                ocr = init_engine()
                for p, img in enumerate(images):
                    words = test_ocr(img_bytes=img, ocr=ocr)
                    img_file = ContentFile(img, name=f"{p}.png")
                    page = PageSerializer(data={"doc":doc.instance.pk, "image":img_file, "page_number":total_pages})
                    if page.is_valid(raise_exception=True):
                        page.save()
                        # breakpoint() 
                        for w in words:
                            word = WordSerializer(data={"page":page.instance.pk, "bbox":w["points"], "content":w["content"], "direction":Direction.label_to_value(w["direction"]), "rec_score":w["rec_score"], "det_score":w["det_score"]})
                            if word.is_valid(raise_exception=True):
                                word.save()
            return Response({"document": doc.data}, status=status.HTTP_201_CREATED)
                        
        
class PageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Page.objects.all()
    serializer_class = PageSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["doc"]

class WordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Word.objects.all()
    serializer_class = WordSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["page__doc", "page"]
