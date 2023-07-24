# Generated by Django 4.2.3 on 2023-07-23 20:02

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0002_questionlist_description'),
    ]

    operations = [
        migrations.CreateModel(
            name='TestCases',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tc_input', models.TextField()),
                ('expected_output', models.TextField()),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='home.questionlist')),
            ],
        ),
    ]
