from django.db import migrations

DEFAULT_GROUP_NAMES = (
    "guest_group",
    "standard_group",
    "staff_group",
)


def create_default_groups(apps, _schema_editor):
    Group = apps.get_model("auth.Group")

    for name in DEFAULT_GROUP_NAMES:
        Group.objects.create(name=name)


class Migration(migrations.Migration):
    dependencies = [
        ("app_ocr", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_default_groups, migrations.RunPython.noop),
    ]
