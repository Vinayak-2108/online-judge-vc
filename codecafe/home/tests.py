from unittest import mock

from django.contrib.auth.models import User
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from codecafe import compiler
from .models import Submissions, TestCases


def judge0_result(status_id, stdout='', compile_output=None, stderr=None, time='0.010'):
    return {
        'time': time,
        'status': {'id': status_id, 'description': 'desc'},
        'stdout': stdout,
        'compile_output': compile_output,
        'stderr': stderr,
    }


class QuestionTests(APITestCase):
    fixtures = ['sample_problems']

    def test_list_and_detail(self):
        res = self.client.get('/api/questions/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([q['id'] for q in res.data], [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13])

        res = self.client.get('/api/questions/2/')
        self.assertEqual(res.data['name'], 'Reverse a String')
        self.assertEqual(res.data['slug'], 'reverse-a-string')
        self.assertEqual(res.data['difficulty'], 'medium')
        self.assertEqual(res.data['examples'][0], {'input': 'hello', 'output': 'olleh', 'explanation': ''})
        self.assertIn('constraints', res.data)
        self.assertEqual(res.data['test_count'], 2)
        self.assertIn('input_format', res.data)
        self.assertIn('output_format', res.data)

        self.assertEqual(self.client.get('/api/questions/999/').status_code, 404)

    def test_detail_by_slug(self):
        res = self.client.get('/api/questions/nth-fibonacci/')
        self.assertEqual((res.status_code, res.data['id'], res.data['difficulty']), (200, 3, 'dark'))
        self.assertEqual(self.client.get('/api/questions/nope/').status_code, 404)


class JudgeTests(APITestCase):
    fixtures = ['sample_problems']

    def setUp(self):
        self.user = User.objects.create_user('alice', 'alice@example.com', 'Brew-1234-coffee')
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def submit(self, **extra):
        body = {'lang': 'py', 'code': 'print(5)', 'problem_id': 1, **extra}
        return self.client.post('/api/questions/submit', body, format='json')

    def test_run_and_submit_require_auth(self):
        self.client.credentials()
        self.assertEqual(self.client.post('/api/questions/run', {}, format='json').status_code, 401)
        self.assertEqual(self.submit().status_code, 401)

    @mock.patch('codecafe.compiler.execute')
    def test_run_returns_output(self, execute):
        execute.return_value = judge0_result(3, stdout='5\n')
        res = self.client.post('/api/questions/run', {'lang': 'cpp', 'code': 'x', 'input_data': '2 3'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['output'], '5\n')
        self.assertEqual(res.data['runtime_ms'], 10)
        execute.assert_called_once_with('x', 'cpp', '2 3')

    @mock.patch('codecafe.compiler.execute')
    def test_run_reports_compile_error(self, execute):
        execute.return_value = judge0_result(6, compile_output='error: expected ;')
        res = self.client.post('/api/questions/run', {'lang': 'cpp', 'code': 'x'}, format='json')
        self.assertEqual(res.data['error'], 'error: expected ;')
        self.assertIsNone(res.data['runtime_ms'])

    @mock.patch('codecafe.compiler.execute')
    def test_submit_accepted_runs_all_testcases_of_problem(self, execute):
        outputs = iter(['5\n', '15', '2000000000  \n'])
        execute.side_effect = lambda *a, **k: judge0_result(3, stdout=next(outputs))
        res = self.submit()
        self.assertEqual(execute.call_count, 3)
        sub = Submissions.objects.get()
        self.assertEqual((sub.user, sub.problem, sub.verdict), (self.user, 'Sum of Two Numbers', 'Accepted'))
        self.assertEqual((sub.passed, sub.total, sub.runtime_ms), (3, 3, 10))
        self.assertEqual(sub.code, 'print(5)')
        self.assertEqual(sub.question_id, 1)
        self.assertEqual(
            res.data,
            {'id': sub.pk, 'verdict': 'Accepted', 'passed': 3, 'total': 3, 'runtime_ms': 10},
        )

    def test_legacy_submission_serializes_old_name_and_null_runtime(self):
        Submissions.objects.create(user=None, legacy_username='ghost', problem='A', verdict='Accepted', language='py')
        row = self.client.get('/api/submissions/').data[0]
        self.assertEqual(row['user'], 'ghost')
        self.assertEqual((row['runtime_ms'], row['passed'], row['total']), (None, None, None))

    @mock.patch('codecafe.compiler.execute')
    def test_submit_wrong_answer_reports_testcase(self, execute):
        outputs = iter(['5', '16'])
        execute.side_effect = lambda *a, **k: judge0_result(3, stdout=next(outputs))
        res = self.submit()
        self.assertEqual(res.data['verdict'], 'Wrong Answer on tc 2')
        self.assertEqual((res.data['passed'], res.data['total']), (1, 3))
        self.assertEqual(Submissions.objects.get().passed, 1)

    @mock.patch('codecafe.compiler.execute')
    def test_submit_compile_error_and_tle(self, execute):
        execute.return_value = judge0_result(6, compile_output='bad')
        self.assertEqual(self.submit().data['verdict'], 'Compilation Error')
        execute.return_value = judge0_result(5)
        self.assertEqual(self.submit().data['verdict'], 'Time Limit Exceeded on tc 1')
        execute.return_value = judge0_result(11, stderr='Traceback')
        self.assertEqual(self.submit().data['verdict'], 'Runtime Error on tc 1')

    @mock.patch('codecafe.compiler.execute', side_effect=compiler.JudgeError('down'))
    def test_judge_unavailable(self, execute):
        res = self.submit()
        self.assertEqual(res.status_code, 503)
        self.assertFalse(Submissions.objects.exists())

    def test_submit_validation(self):
        self.assertEqual(self.submit(code='  ').status_code, 400)
        self.assertEqual(self.submit(lang='rust').status_code, 400)
        self.assertEqual(self.submit(problem_id=999).status_code, 404)

    def test_submissions_newest_first_and_mine_filter(self):
        bob = User.objects.create_user('bob', 'bob@example.com', 'Brew-1234-coffee')
        Submissions.objects.create(user=self.user, problem='A', verdict='Accepted', language='py')
        Submissions.objects.create(user=bob, problem='B', verdict='Accepted', language='py')
        res = self.client.get('/api/submissions/')
        self.assertEqual([s['user'] for s in res.data], ['bob', 'alice'])
        res = self.client.get('/api/submissions/?mine=1')
        self.assertEqual([s['user'] for s in res.data], ['alice'])
        self.assertEqual(
            set(res.data[0]),
            {'id', 'user', 'problem', 'problem_slug', 'question', 'verdict', 'submission_time',
             'language', 'passed', 'total', 'runtime_ms'},
        )

    def test_submissions_limit_and_offset(self):
        for n in range(5):
            Submissions.objects.create(user=self.user, problem=f'P{n}', verdict='Accepted', language='py')
        res = self.client.get('/api/submissions/?limit=2&offset=1')
        self.assertEqual([s['problem'] for s in res.data], ['P3', 'P2'])
        self.assertEqual(self.client.get('/api/submissions/?limit=abc').status_code, 400)

    def test_submission_detail_is_owner_only_and_has_code(self):
        bob = User.objects.create_user('bob', 'bob@example.com', 'Brew-1234-coffee')
        mine = Submissions.objects.create(user=self.user, problem='A', verdict='Accepted', language='py', code='x=1')
        theirs = Submissions.objects.create(user=bob, problem='B', verdict='Accepted', language='py', code='y=2')
        res = self.client.get(f'/api/submissions/{mine.pk}/')
        self.assertEqual(res.data['code'], 'x=1')
        self.assertEqual(self.client.get(f'/api/submissions/{theirs.pk}/').status_code, 404)
        self.client.credentials()
        self.assertEqual(self.client.get(f'/api/submissions/{mine.pk}/').status_code, 401)


class JudgeFunctionTests(APITestCase):
    fixtures = ['sample_problems']

    def cases(self):
        return TestCases.objects.filter(question_id=1).order_by('id')

    @mock.patch('codecafe.compiler.execute')
    def test_returns_verdict_counts_and_slowest_runtime(self, execute):
        outputs = iter(['5', '15', '2000000000'])
        times = iter(['0.004', '0.120', '0.031'])
        execute.side_effect = lambda *a, **k: judge0_result(3, stdout=next(outputs), time=next(times))
        self.assertEqual(compiler.judge('c', 'py', self.cases()), ('Accepted', 3, 3, 120))

    @mock.patch('codecafe.compiler.execute')
    def test_stops_at_first_failure(self, execute):
        execute.side_effect = [judge0_result(3, stdout='5'), judge0_result(3, stdout='nope', time='0.5')]
        self.assertEqual(compiler.judge('c', 'py', self.cases()), ('Wrong Answer on tc 2', 1, 3, 500))
        self.assertEqual(execute.call_count, 2)

    @mock.patch('codecafe.compiler.execute')
    def test_compile_error_has_zero_passed_and_unknown_runtime(self, execute):
        result = judge0_result(6, compile_output='bad')
        result['time'] = None
        execute.return_value = result
        self.assertEqual(compiler.judge('c', 'cpp', self.cases()), ('Compilation Error', 0, 3, None))


    @mock.patch('codecafe.compiler.execute')
    def test_runtime_error_has_unknown_runtime_and_tle_keeps_it(self, execute):
        execute.return_value = judge0_result(11, stderr='Traceback', time='0.2')
        self.assertEqual(compiler.judge('c', 'py', self.cases())[::3], ('Runtime Error on tc 1', None))
        execute.return_value = judge0_result(5, time='5.01')
        self.assertEqual(compiler.judge('c', 'py', self.cases()), ('Time Limit Exceeded on tc 1', 0, 3, 5010))

    @mock.patch('codecafe.compiler.execute')
    def test_run_code_reports_exit_code(self, execute):
        result = judge0_result(3, stdout='5')
        result['exit_code'] = 0
        execute.return_value = result
        self.assertEqual(compiler.run_code('x', 'py', '2 3')['exit_code'], 0)


class ProblemStatsTests(APITestCase):
    fixtures = ['sample_problems']

    def setUp(self):
        self.alice = User.objects.create_user('alice', 'alice@example.com', 'Brew-1234-coffee')
        self.bob = User.objects.create_user('bob', 'bob@example.com', 'Brew-1234-coffee')

    def sub(self, user, qid, verdict, runtime=10):
        return Submissions.objects.create(
            user=user, problem='x', question_id=qid, verdict=verdict, language='py', runtime_ms=runtime,
        )

    def auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=user).key}')

    def test_anonymous_sees_new_status_and_acceptance_rate(self):
        self.sub(self.alice, 1, 'Accepted')
        self.sub(self.bob, 1, 'Wrong Answer on tc 1')
        self.sub(self.bob, 1, 'Wrong Answer on tc 2')
        self.sub(self.bob, 1, 'Accepted')
        by_id = {q['id']: q for q in self.client.get('/api/questions/').data}
        self.assertEqual([by_id[i]['test_count'] for i in (1, 2, 3)], [3, 2, 3])
        self.assertEqual(by_id[1]['status'], 'new')
        self.assertEqual(by_id[1]['acceptance_rate'], 50.0)
        self.assertIsNone(by_id[2]['acceptance_rate'])
        self.assertIsNone(by_id[1]['best_runtime_ms'])

    def test_status_per_user(self):
        self.sub(self.alice, 1, 'Wrong Answer on tc 1')
        self.sub(self.alice, 1, 'Accepted', runtime=40)
        self.sub(self.alice, 1, 'Accepted', runtime=25)
        self.sub(self.alice, 2, 'Runtime Error on tc 1')
        self.sub(self.bob, 3, 'Accepted')
        self.auth(self.alice)
        by_id = {q['id']: q for q in self.client.get('/api/questions/').data}
        self.assertEqual([by_id[i]['status'] for i in (1, 2, 3)], ['solved', 'attempted', 'new'])
        self.assertEqual(by_id[1]['best_runtime_ms'], 25)
        self.assertIsNone(by_id[2]['best_runtime_ms'])
        # an accepted legacy submission has an unknown runtime: null, not 0
        Submissions.objects.create(user=self.alice, problem='x', question_id=3, verdict='Accepted', language='py')
        by_id = {q['id']: q for q in self.client.get('/api/questions/').data}
        self.assertEqual(by_id[3]['status'], 'solved')
        self.assertIsNone(by_id[3]['best_runtime_ms'])
        self.assertEqual(by_id[3]['acceptance_rate'], 100.0)

    def test_submissions_summary_counts(self):
        self.sub(self.alice, 1, 'Accepted')
        self.sub(self.bob, 1, 'Accepted')
        self.sub(self.bob, 2, 'Accepted')
        anon = self.client.get('/api/submissions/summary/').data
        self.assertEqual((anon['everyone'], anon['mine'], anon['matching']), (3, None, 3))
        self.auth(self.bob)
        mine = self.client.get('/api/submissions/summary/?mine=1').data
        self.assertEqual((mine['everyone'], mine['mine'], mine['matching'], mine['matching_week']), (3, 2, 2, 2))

    def test_submission_filters_and_matching_counts(self):
        from datetime import timedelta
        from django.utils import timezone
        self.sub(self.alice, 1, 'Accepted')
        self.sub(self.alice, 1, 'Wrong Answer on tc 3')
        self.sub(self.alice, 2, 'Time Limit Exceeded on tc 1')
        self.sub(self.alice, 2, 'Compilation Error')
        old = self.sub(self.alice, 2, 'Runtime Error on tc 2')
        Submissions.objects.filter(pk=old.pk).update(submission_time=timezone.now() - timedelta(days=30), language='cpp')
        verdicts = lambda q: sorted(s['verdict'] for s in self.client.get('/api/submissions/' + q).data)
        self.assertEqual(verdicts('?verdict=accepted'), ['Accepted'])
        self.assertEqual(verdicts('?verdict=wrong'), ['Wrong Answer on tc 3'])
        self.assertEqual(verdicts('?verdict=time'), ['Time Limit Exceeded on tc 1'])
        self.assertEqual(verdicts('?verdict=compile'), ['Compilation Error'])
        self.assertEqual(verdicts('?verdict=runtime'), ['Runtime Error on tc 2'])
        self.assertEqual(len(verdicts('?language=cpp')), 1)
        self.assertEqual(len(verdicts('?language=py')), 4)
        summary = self.client.get('/api/submissions/summary/?language=cpp').data
        self.assertEqual((summary['matching'], summary['matching_week']), (1, 0))
        summary = self.client.get('/api/submissions/summary/').data
        self.assertEqual((summary['matching'], summary['matching_week']), (5, 4))
        # one problem's submissions, and the newest accepted one for it
        self.sub(self.alice, 2, 'Accepted')
        by_problem = lambda q: [s['problem_slug'] for s in self.client.get('/api/submissions/' + q).data]
        self.assertEqual(set(by_problem('?problem=reverse-a-string')), {'reverse-a-string'})
        self.assertEqual(by_problem('?problem=sum-of-two-numbers&verdict=accepted&limit=1'), ['sum-of-two-numbers'])
        self.assertEqual(by_problem('?problem=nth-fibonacci'), [])
        self.assertEqual(self.client.get('/api/submissions/summary/?problem=reverse-a-string').data['matching'], 4)
        for bad in ('?verdict=nope', '?language=rust'):
            self.assertEqual(self.client.get('/api/submissions/' + bad).status_code, 400)
            self.assertEqual(self.client.get('/api/submissions/summary/' + bad).status_code, 400)

    def test_questions_list_with_bad_token_is_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token nope')
        self.assertEqual(self.client.get('/api/questions/').status_code, 401)

    def test_me_requires_auth_and_counts_by_roast(self):
        self.assertEqual(self.client.get('/api/me/').status_code, 401)
        self.sub(self.alice, 1, 'Accepted')
        self.sub(self.alice, 1, 'Wrong Answer on tc 1')
        self.sub(self.alice, 2, 'Compilation Error')
        self.sub(self.bob, 3, 'Accepted')
        self.auth(self.alice)
        res = self.client.get('/api/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {
            'username': 'alice',
            'email': 'alice@example.com',
            'submissions': 3,
            'solved': 1,
            'attempted': 1,
            'total': 12,
            'by_roast': {
                'light': {'solved': 1, 'attempted': 0, 'total': 4},
                'medium': {'solved': 0, 'attempted': 1, 'total': 5},
                'dark': {'solved': 0, 'attempted': 0, 'total': 3},
            },
        })


