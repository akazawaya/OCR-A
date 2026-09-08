from django.db import migrations

DEFAULT_GROUP_NAMES = (
    "guest_group",
    "standard_group",
    "staff_group",
)
OCR_ALLOWED_GROUP_NAMES = (
    "standard_group",
    "staff_group",
)


def create_default_groups(apps, _schema_editor):
    Group = apps.get_model("auth.Group")
    Permission = apps.get_model("auth.Permission")
    ContentType = apps.get_model("contenttypes.ContentType")

    ocr_permissions = []
    for model, codename, permission_name in (
        ("document", "run_ocr_document", "Can run document OCR"),
        ("word", "run_ocr_word", "Can run word OCR"),
    ):
        content_type, _ = ContentType.objects.get_or_create(
            app_label="app_ocr",
            model=model,
        )
        permission, _ = Permission.objects.get_or_create(
            content_type=content_type,
            codename=codename,
            defaults={"name": permission_name},
        )
        ocr_permissions.append(permission)

    for name in DEFAULT_GROUP_NAMES:
        group = Group.objects.create(name=name)
        if name in OCR_ALLOWED_GROUP_NAMES:
            group.permissions.add(*ocr_permissions)


class Migration(migrations.Migration):
    dependencies = [
        ("app_ocr", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_default_groups, migrations.RunPython.noop),
    ]
