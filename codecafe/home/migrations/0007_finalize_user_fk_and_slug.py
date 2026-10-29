from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('home', '0006_backfill_slugs_users'),
    ]

    operations = [
        # A default keeps the removal reversible (the data migration restores the names).
        migrations.AlterField('submissions', 'user', models.CharField(max_length=100, default='')),
        migrations.RemoveField('submissions', 'user'),
        migrations.RenameField('submissions', 'user_fk', 'user'),
        migrations.AlterField(
            'submissions', 'user',
            models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                              related_name='submissions', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField('questionlist', 'slug', models.SlugField(max_length=120, unique=True)),
        migrations.AlterField(
            'questionlist', 'difficulty',
            models.CharField(max_length=10, default='light',
                             choices=[('light', 'Light roast'), ('medium', 'Medium roast'), ('dark', 'Dark roast')]),
        ),
    ]
