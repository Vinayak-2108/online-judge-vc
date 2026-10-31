from django.contrib.auth.models import User
from rest_framework.test import APITestCase


class AuthTests(APITestCase):
    def test_signup_creates_user_with_hashed_password(self):
        res = self.client.post('/accounts/signup', {
            'username': 'alice', 'email': 'alice@example.com', 'password': 'Brew-1234-coffee',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertIn('token', res.data)
        self.assertNotIn('password', res.data['user'])
        self.assertTrue(User.objects.get(username='alice').check_password('Brew-1234-coffee'))

    def test_signup_rejects_duplicates_and_weak_passwords(self):
        User.objects.create_user('alice', 'alice@example.com', 'Brew-1234-coffee')
        res = self.client.post('/accounts/signup', {
            'username': 'alice', 'email': 'alice@example.com', 'password': '123',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('username', res.data)
        self.assertIn('email', res.data)
        self.assertIn('password', res.data)

    def test_login_and_token_check(self):
        User.objects.create_user('bob', 'bob@example.com', 'Brew-1234-coffee')
        res = self.client.post('/accounts/login', {'username': 'bob', 'password': 'Brew-1234-coffee'}, format='json')
        self.assertEqual(res.status_code, 200)
        token = res.data['token']

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        res = self.client.post('/accounts/test_token', format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['username'], 'bob')

        res = self.client.post('/accounts/logout', format='json')
        self.assertEqual(res.status_code, 200)
        res = self.client.post('/accounts/test_token', format='json')
        self.assertEqual(res.status_code, 401)

    def test_login_failures_return_400(self):
        User.objects.create_user('bob', 'bob@example.com', 'Brew-1234-coffee')
        for body in ({'username': 'bob', 'password': 'wrong'}, {'username': 'nobody', 'password': 'x'}, {}):
            res = self.client.post('/accounts/login', body, format='json')
            self.assertEqual(res.status_code, 400)

    def test_token_check_requires_auth(self):
        res = self.client.post('/accounts/test_token', format='json')
        self.assertEqual(res.status_code, 401)


class SignupFieldTests(APITestCase):
    def test_email_is_required_and_validated(self):
        base = {'username': 'carol', 'password': 'Brew-1234-coffee'}
        res = self.client.post('/accounts/signup', {**base, 'email': 'not-an-email'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('email', res.data)
        res = self.client.post('/accounts/signup', base, format='json')
        self.assertIn('email', res.data)

    def test_test_token_returns_email(self):
        res = self.client.post('/accounts/signup', {
            'username': 'carol', 'email': 'carol@example.com', 'password': 'Brew-1234-coffee',
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {res.data['token']}")
        me = self.client.post('/accounts/test_token', format='json')
        self.assertEqual((me.data['username'], me.data['email']), ('carol', 'carol@example.com'))
