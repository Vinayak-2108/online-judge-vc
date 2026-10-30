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
    ('balanced-brackets', 'Wrong Answer on tc 8', 'py', 7, 31, 12),
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
            # submissions outlive their user (SET_NULL), so remove the demo users' own first
            Submissions.objects.filter(user__username__startswith='brewer').delete()
            Submissions.objects.filter(user__username='riya_s').delete()
            Submissions.objects.filter(user__isnull=True, legacy_username='').delete()
            User.objects.filter(username__startswith='brewer').delete()
            User.objects.filter(username='riya_s').delete()
        if User.objects.filter(username='riya_s').exists():
            self.stdout.write('riya_s already exists; use --reset to re-seed.')
            return

        now = timezone.now()
        rng = random.Random(7)
        brewers = [User.objects.create_user(f'brewer{i}', f'brewer{i}@example.edu', PASSWORD) for i in range(1, 9)]
        riya = User.objects.create_user('riya_s', 'riya.sen@example.edu', PASSWORD)

        # Each problem ends up with exactly 1000 submissions in total, so its acceptance rate is the
        # target to one decimal even after riya's own submissions are counted.
        riya_counts = {}
        for slug, verdict, *_ in RIYA:
            n, a = riya_counts.get(slug, (0, 0))
            riya_counts[slug] = (n + 1, a + (verdict == 'Accepted'))

        field = Submissions._meta.get_field('submission_time')
        field.auto_now_add = False  # let bulk_create keep the times given below
        try:
            rows = []
            for slug, target in TARGETS.items():
                q = questions.get(slug)
                if not q:
                    continue
                total = q.testcases_set.count()
                riya_n, riya_acc = riya_counts.get(slug, (0, 0))
                # submissions already in the database (other real accounts) count towards the 1000
                existing = Submissions.objects.filter(question=q)
                existing_n = existing.count()
                existing_acc = existing.filter(verdict='Accepted').count()
                fixed_n, fixed_acc = riya_n + existing_n, riya_acc + existing_acc
                # find a total near 1000 whose accepted count rounds to exactly the target rate
                for tot in range(max(1000, fixed_n), 4000):
                    acc_total = round(target * tot / 100)
                    if acc_total >= fixed_acc and tot - fixed_n >= acc_total - fixed_acc and round(1000 * acc_total / tot) == round(target * 10):
                        break
                accepted = acc_total - fixed_acc
                others = tot - fixed_n
                failing = ['Wrong Answer on tc 2'] * 8 + ['Time Limit Exceeded on tc 3', 'Runtime Error on tc 1', 'Compilation Error']
                verdicts = ['Accepted'] * accepted + [rng.choice(failing) for _ in range(others - accepted)]
                rng.shuffle(verdicts)
                for verdict in verdicts:
                    rows.append(self._row(q, rng.choice(brewers), verdict, rng.choice(['py', 'cpp', 'java']),
                                          now - timedelta(minutes=rng.randint(30, 9 * 24 * 60)), total, rng))
            for slug, verdict, lang, passed, runtime, minutes in reversed(RIYA):
                q = questions.get(slug)
                if q:
                    rows.append(Submissions(
                        user=riya, problem=q.name, question=q, verdict=verdict, language=lang, code='',
                        passed=q.testcases_set.count() if verdict == 'Accepted' else passed,
                        total=q.testcases_set.count(), runtime_ms=runtime,
                        submission_time=now - timedelta(minutes=minutes),
                    ))
            Submissions.objects.bulk_create(rows, batch_size=500)
        finally:
            field.auto_now_add = True
        self.stdout.write(self.style.SUCCESS(f'Seeded. Log in as riya_s / {PASSWORD}'))

    @staticmethod
    def _row(q, user, verdict, lang, when, total, rng):
        accepted = verdict == 'Accepted'
        compile_error = verdict == 'Compilation Error'
        return Submissions(
            user=user, problem=q.name, question=q, verdict=verdict, language=lang, code='',
            passed=total if accepted else (0 if compile_error else rng.randint(0, max(total - 1, 0))),
            total=total,
            runtime_ms=None if compile_error or verdict.startswith('Runtime') else (5000 if verdict.startswith('Time') else rng.randint(12, 180)),
            submission_time=when,
        )
