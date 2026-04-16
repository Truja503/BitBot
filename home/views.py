import os
import re
from django.shortcuts import render, redirect
from django.http import StreamingHttpResponse, HttpResponse
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
            error = "Nombre y contraseña son obligatorios."
        elif Usuario.objects.filter(nombre=nombre).exists():
            error = "Ese nombre ya está en uso. Elige otro."
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
                error = "Contraseña incorrecta."
        except Usuario.DoesNotExist:
            error = "Usuario no encontrado."
    return render(request, "home/login.html", {"error": error})


def logout_view(request):
    request.session.flush()
    return redirect("login")


def dashboard(request):
    if "usuario_id" not in request.session:
        return redirect("login")
    return render(request, "home/dashboard.html", {
        "nombre": request.session.get("usuario_nombre", "Satoshi"),
    })


# ─── Range-aware video streaming ────────────────────────────────────────────
# Django's dev server doesn't support HTTP Range requests, which browsers
# need for seek/scrub.  This generic helper handles both full and range GETs.

CHUNK = 1024 * 512  # 512 KB

VIDEO_DIR = os.path.join(os.path.dirname(__file__), "static", "home", "video")

_VIDEOS = {
    "bg":    "Bg-video-scrub.mp4",
    "video2": "Video2-scrub.mp4",
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
