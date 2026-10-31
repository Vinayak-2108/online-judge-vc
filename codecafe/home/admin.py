from django.contrib import admin
from .models import QuestionList, TestCases, Submissions

admin.site.register(QuestionList)
admin.site.register(TestCases)
admin.site.register(Submissions)
