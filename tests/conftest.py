"""
conftest.py — Configuración global de la suite de tests.

IMPORTANTE: Las variables de entorno se establecen ANTES de importar cualquier
módulo de la app, para que app/config.py las lea con los valores de test.
"""
import os
import tempfile

# ── Env vars de test — DEBEN ir antes de cualquier import de la app ──────────
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_TMP_DB_PATH = _tmp_db.name
_tmp_db.close()

os.environ.update(
    {
        "DATABASE_URL": "",                            # Forzar modo SQLite
        "SECRET_KEY": "test-secret-key-rur-32chars!!", # Mínimo 32 chars
        "DEBUG": "true",
        "ADMIN_INITIAL_PASSWORD": "Admin1234Test!",
        "DEFAULT_SUPERIOR_INMEDIATO": "",
        "SMTP_HOST": "",                               # Deshabilitar email en tests
        "SMTP_USER": "",
        "APP_BASE_URL": "http://localhost:8000",
    }
)

# ── Patch rutas de BD ANTES de que los módulos las lean ──────────────────────
import app.config as _config  # noqa: E402

_config.DB_PATH = _TMP_DB_PATH

import app.database as _database  # noqa: E402

_database.DB_PATH = _TMP_DB_PATH

import app.core.helpers as _helpers  # noqa: E402

_helpers.DB_PATH = _TMP_DB_PATH

# ── Imports principales ───────────────────────────────────────────────────────
import pytest  # noqa: E402
from starlette.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    """TestClient de sesión — inicia la app una sola vez (incluye init_db)."""
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")


def _login_admin(c):
    """Inicia sesión como admin; idempotente si ya está activa."""
    resp = c.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return c


@pytest.fixture(scope="session")
def admin_client(client):
    """Client con sesión admin activa (sesión compartida)."""
    return _login_admin(client)


@pytest.fixture
def ac(client):
    """Admin client que garantiza sesión activa antes de cada test."""
    return _login_admin(client)


@pytest.fixture(scope="session", autouse=True)
def cleanup_db():
    yield
    try:
        os.unlink(_TMP_DB_PATH)
    except OSError:
        pass
