from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("video/bg/", views.stream_video, name="stream_video"),
    path("video/v2/", views.stream_video2, name="stream_video2"),
    path("registro/", views.registro, name="registro"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("dashboard/", views.dashboard, name="dashboard"),
]
