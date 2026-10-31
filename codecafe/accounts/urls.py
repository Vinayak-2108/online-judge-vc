from django.urls import path

from . import views

urlpatterns = [
    path('signup', views.signup),
    path('login', views.login),
    path('logout', views.logout),
    path('test_token', views.test_token),
]
