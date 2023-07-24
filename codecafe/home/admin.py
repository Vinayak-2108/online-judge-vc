from django.contrib import admin
from .models import QuestionList, TestCases
# Register your models here.
admin.site.register(QuestionList)
admin.site.register(TestCases)