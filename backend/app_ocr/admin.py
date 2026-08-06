# Register your models here.
from django.contrib import admin

from .models import Document, Page, User, Word


# list_displayの表示項目はmodelsから自動で組み立てる
# 一覧表示するには重くなる可能性もあるため、その場合は変更する
def all_fields(model):
    return tuple(field.name for field in model._meta.fields)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = all_fields(User)
    search_fields = ("email",)
    list_filter = ("is_staff", "is_superuser", "groups")


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
