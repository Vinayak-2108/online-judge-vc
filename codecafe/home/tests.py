from unittest import mock

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from codecafe import compiler
from .models import Submissions


def judge0_result(status_id, stdout='', compile_output=None, stderr=None):
    return {
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
        self.assertEqual([q['id'] for q in res.data], [1, 2, 3])

        res = self.client.get('/api/questions/2/')
        self.assertEqual(res.data['name'], 'Reverse a String')

        self.assertEqual(self.client.get('/api/questions/999/').status_code, 404)


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
        execute.assert_called_once_with('x', 'cpp', '2 3')

    @mock.patch('codecafe.compiler.execute')
    def test_run_reports_compile_error(self, execute):
        execute.return_value = judge0_result(6, compile_output='error: expected ;')
        res = self.client.post('/api/questions/run', {'lang': 'cpp', 'code': 'x'}, format='json')
        self.assertEqual(res.data['error'], 'error: expected ;')

    @mock.patch('codecafe.compiler.execute')
    def test_submit_accepted_runs_all_testcases_of_problem(self, execute):
        outputs = iter(['5\n', '15', '2000000000  \n'])
        execute.side_effect = lambda *a, **k: judge0_result(3, stdout=next(outputs))
        res = self.submit()
        self.assertEqual(res.data['verdict'], 'Accepted')
        self.assertEqual(execute.call_count, 3)
        sub = Submissions.objects.get()
        self.assertEqual((sub.user, sub.problem, sub.verdict), ('alice', 'Sum of Two Numbers', 'Accepted'))

    @mock.patch('codecafe.compiler.execute')
    def test_submit_wrong_answer_reports_testcase(self, execute):
        outputs = iter(['5', '16'])
        execute.side_effect = lambda *a, **k: judge0_result(3, stdout=next(outputs))
        self.assertEqual(self.submit().data['verdict'], 'Wrong Answer on tc 2')

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
        Submissions.objects.create(user='alice', problem='A', verdict='Accepted', language='py')
        Submissions.objects.create(user='bob', problem='B', verdict='Accepted', language='py')
        res = self.client.get('/api/submissions/')
        self.assertEqual([s['user'] for s in res.data], ['bob', 'alice'])
        res = self.client.get('/api/submissions/?mine=1')
        self.assertEqual([s['user'] for s in res.data], ['alice'])
