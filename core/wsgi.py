"""
WSGI config for core project.
"""

import os
import shutil
from pathlib import Path
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# ── Vercel: copy pre-migrated DB to /tmp (writable) on cold start ─────────────
_IS_VERCEL = os.environ.get('VERCEL', '') == '1'
if _IS_VERCEL:
    _tmp_db = Path('/tmp/db.sqlite3')
    _src_db = Path(__file__).resolve().parent.parent / 'db.sqlite3'
    if not _tmp_db.exists() and _src_db.exists():
        shutil.copy2(_src_db, _tmp_db)

# ── Auto-migrate on startup (Railway + Vercel) ────────────────────────────────
try:
    from django.core.management import call_command
    call_command('migrate', '--run-syncdb', verbosity=0)
except Exception:
    pass

application = get_wsgi_application()
