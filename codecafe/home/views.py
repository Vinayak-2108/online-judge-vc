from django.shortcuts import render, redirect
from rest_framework import viewsets
from .serializers import QuestionsSerializer
from .models import QuestionList
from django.http import JsonResponse
# Create your views here.


# def verdict(request, problem_id):
#     question = QuestionList.objects.get(pk=problem_id)
#     path = f"C:\Users\Vinayak\OneDrive\Documents\Projects\Code-Cafe\codecafe\codecafe\Files/{question.name}.txt"
    
#     if request.method == 'POST':
#         code = request.POST['code']
#         language = request.POST['language']
#         save_text_file(path, str(code))
#         change_file_name(path, f'{question.name}.txt')
#         change_file_extension(path, language)
        
#         return JsonResponse({'code': code, 'question': question})
#     else:
#         return redirect('problem', problem_id=problem_id)


class QuesView(viewsets.ModelViewSet):
    serializer_class = QuestionsSerializer
    queryset = QuestionList.objects.all()

# def index(request):
#     allquestions = QuestionList.objects.all()

#     return render(request, 'index.html', {'questions': allquestions})

# def problem(request, key):
#     question = QuestionList.objects.get(id=key)
#     return render(request, 'problem.html', {'question': question})