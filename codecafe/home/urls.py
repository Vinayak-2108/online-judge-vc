from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="home"),
    path("problems/<str:key>/", views.problem, name="question"),
]