from django.urls import path

from . import views

urlpatterns = [
    path("", views.apiOverview, name="home"),
    path("questions/", views.questionsList, name="questionsList"),
    path("questions/<int:pk>/", views.questionDetail, name="questionDetail"),
    path("questions/<slug:slug>/", views.questionDetail, name="questionDetailBySlug"),
    path("questions/run", views.run_code, name="run_code"),
    path("questions/submit", views.submit_code, name="submit_code"),
    path("submissions/", views.submissionsList, name="submissions"),
    path("submissions/summary/", views.submissionsSummary, name="submissionsSummary"),
    path("submissions/<int:pk>/", views.submissionDetail, name="submissionDetail"),
    path("me/", views.me, name="me"),
    path("demo/run", views.demo_run, name="demo_run"),
    path("demo/submit", views.demo_submit, name="demo_submit"),
]
