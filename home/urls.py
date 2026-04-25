from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("video/bg/", views.stream_video, name="stream_video"),
    path("video/v2/", views.stream_video2, name="stream_video2"),
    path("video/node-class/", views.stream_node_class, name="stream_node_class"),
    path("teoria/node-class/", views.node_class, name="node_class"),
    path("api/completar-node-class/", views.api_completar_node_class, name="api_completar_node_class"),
    path("registro/", views.registro, name="registro"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("practica/umbrel/", views.practica_umbrel, name="practica_umbrel"),
    path("practica/bitaxe/", views.practica_bitaxe, name="practica_bitaxe"),
    # API de progreso / corazones
    path("api/estado/", views.api_estado, name="api_estado"),
    path("api/perder-corazon/", views.api_perder_corazon, name="api_perder_corazon"),
    path("api/completar-practica/", views.api_completar_practica, name="api_completar_practica"),
    path("api/reset-corazones/", views.api_reset_corazones, name="api_reset_corazones"),
    path("api/activar-premium/", views.api_activar_premium, name="api_activar_premium"),
]
