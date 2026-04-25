import os
import re
import json
from django.shortcuts import render, redirect
from django.http import StreamingHttpResponse, HttpResponse, JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .models import Usuario


def index(request):
    return render(request, "home/index.html")


# ─── Auth ────────────────────────────────────────────────────────────────────

def registro(request):
    error = None
    if request.method == "POST":
        nombre = request.POST.get("nombre", "").strip()
        password = request.POST.get("password", "")
        if not nombre or not password:
            error = "Username and password are required."
        elif Usuario.objects.filter(nombre=nombre).exists():
            error = "That username is already taken. Choose another."
        else:
            u = Usuario(nombre=nombre)
            u.set_password(password)
            u.save()
            request.session["usuario_id"] = u.id
            request.session["usuario_nombre"] = u.nombre
            return redirect("dashboard")
    return render(request, "home/registro.html", {"error": error})


def login_view(request):
    error = None
    if request.method == "POST":
        nombre = request.POST.get("nombre", "").strip()
        password = request.POST.get("password", "")
        try:
            u = Usuario.objects.get(nombre=nombre)
            if u.check_password(password):
                request.session["usuario_id"] = u.id
                request.session["usuario_nombre"] = u.nombre
                return redirect("dashboard")
            else:
                error = "Incorrect password."
        except Usuario.DoesNotExist:
            error = "User not found."
    return render(request, "home/login.html", {"error": error})


def logout_view(request):
    request.session.flush()
    return redirect("login")


def dashboard(request):
    if "usuario_id" not in request.session:
        return redirect("login")
    try:
        u = Usuario.objects.get(pk=request.session["usuario_id"])
    except Usuario.DoesNotExist:
        return redirect("logout")

    # Refill automático si corresponde
    u._refill_si_corresponde()

    # Leaderboard: todos los usuarios ordenados por XP desc
    todos = Usuario.objects.order_by('-xp', 'creado_en').values('id', 'nombre', 'xp', 'practica_3d_completada')
    leaderboard = []
    mi_posicion = 1
    for i, uu in enumerate(todos, start=1):
        lecciones = 6 if uu['practica_3d_completada'] else 0
        leaderboard.append({
            'pos':       i,
            'nombre':    uu['nombre'],
            'xp':        uu['xp'],
            'lecciones': lecciones,
            'es_yo':     uu['id'] == u.id,
        })
        if uu['id'] == u.id:
            mi_posicion = i

    # Barras de progreso por módulo (de 0 a 100)
    nodo_pct           = 100 if u.practica_3d_completada else 0
    nodo_lecciones     = 6 if u.practica_3d_completada else 0
    nodo_status        = "Completed" if u.practica_3d_completada else "Locked"
    modulos_completados = 1 if u.practica_3d_completada else 0

    return render(request, "home/dashboard.html", {
        "nombre":                u.nombre,
        "corazones":             u.corazones,
        "max_corazones":         u.MAX_CORAZONES,
        "es_premium":            u.es_premium,
        "segundos_refill":       u.segundos_para_refill(),
        "xp":                    u.xp,
        "practica_3d_completada": u.practica_3d_completada,
        "lecciones":             u.lecciones_completadas,
        "practicas":             u.practicas_completadas,
        "nodo_pct":              nodo_pct,
        "nodo_lecciones":        nodo_lecciones,
        "nodo_status":           nodo_status,
        "modulos_completados":    modulos_completados,
        "leaderboard":            leaderboard,
        "mi_posicion":            mi_posicion,
        "total_usuarios":         len(leaderboard),
        "node_class_completada":  u.node_class_completada,
    })


def practica_bitaxe(request):
    if "usuario_id" not in request.session:
        return redirect("login")
    try:
        u = Usuario.objects.get(pk=request.session["usuario_id"])
        completada = getattr(u, 'practica_bitaxe_completada', False)
    except Usuario.DoesNotExist:
        completada = False
    return render(request, "home/practica_bitaxe.html", {
        "nombre":    request.session.get("usuario_nombre", "Satoshi"),
        "completada": completada,
    })


def practica_umbrel(request):
    if "usuario_id" not in request.session:
        return redirect("login")
    try:
        u = Usuario.objects.get(pk=request.session["usuario_id"])
        corazones = u.corazones
        completada = u.practica_3d_completada
    except Usuario.DoesNotExist:
        corazones = 3
        completada = False
    return render(request, "home/practica_umbrel.html", {
        "nombre": request.session.get("usuario_nombre", "Satoshi"),
        "corazones": corazones,
        "completada": completada,
    })


# ─── API: estado de corazones ─────────────────────────────────────────────────

def api_estado(request):
    """Retorna el estado actual del usuario (corazones + timer + premium)."""
    if "usuario_id" not in request.session:
        return JsonResponse({"error": "not authenticated"}, status=401)
    try:
        u = Usuario.objects.get(pk=request.session["usuario_id"])
        u._refill_si_corresponde()
        return JsonResponse({
            "corazones":              u.corazones,
            "max_corazones":          u.MAX_CORAZONES,
            "segundos_refill":        u.segundos_para_refill(),
            "es_premium":             u.es_premium,
            "practica_3d_completada": u.practica_3d_completada,
        })
    except Usuario.DoesNotExist:
        return JsonResponse({"error": "user not found"}, status=404)


