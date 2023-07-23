from django.db import models

# Create your models here.

class QuestionList(models.Model):
    name = models.CharField(max_length=100)
    difficulty = models.CharField(max_length=10)
    description = models.TextField()

class TestCases(models.Model):
    question = models.ForeignKey(QuestionList, on_delete=models.CASCADE)
    input=models.TextField()
    expected_output=models.TextField()

