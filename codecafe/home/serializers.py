# Converts models to JSON for the frontend.

from rest_framework import serializers
from .models import QuestionList, TestCases, Submissions


class QuestionsSerializer(serializers.ModelSerializer):
    """Full problem, as the problem page needs it."""

    test_count = serializers.SerializerMethodField()

    def get_test_count(self, obj):
        return obj.testcases_set.count()

    class Meta:
        model = QuestionList
        fields = [
            'id', 'name', 'slug', 'difficulty', 'description',
            'input_format', 'output_format', 'constraints', 'examples', 'test_count',
        ]


class QuestionListItemSerializer(serializers.ModelSerializer):
    """A row of the problems list, with the caller's status and the acceptance rate.

    Expects the view to put `stats` (question id -> dict) in the context.
    """

    test_count = serializers.IntegerField(read_only=True)
    status = serializers.SerializerMethodField()
    acceptance_rate = serializers.SerializerMethodField()
    best_runtime_ms = serializers.SerializerMethodField()

    class Meta:
        model = QuestionList
        fields = [
            'id', 'name', 'slug', 'difficulty', 'description',
            'input_format', 'output_format', 'constraints', 'examples', 'test_count',
            'status', 'acceptance_rate', 'best_runtime_ms',
        ]

    def _stats(self, obj):
        return self.context.get('stats', {}).get(obj.pk, {})

    def get_status(self, obj):
        return self._stats(obj).get('status', 'new')

    def get_acceptance_rate(self, obj):
        return self._stats(obj).get('acceptance_rate')

    def get_best_runtime_ms(self, obj):
        return self._stats(obj).get('best_runtime_ms')


class TestCasesSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCases
        fields = '__all__'


class SubmissionSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    problem_slug = serializers.CharField(source='question.slug', read_only=True, default=None)

    def get_user(self, obj):
        return obj.user.username if obj.user_id else obj.legacy_username

    class Meta:
        model = Submissions
        fields = [
            'id', 'user', 'problem', 'problem_slug', 'question', 'verdict',
            'submission_time', 'language', 'passed', 'total', 'runtime_ms',
        ]


class SubmissionDetailSerializer(SubmissionSerializer):
    class Meta(SubmissionSerializer.Meta):
        fields = SubmissionSerializer.Meta.fields + ['code']
