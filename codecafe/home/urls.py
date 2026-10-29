from django.urls import path

from . import views

urlpatterns = [
    path("", views.apiOverview, name="home"),
    path("questions/", views.questionsList, name="questionsList"),
    path("questions/<int:pk>/", views.questionDetail, name="questionDetail"),
    path("questions/run", views.run_code, name="run_code"),
    path("questions/submit", views.submit_code, name="submit_code"),
    path("submissions/", views.submissionsList, name="submissions"),
]
