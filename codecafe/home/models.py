from django.db import models

# Create your models here.

class QuestionList(models.Model):
    name = models.CharField(max_length=100)
    difficulty = models.CharField(max_length=10)
    description = models.TextField()
    

class TestCases(models.Model):
    question = models.ForeignKey(QuestionList, on_delete=models.CASCADE)
    tc_input=models.TextField()
    expected_output=models.TextField()

class Submissions(models.Model):
    user = models.CharField(max_length=100)
    problem = models.CharField(max_length=100)
    verdict = models.CharField(max_length=100)
    submission_time = models.DateTimeField(auto_now_add=True)
    language = models.CharField(max_length=30)
    


