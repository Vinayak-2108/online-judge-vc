from django.db import models

# Create your models here.

class QuestionList(models.Model):
    name = models.CharField(max_length=100)
    difficulty = models.CharField(max_length=10)
    description = models.TextField()

