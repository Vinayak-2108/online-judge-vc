"""Demo data for local development: a user with a realistic week of submissions and other
brewers whose submissions give each problem an acceptance rate.

    python manage.py loaddata sample_problems
    python manage.py seed_demo            # login riya_s / Brew-1234-coffee
    python manage.py seed_demo --reset    # wipe and re-seed
"""

import random
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from home.models import QuestionList, Submissions

PASSWORD = 'Brew-1234-coffee'

# slug -> target acceptance (%) among the other brewers
TARGETS = {
    'sum-of-two-numbers': 92.4, 'count-the-vowels': 88.1, 'reverse-a-string': 81.7,
    'prime-sieve-up-to-n': 79.6, 'second-largest-in-an-array': 74.9, 'balanced-brackets': 63.5,
    'longest-common-prefix': 61.0, 'merge-two-sorted-lists': 58.2, 'rotate-an-array': 55.0,
    'coin-change': 41.0, 'longest-increasing-subsequence': 38.5, 'nth-fibonacci': 46.3,
}

# (problem slug, verdict, language, passed, runtime_ms, minutes ago) for riya_s, newest first
RIYA = [
    ('balanced-brackets', 'Wrong Answer on tc 5', 'py', 4, 31, 12),
    ('balanced-brackets', 'Time Limit Exceeded on tc 5', 'py', 4, 5000, 25),
    ('sum-of-two-numbers', 'Accepted', 'py', None, 16, 62),
    ('sum-of-two-numbers', 'Compilation Error', 'cpp', 0, None, 70),
    ('prime-sieve-up-to-n', 'Accepted', 'cpp', None, 142, 26 * 60),
    ('longest-common-prefix', 'Runtime Error on tc 3', 'java', 2, None, 27 * 60),
    ('count-the-vowels', 'Accepted', 'py', None, 18, 3 * 24 * 60),
    ('reverse-a-string', 'Accepted', 'py', None, 21, 3 * 24 * 60 + 25),
    ('reverse-a-string', 'Wrong Answer on tc 2', 'py', 1, 19, 3 * 24 * 60 + 32),
]


class Command(BaseCommand):
    help = 'Create demo users and submissions for local development.'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='delete the demo users first')

    def handle(self, *args, **options):
        questions = {q.slug: q for q in QuestionList.objects.all()}
        if not questions:
            raise CommandError('No problems found. Run: python manage.py loaddata sample_problems')
        if options['reset']:
            User.objects.filter(username__startswith='brewer').delete()
            User.objects.filter(username='riya_s').delete()
        if User.objects.filter(username='riya_s').exists():
            self.stdout.write('riya_s already exists; use --reset to re-seed.')
            return

        now = timezone.now()
        rng = random.Random(7)
        brewers = [User.objects.create_user(f'brewer{i}', f'brewer{i}@example.edu', PASSWORD) for i in range(1, 9)]
        for slug, target in TARGETS.items():
            q = questions.get(slug)
            if not q:
                continue
            total = 100
            accepted = round(total * target / 100)
            verdicts = ['Accepted'] * accepted + ['Wrong Answer on tc 2'] * (total - accepted)
            rng.shuffle(verdicts)
            for verdict in verdicts:
                self._make(q, rng.choice(brewers), verdict, rng.choice(['py', 'cpp', 'java']),
                           now - timedelta(minutes=rng.randint(30, 9 * 24 * 60)))

        riya = User.objects.create_user('riya_s', 'riya.sen@example.edu', PASSWORD)
        for slug, verdict, lang, passed, runtime, minutes in reversed(RIYA):
            q = questions.get(slug)
            if q:
                self._make(q, riya, verdict, lang, now - timedelta(minutes=minutes), passed, runtime)
        self.stdout.write(self.style.SUCCESS(f'Seeded. Log in as riya_s / {PASSWORD}'))

    def _make(self, q, user, verdict, lang, when, passed=None, runtime=None):
        total = q.testcases_set.count()
        if passed is None:
            passed = total if verdict == 'Accepted' else 1
        sub = Submissions.objects.create(
            user=user, problem=q.name, question=q, verdict=verdict, language=lang, code='',
            passed=passed, total=total, runtime_ms=runtime if runtime is not None or verdict != 'Accepted' else 20,
        )
        Submissions.objects.filter(pk=sub.pk).update(submission_time=when)
