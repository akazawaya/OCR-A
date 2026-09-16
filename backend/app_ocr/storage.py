import shutil
from pathlib import Path

from django.core.files.storage import FileSystemStorage

# Document / Page の保存先ルールを定義する
# DjangoのDB操作は FileField / ImageField の実ファイル削除を行わない
# (例:modelsのdelete(),viewsのトランザクションロールバック)
# そのため、オーバーライドして削除処理を追加するの関数をここに寄せる


# 直書きだと path が import 時に固定文字列として評価されるため、関数で定義する
def build_document_storage_prefix(doc_id):
    return f"input/doc-{doc_id}/"


def document_file_upload_to(instance, filename):
    return f"{build_document_storage_prefix(instance.id)}document/{filename}"


def page_image_upload_to(instance, filename):
    return f"{build_document_storage_prefix(instance.doc_id)}pages/{filename}"


def delete_storage_directory(storage, prefix):
    # S3にはdirの概念はなく、オブジェクトという単位での管理となる
    # よって、OSのファイルシステムを前提とするshutilとPathは使用不可能。
    # また、Djangoのstorage APIには再帰削除メソッドが存在せず、
    # storage.delete()で一つずつ削除が必要。(逆にdirの削除は不要)
    directories, files = storage.listdir(prefix)
    for file_name in files:
        storage.delete(f"{prefix}{file_name}")
    for directory in directories:
        delete_storage_directory(storage, f"{prefix}{directory}/")


def delete_document_files(document, prefix):
    storage = document.file.storage

    # ローカルストレージの経路
    # shutil.rmtree()はそのパス内すべてのfile,dir削除をまとめて実施する
    if isinstance(storage, FileSystemStorage):
        root_path = Path(storage.location) / prefix
        if root_path.exists():
            shutil.rmtree(root_path)
        return

    # クラウドストレージ(S3)の経路
    delete_storage_directory(storage, prefix)