@require_POST
def api_perder_corazon(request):
    """El frontend llama esto cuando el jugador comete un error."""
    if "usuario_id" not in request.session:
        return JsonResponse({"error": "not authenticated"}, status=401)
    try:
        u = Usuario.objects.get(pk=request.session["usuario_id"])
        vivo = u.perder_corazon()
        return JsonResponse({
            "corazones":       u.corazones,
            "game_over":       not vivo,
            "segundos_refill": u.segundos_para_refill(),
            "es_premium":      u.es_premium,
        })
    except Usuario.DoesNotExist:
        return JsonResponse({"error": "user not found"}, status=404)


@require_POST
def api_completar_practica(request):
    """El frontend llama esto cuando se completa la práctica 3D."""
    if "usuario_id" not in request.session:
        return JsonResponse({"error": "not authenticated"}, status=401)
    try:
        u = Usuario.objects.get(pk=request.session["usuario_id"])
        u.completar_practica_3d()
        return JsonResponse({
            "ok":                     True,
            "practica_3d_completada": u.practica_3d_completada,
            "corazones":              u.corazones,
        })
    except Usuario.DoesNotExist:
        return JsonResponse({"error": "user not found"}, status=404)


@require_POST
def api_reset_corazones(request):
    """Resetea los corazones al máximo (debug / admin)."""
    if "usuario_id" not in request.session:
        return JsonResponse({"error": "not authenticated"}, status=401)
    try:
        u = Usuario.objects.get(pk=request.session["usuario_id"])
        u.corazones = u.MAX_CORAZONES
        u.corazones_vaciados_en = None
        u.save(update_fields=['corazones', 'corazones_vaciados_en'])
        return JsonResponse({"corazones": u.corazones})
    except Usuario.DoesNotExist:
        return JsonResponse({"error": "user not found"}, status=404)


@require_POST
def api_activar_premium(request):
    """
    Activa el plan premium del usuario.
    En producción aquí iría la verificación del pago (Stripe, etc.).
    Por ahora acepta el flag para integración futura.
    """
    if "usuario_id" not in request.session:
        return JsonResponse({"error": "not authenticated"}, status=401)
    try:
        u = Usuario.objects.get(pk=request.session["usuario_id"])
        u.activar_premium()
        return JsonResponse({
            "ok":          True,
            "es_premium":  u.es_premium,
            "corazones":   u.corazones,
        })
    except Usuario.DoesNotExist:
        return JsonResponse({"error": "user not found"}, status=404)


# ─── Range-aware video streaming ────────────────────────────────────────────
# Django's dev server doesn't support HTTP Range requests, which browsers
# need for seek/scrub.  This generic helper handles both full and range GETs.

CHUNK = 1024 * 512  # 512 KB

VIDEO_DIR = os.path.join(os.path.dirname(__file__), "static", "home", "video")

_VIDEOS = {
    "bg":         "Bg-video-scrub.mp4",
    "video2":     "Video2-scrub.mp4",
    "node_class": "Node_Class.mp4",
}


def _serve_video(request, filename):
    path = os.path.join(VIDEO_DIR, filename)
    file_size = os.path.getsize(path)
    content_type = "video/mp4"
    range_header = request.META.get("HTTP_RANGE", "")

    if range_header:
        match = re.search(r"bytes=(\d+)-(\d*)", range_header)
        if match:
            start = int(match.group(1))
            end   = int(match.group(2)) if match.group(2) else file_size - 1
            end   = min(end, file_size - 1)
            length = end - start + 1

            def range_iter(p, offset, remaining, chunk=CHUNK):
                with open(p, "rb") as f:
                    f.seek(offset)
                    while remaining > 0:
                        data = f.read(min(chunk, remaining))
                        if not data:
                            break
                        remaining -= len(data)
                        yield data

            resp = StreamingHttpResponse(range_iter(path, start, length), status=206, content_type=content_type)
            resp["Content-Range"]  = f"bytes {start}-{end}/{file_size}"
            resp["Accept-Ranges"]  = "bytes"
            resp["Content-Length"] = str(length)
            return resp

    def full_iter(p, chunk=CHUNK):
        with open(p, "rb") as f:
            while True:
                data = f.read(chunk)
                if not data:
                    break
                yield data

    resp = StreamingHttpResponse(full_iter(path), status=200, content_type=content_type)
    resp["Accept-Ranges"]  = "bytes"
    resp["Content-Length"] = str(file_size)
    return resp


def stream_video(request):
    return _serve_video(request, _VIDEOS["bg"])


def stream_video2(request):
    return _serve_video(request, _VIDEOS["video2"])


def stream_node_class(request):
    return _serve_video(request, _VIDEOS["node_class"])


# ─── Node Class lesson ──────────────────────────────────────────────────────

def node_class(request):
    authenticated = "usuario_id" in request.session
    already_completed = False
    if authenticated:
        try:
            u = Usuario.objects.get(pk=request.session["usuario_id"])
            already_completed = u.node_class_completada
        except Usuario.DoesNotExist:
            pass
    return render(request, "home/node_class.html", {
        "authenticated":    authenticated,
        "already_completed": already_completed,
    })


@require_POST
def api_completar_node_class(request):
    """El frontend llama esto cuando el usuario termina el video de Node Class."""
    if "usuario_id" not in request.session:
        return JsonResponse({"error": "not authenticated"}, status=401)
    try:
        u = Usuario.objects.get(pk=request.session["usuario_id"])
        u.completar_node_class()
        return JsonResponse({
            "ok":                   True,
            "node_class_completada": u.node_class_completada,
            "xp":                   u.xp,
        })
    except Usuario.DoesNotExist:
        return JsonResponse({"error": "user not found"}, status=404)
