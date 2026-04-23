"""
Django settings for core project.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Security ──────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-73abcist8rgil!%*%dm)-*v8b1e&=1ij^_$afn6$3!qai925)k'
)

DEBUG = os.environ.get('DJANGO_DEBUG', 'True') != '0'

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'bit-bot-eta.vercel.app',
    '.vercel.app',
    '.railway.app',
    '.up.railway.app',
]

USE_X_FORWARDED_HOST = True

CSRF_TRUSTED_ORIGINS = [
    'https://bit-bot-eta.vercel.app',
    'https://*.vercel.app',
    'https://*.railway.app',
    'https://*.up.railway.app',
]

# ── Apps ──────────────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'home',
]

# ── Middleware — WhiteNoise MUST be second (right after SecurityMiddleware) ───
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',   # serves static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ── Database ──────────────────────────────────────────────────────────────────
# Vercel: /var/task is read-only → use /tmp
# Railway / local: use BASE_DIR/db.sqlite3 normally
_IS_VERCEL = os.environ.get('VERCEL', '') == '1'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': Path('/tmp/db.sqlite3') if _IS_VERCEL else BASE_DIR / 'db.sqlite3',
    }
}

# Railway injects PORT env var — also add to ALLOWED_HOSTS dynamically
_RAILWAY_HOST = os.environ.get('RAILWAY_PUBLIC_DOMAIN', '')
if _RAILWAY_HOST:
    ALLOWED_HOSTS.append(_RAILWAY_HOST)

# ── Auth ──────────────────────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── i18n ──────────────────────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ── Static files ──────────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# WhiteNoise: compress and cache static files efficiently
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
