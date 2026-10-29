from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from codecafe import compiler
from .models import QuestionList, TestCases, Submissions
from .serializers import QuestionsSerializer, SubmissionSerializer


@api_view(['GET'])
def apiOverview(request):
    api_urls = {
        'Questions': '/api/questions/',
        'Question detail': '/api/questions/<id>/',
        'Run code': '/api/questions/run',
        'Submit code': '/api/questions/submit',
        'Submissions': '/api/submissions/?mine=1',
    }
    return Response(api_urls)


@api_view(['GET'])
def questionsList(request):
    questions = QuestionList.objects.order_by('id')
    serializer = QuestionsSerializer(questions, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def questionDetail(request, pk):
    question = get_object_or_404(QuestionList, pk=pk)
    return Response(QuestionsSerializer(question).data)


@api_view(['GET'])
def submissionsList(request):
    submissions = Submissions.objects.order_by('-submission_time')
    if request.query_params.get('mine') and request.user.is_authenticated:
        submissions = submissions.filter(user=request.user.username)
    serializer = SubmissionSerializer(submissions[:100], many=True)
    return Response(serializer.data)


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
        verdict = compiler.judge(code, lang, testcases)
    except compiler.JudgeError:
        return Response({'error': 'Judge unavailable, try again later'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    Submissions.objects.create(
        user=request.user.username,
        problem=question.name,
        language=lang,
        verdict=verdict,
    )
    return Response({'verdict': verdict})
