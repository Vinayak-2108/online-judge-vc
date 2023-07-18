# Will be used to convert models to JSON to interact with frontend

from rest_framework import serializers
from .models import QuestionList

class QuestionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionList
        fields = '__all__'