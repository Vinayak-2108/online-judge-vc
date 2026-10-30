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
            # fields=* because Judge0's default response leaves out exit_code
            params={'base64_encoded': 'true', 'wait': 'true', 'fields': '*'},
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
        # a program that never compiled has no runtime
        'runtime_ms': None if status.get('id') == COMPILATION_ERROR else _runtime_ms(result),
        'exit_code': result.get('exit_code'),
    }


def _normalize(text):
    return '\n'.join(line.rstrip() for line in (text or '').strip().splitlines())


def _runtime_ms(result):
    """Judge0 reports `time` as seconds in a string, e.g. "0.012"."""
    try:
        return int(round(float(result.get('time') or 0) * 1000))
    except (TypeError, ValueError):
        return 0


def judge(code, lang, testcases):
    """Run the testcases in order and stop at the first failure.

    Returns (verdict, passed, total, runtime_ms); runtime_ms is the slowest
    test case that ran, or None for a compile or runtime error.
    """
    testcases = list(testcases)
    total = len(testcases)
    passed = 0
    runtime_ms = 0
    for idx, tc in enumerate(testcases, start=1):
        result = execute(code, lang, tc.tc_input)
        runtime_ms = max(runtime_ms, _runtime_ms(result))
        status_id = (result.get('status') or {}).get('id')

        # A program that never compiled or crashed has no meaningful runtime: unknown (None), not 0.
        if status_id == COMPILATION_ERROR:
            return 'Compilation Error', passed, total, None
        if status_id == TIME_LIMIT:
            return f'Time Limit Exceeded on tc {idx}', passed, total, runtime_ms
        if status_id != ACCEPTED:
            return f'Runtime Error on tc {idx}', passed, total, None
        if _normalize(result.get('stdout')) != _normalize(tc.expected_output):
            return f'Wrong Answer on tc {idx}', passed, total, runtime_ms
        passed += 1
    return 'Accepted', passed, total, runtime_ms
