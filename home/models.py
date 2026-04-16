import hashlib
from django.db import models


class Usuario(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    contrasena_hash = models.CharField(max_length=64)  # SHA-256 hex = 64 chars
    # Aquí irá el progreso más adelante
    creado_en = models.DateTimeField(auto_now_add=True)

    def set_password(self, raw_password):
        self.contrasena_hash = hashlib.sha256(raw_password.encode()).hexdigest()

    def check_password(self, raw_password):
        return self.contrasena_hash == hashlib.sha256(raw_password.encode()).hexdigest()

    def __str__(self):
        return self.nombre
