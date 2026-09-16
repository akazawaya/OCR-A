from rest_framework.permissions import BasePermission


class GroupPermission(BasePermission):
    # SingleGroupModelBackendを介し、所属GroupにPermissionがあるUserだけを許可する。

    app_label = "app_ocr"
    model = None
    codename = None

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.has_perm(f"{self.app_label}.{self.codename}")


class CanRunDocumentOcr(GroupPermission):
    model = "document"
    codename = "run_ocr_document"


class CanRunWordOcr(GroupPermission):
    model = "word"
    codename = "run_ocr_word"
