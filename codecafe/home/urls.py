from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="home"),
    path('api/verdict/<int:problem_id>/', views.verdict, name='verdict_api'),
]