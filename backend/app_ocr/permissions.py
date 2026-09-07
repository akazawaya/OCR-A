from rest_framework.permissions import BasePermission


class GroupPermission(BasePermission):
    # 所属Groupに指定したPermissionがあるUserだけを許可する。

    app_label = "app_ocr"
    model = None
    codename = None

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.group.permissions.filter(
            content_type__app_label=self.app_label,
            content_type__model=self.model,
            codename=self.codename,
        ).exists()


class CanRunDocumentOcr(GroupPermission):
    model = "document"
    codename = "run_ocr_document"


class CanRunWordOcr(GroupPermission):
    model = "word"
    codename = "run_ocr_word"
