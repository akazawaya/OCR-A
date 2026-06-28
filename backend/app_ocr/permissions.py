from rest_framework.permissions import BasePermission


class HasOcrAccess(BasePermission):
    message = "このアカウントではOCRを利用できません。"

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        profile = getattr(user, "useraccount", None)
        if profile is None:
            return False

        return profile.ocr_access_tier != "none"