class MigrationBackfillTests(TransactionTestCase):
    """The data migration copies usernames to the user FK and fills slugs."""

    auth_leaf = ('auth', '0012_alter_user_first_name_max_length')
    migrate_from = [('home', '0004_submissions'), auth_leaf]
    migrate_to = [('home', '0007_finalize_user_fk_and_slug'), auth_leaf]

    def tearDown(self):
        # Leave the schema at the latest migration for the tests that follow.
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(executor.loader.graph.leaf_nodes())

    def test_backfill(self):
        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_from)
        old = executor.loader.project_state(self.migrate_from).apps
        Question = old.get_model('home', 'QuestionList')
        Sub = old.get_model('home', 'Submissions')
        old.get_model('auth', 'User').objects.create(username='alice')
        old.get_model('auth', 'User').objects.create(username='Bob')
        old.get_model('auth', 'User').objects.create(username='carol')
        old.get_model('auth', 'User').objects.create(username='CAROL')
        Question.objects.create(name='Sum of Two Numbers', difficulty='Easy', description='d')
        Question.objects.create(name='Sum of Two Numbers', difficulty='Hard', description='d')
        for name in ['alice', 'Alice', 'bob', 'ghost', 'Carol']:
            Sub.objects.create(user=name, problem='Sum of Two Numbers', verdict='Accepted', language='py')

        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_to)
        new = executor.loader.project_state(self.migrate_to).apps
        Question = new.get_model('home', 'QuestionList')
        Sub = new.get_model('home', 'Submissions')
        self.assertEqual(
            list(Question.objects.order_by('id').values_list('slug', 'difficulty')),
            [('sum-of-two-numbers', 'light'), ('sum-of-two-numbers-2', 'dark')],
        )
        self.assertEqual(Sub.objects.count(), 5)  # nothing is dropped
        by_pk = list(Sub.objects.order_by('id').select_related('user'))
        # alice (exact), Alice (case-insensitive), bob -> Bob (case-insensitive)
        self.assertEqual([s.user.username if s.user else None for s in by_pk], ['alice', 'alice', 'Bob', None, None])
        # no account, and an ambiguous case-insensitive match: kept under the old name
        self.assertEqual([s.legacy_username for s in by_pk], ['', '', '', 'ghost', 'Carol'])
        self.assertEqual(by_pk[0].question.slug, 'sum-of-two-numbers')
        # unknown, not zero
        self.assertEqual([(s.runtime_ms, s.passed, s.total) for s in by_pk][0], (None, None, None))


