from django.shortcuts import render, redirect
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .serializers import QuestionsSerializer, TestCasesSerializer, SubmissionSerializer
from .models import QuestionList, TestCases, Submissions
from codecafe.compiler import compile_code, exec_code, check_tc
import os
# Create your views here.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
print("Base Directory:", BASE_DIR)


@api_view(['GET'])
def apiOverview(request):
    api_urls = {
        'List':'ques-list'
    }
    return Response(api_urls)

@api_view(['GET'])
def questionsList(request):
    questions = QuestionList.objects.all()
    serializer = QuestionsSerializer(questions, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def submissionsList(request):
    submissions = Submissions.objects.all()
    serializer = SubmissionSerializer(submissions, many=True)
    return Response(serializer.data)

@api_view(['GET','POST'])
def run_code(request):
    lang = request.data.get('lang')
    code = request.data.get('code')
    input_data = request.data.get('input_data')
    if code is "":
        return Response({'output':'Empty code body'})
    try:
        
        path = BASE_DIR + f'\dump\\temp.{lang}'
        
        with open(path,'w') as f:
            f.write(code)
        
        compile_code(path,lang)
        result = exec_code(lang,str(input_data).replace(' ','\n'))
        # result=result.replace('\n',' ').replace(' ','')
        result=result.replace('\n','')
        return Response({'file_path': path, 'output': result})
    except Exception as e:
            return Response({'message': str(e)})

@api_view(['GET','POST'])
def submit_code(request):
    lang = request.data.get('lang')
    code = request.data.get('code')
    problem_id = request.data.get('problem_id')
    question = QuestionList.objects.get(id=problem_id)
    tc = TestCases.objects.filter(id=problem_id)
    if code is "":
        return Response({'verdict':'Empty code body'})
    try:
        
        path = BASE_DIR + f'\dump\\temp.{lang}'
        
        with open(path,'w') as f:
            f.write(code)
        print("1")
        compile_code(path,lang)
        print("2")
        result = check_tc(tc,lang)
        print("3")
        # result=result.replace('\n',' ').replace(' ','')
        result=result.replace('\n','')
        
        # submission = Submissions(
        #      user = 
        # )

        return Response({'verdict': result})
    except Exception as e:
            print("hello world")
            return Response({'message': str(e)})
