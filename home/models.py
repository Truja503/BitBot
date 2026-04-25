import hashlib
from django.db import models
from django.utils import timezone


class Usuario(models.Model):
    nombre                  = models.CharField(max_length=100, unique=True)
    contrasena_hash         = models.CharField(max_length=64)
    corazones               = models.IntegerField(default=5)
    corazones_vaciados_en   = models.DateTimeField(null=True, blank=True)   # cuando llegaron a 0
    es_premium              = models.BooleanField(default=False)
    practica_3d_completada  = models.BooleanField(default=False)
    node_class_completada   = models.BooleanField(default=False)
    xp                      = models.IntegerField(default=0)
    creado_en               = models.DateTimeField(auto_now_add=True)

    MAX_CORAZONES   = 5
    REFILL_HORAS    = 24          # horas de espera para refill gratuito
    XP_PRACTICA_3D  = 200
    XP_NODE_CLASS   = 50

    # ── helpers ──────────────────────────────────────────────────────

    def set_password(self, raw_password):
        self.contrasena_hash = hashlib.sha256(raw_password.encode()).hexdigest()

    def check_password(self, raw_password):
        return self.contrasena_hash == hashlib.sha256(raw_password.encode()).hexdigest()

    # ── lógica de corazones ───────────────────────────────────────────

    def _refill_si_corresponde(self):
        """Si han pasado ≥24 h desde que se vaciaron, restaura todos los corazones."""
        if self.corazones == 0 and self.corazones_vaciados_en:
            delta = timezone.now() - self.corazones_vaciados_en
            if delta.total_seconds() >= self.REFILL_HORAS * 3600:
                self.corazones = self.MAX_CORAZONES
                self.corazones_vaciados_en = None
                self.save(update_fields=['corazones', 'corazones_vaciados_en'])

    def segundos_para_refill(self):
        """Segundos que faltan para el refill automático (0 si ya toca o tiene vidas)."""
        self._refill_si_corresponde()
        if self.corazones > 0 or not self.corazones_vaciados_en:
            return 0
        delta = timezone.now() - self.corazones_vaciados_en
        restante = self.REFILL_HORAS * 3600 - delta.total_seconds()
        return max(0, int(restante))

    def perder_corazon(self):
        """Descuenta un corazón. Devuelve True si el jugador sigue vivo."""
        self._refill_si_corresponde()
        if self.corazones > 0:
            self.corazones -= 1
            campos = ['corazones']
            if self.corazones == 0:
                self.corazones_vaciados_en = timezone.now()
                campos.append('corazones_vaciados_en')
            self.save(update_fields=campos)
        return self.corazones > 0

    def recuperar_corazon(self):
        self._refill_si_corresponde()
        if self.corazones < self.MAX_CORAZONES:
            self.corazones += 1
            self.save(update_fields=['corazones'])

    def activar_premium(self):
        """Activa premium: restaura corazones y limpia el timer."""
        self.es_premium = True
        self.corazones = self.MAX_CORAZONES
        self.corazones_vaciados_en = None
        self.save(update_fields=['es_premium', 'corazones', 'corazones_vaciados_en'])

    def completar_practica_3d(self):
        if not self.practica_3d_completada:
            self.practica_3d_completada = True
            self.xp += self.XP_PRACTICA_3D
            self.save(update_fields=['practica_3d_completada', 'xp'])

    def completar_node_class(self):
        if not self.node_class_completada:
            self.node_class_completada = True
            self.xp += self.XP_NODE_CLASS
            self.save(update_fields=['node_class_completada', 'xp'])

    # ── progreso calculado ────────────────────────────────────────────

    @property
    def lecciones_completadas(self):
        return 6 if self.practica_3d_completada else 0

    @property
    def practicas_completadas(self):
        return 1 if self.practica_3d_completada else 0

    def __str__(self):
        return self.nombre
