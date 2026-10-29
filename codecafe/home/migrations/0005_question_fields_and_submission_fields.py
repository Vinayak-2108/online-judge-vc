from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('home', '0004_submissions'),
    ]

    operations = [
        migrations.AddField('questionlist', 'slug', models.SlugField(max_length=120, default='', blank=True)),
        migrations.AddField('questionlist', 'input_format', models.TextField(blank=True, default='')),
        migrations.AddField('questionlist', 'output_format', models.TextField(blank=True, default='')),
        migrations.AddField('questionlist', 'constraints', models.TextField(blank=True, default='')),
        migrations.AddField('questionlist', 'examples', models.JSONField(blank=True, default=list)),
        migrations.AddField('submissions', 'code', models.TextField(blank=True, default='')),
        migrations.AddField('submissions', 'runtime_ms', models.PositiveIntegerField(default=0)),
        migrations.AddField('submissions', 'passed', models.PositiveIntegerField(default=0)),
        migrations.AddField('submissions', 'total', models.PositiveIntegerField(default=0)),
        migrations.AddField(
            'submissions', 'question',
            models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL,
                              related_name='submissions', to='home.questionlist'),
        ),
        # Temporary column; the data migration fills it from the old username string.
        migrations.AddField(
            'submissions', 'user_fk',
            models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE,
                              related_name='+', to=settings.AUTH_USER_MODEL),
        ),
    ]
