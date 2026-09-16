from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import Permission
from django.db.models import Q


# 継承元: Django 5.2.6 ModelBackend
# https://github.com/django/django/blob/5.2.6/django/contrib/auth/backends.py#L54-L242
class SingleGroupModelBackend(ModelBackend):
    # Userの単一group ForeignKeyを使用する認証・認可バックエンド。

    # Django標準: return user_obj.user_permissions.all()
    # このUserモデルではuser_permissionsを無効化しているため、空QuerySetを返す。
    # https://github.com/django/django/blob/5.2.6/django/contrib/auth/backends.py#L98-L99
    def _get_user_permissions(self, user_obj):
        # User単位のPermissionは使用しない。
        return Permission.objects.none()

    # Django標準: return Permission.objects.filter(group__in=user_obj.groups.all())
    # このUserモデルではM2Mのgroupsではなく、単一FKのgroupから取得する。
    # https://github.com/django/django/blob/5.2.6/django/contrib/auth/backends.py#L101-L102
    def _get_group_permissions(self, user_obj):
        return user_obj.group.permissions.all()

    # Django標準: Permissionのgroup__userまたはuser逆参照から対象Userを検索する。
    # このUserモデルでは単一FKのgroup__permissionsから対象Userを検索する。
    # 現在のアプリのビジネスロジックでは使用していないが、Django Adminでは使用。
    # 互換性を保つため、単一Group構造に合わせて実装する。
    # https://github.com/django/django/blob/5.2.6/django/contrib/auth/backends.py#L195-L228
    def with_perm(self, perm, is_active=True, include_superusers=True, obj=None):
        """単一group経由で、指定したPermissionを持つUserを返す。"""
        if isinstance(perm, str):
            try:
                app_label, codename = perm.split(".")
            except ValueError:
                raise ValueError(
                    "Permission name should be in the form "
                    "app_label.permission_codename."
                ) from None
        elif not isinstance(perm, Permission):
            raise TypeError(
                "The `perm` argument must be a string or a permission instance."
            )

        user_model = get_user_model()
        if obj is not None:
            return user_model._default_manager.none()

        if isinstance(perm, Permission):
            # Q(group__user) | Q(user) を判定していたものをgroupに限定
            user_q = Q(group__permissions=perm)
        else:
            user_q = Q(
                group__permissions__content_type__app_label=app_label,
                group__permissions__codename=codename,
            )

        if include_superusers:
            user_q |= Q(is_superuser=True)

        # 現在のUserではis_activeはDB Fieldではなく、常にTrueの属性
        if is_active is False:
            return user_model._default_manager.none()

        return user_model._default_manager.filter(user_q).distinct()
