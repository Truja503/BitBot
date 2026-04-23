"""
WSGI config for core project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Run migrations automatically on cold start (Vercel serverless)
# This is safe because SQLite migrations are idempotent.
try:
    from django.core.management import call_command
    call_command('migrate', '--run-syncdb', verbosity=0)
except Exception:
    pass  # Don't crash the app if migrations fail (e.g. already applied)

application = get_wsgi_application()
