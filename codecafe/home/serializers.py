# Will be used to convert models to JSON to interact with frontend

from rest_framework import serializers
from .models import QuestionList, TestCases, Submissions

class QuestionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionList
        fields = '__all__'

class TestCasesSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCases
        fields = '__all__'

class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submissions
        fields = '__all__'