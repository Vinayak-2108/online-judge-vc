from django.shortcuts import render
from .models import QuestionList
# Create your views here.
def index(request):
    allquestions = QuestionList.objects.all()

    return render(request, 'index.html', {'questions': allquestions})

def problem(request, key):
    question = QuestionList.objects.get(id=key)
    return render(request, 'problem.html', {'question': question})