class SeedDemoTests(APITestCase):
    fixtures = ['sample_problems']

    def test_fixtures_hold_twelve_problems_with_cases_and_examples(self):
        from .models import QuestionList
        self.assertEqual(QuestionList.objects.count(), 12)
        for q in QuestionList.objects.all():
            self.assertGreaterEqual(q.testcases_set.count(), 2, q.slug)
            self.assertTrue(q.examples and q.constraints and q.input_format and q.output_format, q.slug)
        roasts = [q.difficulty for q in QuestionList.objects.order_by('id')]
        self.assertEqual((roasts.count('light'), roasts.count('medium'), roasts.count('dark')), (4, 5, 3))

    def test_seed_demo_is_idempotent_and_gives_riya_a_week(self):
        from django.core.management import call_command
        from io import StringIO
        call_command('seed_demo', stdout=StringIO())
        call_command('seed_demo', stdout=StringIO())
        riya = User.objects.get(username='riya_s')
        self.assertEqual(riya.submissions.count(), 9)
        self.assertIsNone(riya.submissions.filter(verdict='Compilation Error').get().runtime_ms)


class ExecuteParamsTests(APITestCase):
    @mock.patch('codecafe.compiler.requests.post')
    def test_execute_asks_judge0_for_all_fields_so_exit_code_is_returned(self, post):
        post.return_value.json.return_value = {'status': {'id': 11}, 'exit_code': 3, 'time': '0.02'}
        post.return_value.raise_for_status.return_value = None
        result = compiler.execute('import sys; sys.exit(3)', 'py')
        self.assertEqual(post.call_args.kwargs['params']['fields'], '*')
        self.assertEqual(compiler.run_code('x', 'py')['exit_code'], 3)
        self.assertEqual(result['exit_code'], 3)


