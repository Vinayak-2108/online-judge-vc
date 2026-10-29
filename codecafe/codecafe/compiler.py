"""Code execution through the Judge0 API (sandboxed, runs off our server)."""

import base64

import requests
from django.conf import settings

# Judge0 CE language ids
LANG_IDS = {
    'c': 50,     # C (GCC 9.2.0)
    'cpp': 54,   # C++ (GCC 9.2.0)
    'java': 62,  # Java (OpenJDK 13.0.1)
    'py': 71,    # Python (3.8.1)
}

ACCEPTED = 3
WRONG_ANSWER = 4
TIME_LIMIT = 5
COMPILATION_ERROR = 6


class JudgeError(Exception):
    """Judge0 could not be reached or returned an unusable response."""


def _headers():
    headers = {'Content-Type': 'application/json'}
    if settings.JUDGE0_KEY:
        headers['X-RapidAPI-Key'] = settings.JUDGE0_KEY
        headers['X-RapidAPI-Host'] = settings.JUDGE0_HOST
    return headers


def execute(code, lang, stdin='', expected_output=None):
    """Run code once and return the Judge0 result dict."""
    if lang not in LANG_IDS:
        raise ValueError(f'Unsupported language: {lang}')

    # base64 both ways: Judge0 rejects plain-text results that aren't valid
    # UTF-8, which GCC compile errors often are
    payload = {
        'source_code': _b64encode(code),
        'language_id': LANG_IDS[lang],
        'stdin': _b64encode(stdin or ''),
        'cpu_time_limit': 5,
    }
    if expected_output is not None:
        payload['expected_output'] = _b64encode(expected_output)

    try:
        res = requests.post(
            f'{settings.JUDGE0_URL}/submissions',
            params={'base64_encoded': 'true', 'wait': 'true'},
            json=payload,
            headers=_headers(),
            timeout=settings.JUDGE0_TIMEOUT,
        )
        res.raise_for_status()
        result = res.json()
    except (requests.RequestException, ValueError) as e:
        raise JudgeError(str(e)) from e

    for key in ('stdout', 'stderr', 'compile_output', 'message'):
        if result.get(key):
            result[key] = _b64decode(result[key])
    return result


def _b64decode(text):
    raw = base64.b64decode(text)
    try:
        return raw.decode('utf-8')
    except UnicodeDecodeError:
        # GCC on Judge0 emits cp1252 quotes in its diagnostics
        return raw.decode('cp1252', errors='replace')


def _b64encode(text):
    return base64.b64encode(text.encode('utf-8')).decode('ascii')


def run_code(code, lang, stdin=''):
    """Run against custom input. Returns {'status', 'output', 'error'}."""
    result = execute(code, lang, stdin)
    status = result.get('status') or {}
    error = result.get('compile_output') or result.get('stderr') or ''
    if status.get('id') not in (ACCEPTED, None) and not error:
        error = status.get('description', '')
    return {
        'status': status.get('description', 'Unknown'),
        'output': result.get('stdout') or '',
        'error': error,
    }


def _normalize(text):
    return '\n'.join(line.rstrip() for line in (text or '').strip().splitlines())


def judge(code, lang, testcases):
    """Run all testcases and return a verdict string."""
    for idx, tc in enumerate(testcases, start=1):
        result = execute(code, lang, tc.tc_input)
        status_id = (result.get('status') or {}).get('id')

        if status_id == COMPILATION_ERROR:
            return 'Compilation Error'
        if status_id == TIME_LIMIT:
            return f'Time Limit Exceeded on tc {idx}'
        if status_id != ACCEPTED:
            return f'Runtime Error on tc {idx}'
        if _normalize(result.get('stdout')) != _normalize(tc.expected_output):
            return f'Wrong Answer on tc {idx}'
    return 'Accepted'
