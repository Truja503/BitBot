from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0002_usuario_corazones_practica_3d'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='xp',
            field=models.IntegerField(default=0),
        ),
    ]
