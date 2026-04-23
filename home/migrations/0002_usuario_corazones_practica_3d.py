from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='corazones',
            field=models.IntegerField(default=3),
        ),
        migrations.AddField(
            model_name='usuario',
            name='practica_3d_completada',
            field=models.BooleanField(default=False),
        ),
    ]
