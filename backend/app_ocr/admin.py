from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import GroupAdmin as DjangoGroupAdmin
from django.contrib.auth.models import Group, Permission
from django.db.models import Q
from django.utils.safestring import mark_safe

from .models import Document, Page, User, Word
from .permissions import CanRunDocumentOcr, CanRunWordOcr

admin.site.unregister(Group)
PERMISSION_DESCRIPTION = """
<div>
  <p>・1 User・1 Groupの関係を、User.groupの非NULL ForeignKeyによって保証する。</p>
  <p>
    ・PermissionはGroup単位で管理する。<br>
    User単位のPermissionは使用せず、所属Groupからのみ取得する。
  </p>
  <p>
    ・例外として、staff_group所属ユーザーについては、Django標準との互換性を維持するため、
    User単位の認可制御フラグであるis_staffおよびis_superuserを使用する。<br>
    is_staffはDjango Adminへのアクセスを許可する。<br>
    is_superuserは通常のPermission検査を迂回し、
    全Permissionを持つものとして振る舞う。<br>
    そのためstaff_groupには通常のPermissionを付与せず、
    AdminからのPermission編集も許可しない。
  </p>
  <p>・Adminから変更できるPermissionはOCR Permissionのみとする。</p>
  <p>
    ・Groupの初期値は0002のmigrationファイルにより、
    staff_group、standard_group、guest_groupとそのOCR権限が生成される。<br>
    暫定で編集制限は設けないが、ビジネスロジックに初期Groupが関係しているため、
    変更時は注意すること。
  </p>
</div>
"""


# Adminから変更できるPermissionはOCR Permissionのみとする
class GroupAdminForm(forms.ModelForm):
    class Meta:
        model = Group
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["permissions"].queryset = Permission.objects.filter(
            Q(
                content_type__app_label=CanRunDocumentOcr.app_label,
                content_type__model=CanRunDocumentOcr.model,
                codename=CanRunDocumentOcr.codename,
            )
            | Q(
                content_type__app_label=CanRunWordOcr.app_label,
                content_type__model=CanRunWordOcr.model,
                codename=CanRunWordOcr.codename,
            )
        )


@admin.register(Group)
class GroupAdmin(DjangoGroupAdmin):
    form = GroupAdminForm

    # staff_groupはPermissionを使用しないため、AdminのGroup管理対象に含めない。
    def get_queryset(self, request):
        return super().get_queryset(request).exclude(name="staff_group")

    def changelist_view(self, request, extra_context=None):
        # POST後のリダイレクト先GETで同じメッセージが重複しないよう、
        # GET時のみメッセージを追加する(Django Adminでは変更・削除処理もPOST)
        if request.method == "GET":
            self.message_user(
                request,
                mark_safe(PERMISSION_DESCRIPTION),
                level=messages.INFO,
            )

        return super().changelist_view(
            request,
            extra_context=extra_context,
        )

    def change_view(self, request, object_id, extra_context=None):
        if request.method == "GET":
            self.message_user(
                request,
                mark_safe(PERMISSION_DESCRIPTION),
                level=messages.INFO,
            )

        return super().change_view(
            request,
            object_id,
            extra_context=extra_context,
        )


# list_displayの表示項目はmodelsから自動で組み立てる
# 一覧表示するには重くなる可能性もあるため、その場合は変更する
def all_fields(model):
    return tuple(field.name for field in model._meta.fields)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = all_fields(User)
    search_fields = ("email",)
    list_filter = ("is_staff", "is_superuser", "group")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = all_fields(Document)
    list_filter = ("state", "file_type", "created")
    search_fields = ("file_name", "owner__email")
    autocomplete_fields = ("owner",)


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = all_fields(Page)
    list_filter = ("state",)
    search_fields = ("doc__file_name", "doc__owner__email")
    autocomplete_fields = ("doc",)


@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = all_fields(Word)
    search_fields = ("content", "page__doc__file_name")
    autocomplete_fields = ("page",)
