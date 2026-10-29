from django.db import migrations
from django.utils.text import slugify

ROAST = {'Easy': 'light', 'Medium': 'medium', 'Hard': 'dark'}


def forwards(apps, schema_editor):
    Question = apps.get_model('home', 'QuestionList')
    Submissions = apps.get_model('home', 'Submissions')
    User = apps.get_model('auth', 'User')

    taken = set()
    for q in Question.objects.order_by('id'):
        base = slugify(q.name) or f'problem-{q.pk}'
        slug, n = base, 2
        while slug in taken:
            slug = f'{base}-{n}'
            n += 1
        taken.add(slug)
        q.slug = slug
        q.difficulty = ROAST.get(q.difficulty, q.difficulty if q.difficulty in ROAST.values() else 'light')
        q.save(update_fields=['slug', 'difficulty'])

    # Exact match first, then case-insensitive ("Alice" -> alice) when it is unambiguous.
    users = {u.username: u for u in User.objects.all()}
    lowered = {}
    for u in User.objects.order_by('id'):
        lowered.setdefault(u.username.lower(), []).append(u)
    questions = {}
    for q in Question.objects.order_by('id'):
        questions.setdefault(q.name, q)  # duplicate names: attach to the oldest
    for sub in Submissions.objects.all():
        user = users.get(sub.user)
        if user is None:
            candidates = lowered.get(sub.user.lower(), [])
            user = candidates[0] if len(candidates) == 1 else None
        if user is None:
            # No such account any more: keep the submission and the name it was made under.
            sub.legacy_username = sub.user
        sub.user_fk = user
        sub.question = questions.get(sub.problem)
        sub.save(update_fields=['user_fk', 'legacy_username', 'question'])


def backwards(apps, schema_editor):
    Question = apps.get_model('home', 'QuestionList')
    Submissions = apps.get_model('home', 'Submissions')
    label = {v: k for k, v in ROAST.items()}
    for q in Question.objects.all():
        q.difficulty = label.get(q.difficulty, q.difficulty)
        q.save(update_fields=['difficulty'])
    for sub in Submissions.objects.select_related('user_fk'):
        sub.user = sub.user_fk.username if sub.user_fk_id else sub.legacy_username
        sub.save(update_fields=['user'])


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0005_question_fields_and_submission_fields'),
        ('auth', '0001_initial'),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
