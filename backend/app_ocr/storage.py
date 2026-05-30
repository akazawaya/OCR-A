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


def delete_document_files(document, prefix):
    storage = document.file.storage

    if isinstance(storage, FileSystemStorage):
        root_path = Path(storage.location) / prefix
        if root_path.exists():
            shutil.rmtree(root_path)
    return

    raise NotImplementedError("This storage backend is not supported yet.")
