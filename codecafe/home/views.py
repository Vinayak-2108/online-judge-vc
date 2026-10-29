from django.db.models import Count, Min, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from codecafe import compiler
from .models import QuestionList, TestCases, Submissions
from .serializers import (
    QuestionListItemSerializer,
    QuestionsSerializer,
    SubmissionDetailSerializer,
    SubmissionSerializer,
)

ACCEPTED = 'Accepted'
ROASTS = [value for value, _ in QuestionList.DIFFICULTY_CHOICES]
SUBMISSIONS_DEFAULT_LIMIT = 100
SUBMISSIONS_MAX_LIMIT = 100


@api_view(['GET'])
def apiOverview(request):
    api_urls = {
        'Questions': '/api/questions/',
        'Question detail': '/api/questions/<id or slug>/',
        'Run code': '/api/questions/run',
        'Submit code': '/api/questions/submit',
        'Submissions': '/api/submissions/?mine=1&limit=50&offset=0',
        'Submission detail': '/api/submissions/<id>/',
        'Me': '/api/me/',
    }
    return Response(api_urls)


def _problem_stats(user):
    """Per-problem status for `user` (may be anonymous) and the acceptance rate."""
    stats = {}
    rows = Submissions.objects.values('question').annotate(
        total=Count('id'),
        accepted=Count('id', filter=Q(verdict=ACCEPTED)),
    )
    for row in rows:
        if row['question'] is None:
            continue
        rate = round(100 * row['accepted'] / row['total'], 1) if row['total'] else None
        stats[row['question']] = {'acceptance_rate': rate, 'status': 'new', 'best_runtime_ms': None}

    if user.is_authenticated:
        mine = Submissions.objects.filter(user=user, question__isnull=False).values('question').annotate(
            solved=Count('id', filter=Q(verdict=ACCEPTED)),
            best=Min('runtime_ms', filter=Q(verdict=ACCEPTED)),
        )
        for row in mine:
            entry = stats.setdefault(row['question'], {'acceptance_rate': None, 'best_runtime_ms': None})
            entry['status'] = 'solved' if row['solved'] else 'attempted'
            entry['best_runtime_ms'] = row['best']
    return stats


@api_view(['GET'])
def questionsList(request):
    questions = QuestionList.objects.order_by('id')
    serializer = QuestionListItemSerializer(
        questions, many=True, context={'stats': _problem_stats(request.user)},
    )
    return Response(serializer.data)


@api_view(['GET'])
def questionDetail(request, pk=None, slug=None):
    if slug is not None:
        question = get_object_or_404(QuestionList, slug=slug)
    else:
        question = get_object_or_404(QuestionList, pk=pk)
    return Response(QuestionsSerializer(question).data)


@api_view(['GET'])
def submissionsList(request):
    submissions = Submissions.objects.select_related('user', 'question').order_by('-submission_time', '-id')
    if request.query_params.get('mine') and request.user.is_authenticated:
        submissions = submissions.filter(user=request.user)
    try:
        limit = int(request.query_params.get('limit', SUBMISSIONS_DEFAULT_LIMIT))
        offset = int(request.query_params.get('offset', 0))
    except ValueError:
        return Response({'error': 'limit and offset must be integers'}, status=status.HTTP_400_BAD_REQUEST)
    limit = max(1, min(limit, SUBMISSIONS_MAX_LIMIT))
    offset = max(0, offset)
    serializer = SubmissionSerializer(submissions[offset:offset + limit], many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def submissionDetail(request, pk):
    """One of the caller's own submissions, including its code."""
    submission = get_object_or_404(
        Submissions.objects.select_related('user', 'question'), pk=pk, user=request.user,
    )
    return Response(SubmissionDetailSerializer(submission).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Counts by roast for the overview strip."""
    by_roast = {r: {'solved': 0, 'attempted': 0, 'total': 0} for r in ROASTS}
    for row in QuestionList.objects.values('difficulty').annotate(n=Count('id')):
        if row['difficulty'] in by_roast:
            by_roast[row['difficulty']]['total'] = row['n']

    per_question = Submissions.objects.filter(user=request.user, question__isnull=False).values(
        'question', 'question__difficulty',
    ).annotate(solved=Count('id', filter=Q(verdict=ACCEPTED)))
    for row in per_question:
        bucket = by_roast.get(row['question__difficulty'])
        if bucket is None:
            continue
        bucket['solved' if row['solved'] else 'attempted'] += 1

    return Response({
        'username': request.user.username,
        'submissions': Submissions.objects.filter(user=request.user).count(),
        'solved': sum(b['solved'] for b in by_roast.values()),
        'attempted': sum(b['attempted'] for b in by_roast.values()),
        'total': sum(b['total'] for b in by_roast.values()),
        'by_roast': by_roast,
    })


def _validate_code(request):
    lang = request.data.get('lang')
    code = request.data.get('code') or ''
    if not code.strip():
        return None, None, Response({'error': 'Empty code body'}, status=status.HTTP_400_BAD_REQUEST)
    if lang not in compiler.LANG_IDS:
        return None, None, Response({'error': f'Unsupported language: {lang}'}, status=status.HTTP_400_BAD_REQUEST)
    return lang, code, None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_code(request):
    lang, code, error = _validate_code(request)
    if error:
        return error
    try:
        result = compiler.run_code(code, lang, request.data.get('input_data') or '')
    except compiler.JudgeError:
        return Response({'error': 'Judge unavailable, try again later'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_code(request):
    lang, code, error = _validate_code(request)
    if error:
        return error
    question = get_object_or_404(QuestionList, pk=request.data.get('problem_id'))
    testcases = TestCases.objects.filter(question=question).order_by('id')

    try:
        verdict, passed, total, runtime_ms = compiler.judge(code, lang, testcases)
    except compiler.JudgeError:
        return Response({'error': 'Judge unavailable, try again later'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    submission = Submissions.objects.create(
        user=request.user,
        problem=question.name,
        question=question,
        language=lang,
        verdict=verdict,
        code=code,
        passed=passed,
        total=total,
        runtime_ms=runtime_ms,
    )
    return Response({
        'id': submission.pk,
        'verdict': verdict,
        'passed': passed,
        'total': total,
        'runtime_ms': runtime_ms,
    })
