from django.conf import settings
from django.db import models


class QuestionList(models.Model):
    # Difficulty is shown as a roast: Easy = light, Medium = medium, Hard = dark.
    LIGHT = 'light'
    MEDIUM = 'medium'
    DARK = 'dark'
    DIFFICULTY_CHOICES = [
        (LIGHT, 'Light roast'),
        (MEDIUM, 'Medium roast'),
        (DARK, 'Dark roast'),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default=LIGHT)
    description = models.TextField()
    input_format = models.TextField(blank=True, default='')
    output_format = models.TextField(blank=True, default='')
    constraints = models.TextField(blank=True, default='')
    # [{"input": "...", "output": "...", "explanation": "..."}]
    examples = models.JSONField(default=list, blank=True)

    def __str__(self):
        return self.name


class TestCases(models.Model):
    question = models.ForeignKey(QuestionList, on_delete=models.CASCADE)
    tc_input = models.TextField()
    expected_output = models.TextField()


class Submissions(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submissions')
    # The problem name as it was when submitted.
    problem = models.CharField(max_length=100)
    question = models.ForeignKey(
        QuestionList, null=True, blank=True, on_delete=models.SET_NULL, related_name='submissions',
    )
    verdict = models.CharField(max_length=100)
    submission_time = models.DateTimeField(auto_now_add=True)
    language = models.CharField(max_length=30)
    code = models.TextField(blank=True, default='')
    runtime_ms = models.PositiveIntegerField(default=0)
    passed = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