class DemoTests(APITestCase):
    fixtures = ['sample_problems']

    def setUp(self):
        from django.core.cache import cache
        cache.clear()

    def post(self, path, **extra):
        body = {'lang': 'py', 'code': 'print(5)', 'input_data': '2 3', **extra}
        return self.client.post(f'/api/demo/{path}', body, format='json')

    @mock.patch('codecafe.compiler.execute')
    def test_anyone_can_run_and_nothing_is_saved(self, execute):
        execute.return_value = judge0_result(3, stdout='5\n')
        res = self.post('run')
        self.assertEqual((res.status_code, res.data['output']), (200, '5\n'))
        execute.assert_called_once_with('print(5)', 'py', '2 3')
        self.assertFalse(Submissions.objects.exists())

    @mock.patch('codecafe.compiler.execute')
    def test_submit_judges_only_the_sum_problem_and_saves_nothing(self, execute):
        outputs = iter(['5', '15', '2000000000'])
        execute.side_effect = lambda *a, **k: judge0_result(3, stdout=next(outputs))
        res = self.post('submit', problem_id=3)  # a problem id in the body is ignored
        self.assertEqual(res.data, {'verdict': 'Accepted', 'passed': 3, 'total': 3, 'runtime_ms': 10})
        self.assertEqual([c.args[2] for c in execute.call_args_list], ['2 3', '-10\n25', '1000000000 1000000000'])
        self.assertFalse(Submissions.objects.exists())

    @mock.patch('codecafe.compiler.execute')
    def test_a_wrong_answer_reports_counts(self, execute):
        execute.side_effect = [judge0_result(3, stdout='5'), judge0_result(3, stdout='0')]
        res = self.post('submit')
        self.assertEqual((res.data['verdict'], res.data['passed'], res.data['total']), ('Wrong Answer on tc 2', 1, 3))

    def test_limits_and_validation(self):
        self.assertEqual(self.post('run', code='x' * 10_001).status_code, 400)
        self.assertEqual(self.post('run', input_data='9' * 1_001).status_code, 400)
        self.assertEqual(self.post('run', code='  ').status_code, 400)
        self.assertEqual(self.post('submit', lang='rust').status_code, 400)
        self.assertEqual(self.client.get('/api/demo/run').status_code, 405)

    @mock.patch('codecafe.compiler.execute')
    def test_signed_in_users_and_stale_tokens_work_too(self, execute):
        execute.return_value = judge0_result(3, stdout='5')
        user = User.objects.create_user('alice', 'alice@example.com', 'Brew-1234-coffee')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=user).key}')
        self.assertEqual(self.post('run').status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION='Token stale')
        self.assertEqual(self.post('run').status_code, 200)

    @mock.patch('codecafe.compiler.execute')
    def test_throttled_after_ten_requests_a_minute(self, execute):
        execute.return_value = judge0_result(3, stdout='5')
        codes = [self.post('run').status_code for _ in range(11)]
        self.assertEqual(codes[:10], [200] * 10)
        self.assertEqual(codes[10], 429)
        self.assertEqual(self.post('submit').status_code, 429)  # one budget for both demo endpoints

    @mock.patch('codecafe.compiler.execute', side_effect=compiler.JudgeError('down'))
    def test_judge_down_is_a_503(self, execute):
        self.assertEqual(self.post('run').status_code, 503)
        self.assertEqual(self.post('submit').status_code, 503)

    def test_missing_demo_problem_is_a_404(self):
        from .models import QuestionList
        QuestionList.objects.filter(slug='sum-of-two-numbers').delete()
        self.assertEqual(self.post('submit').status_code, 404)
