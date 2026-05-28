"""
config.py — Configuración centralizada por variables de entorno.
En desarrollo: .env.dev (SQLite)
En producción: .env.prod (PostgreSQL)
"""
import os

# ── Clave secreta para sesiones ─────────────────────────────────────────────
# En producción se sobreescribe con SECRET_KEY del .env.prod
_KEY_FILE = os.path.join(os.path.dirname(__file__), ".secret_key")
if os.path.exists(_KEY_FILE):
    with open(_KEY_FILE, "rb") as _f:
        _stored_key = _f.read().decode("latin-1")
else:
    import secrets
    _stored_key = secrets.token_hex(32)
    with open(_KEY_FILE, "w") as _f:
        _f.write(_stored_key)

SECRET_KEY: str = os.environ.get("SECRET_KEY", _stored_key)

# ── Base de datos ────────────────────────────────────────────────────────────
# Desarrollo  → SQLite  (sin DATABASE_URL)
# Producción  → postgresql://user:pass@host:5432/dbname
DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

# Ruta local SQLite (solo se usa si DATABASE_URL está vacío)
DB_PATH: str = os.path.join(os.path.dirname(__file__), "formularios.db")

# Ruta al Excel de prestadores (relativa a la raíz del repo)
PRESTADORES_PATH: str = os.path.join(
    os.path.dirname(__file__), "..", "data", "BD_PRESTADORES.xlsx"
)

# ── Entorno ──────────────────────────────────────────────────────────────────
FLASK_ENV: str = os.environ.get("FLASK_ENV", "development")
DEBUG: bool = os.environ.get("DEBUG", "false").lower() in ("true", "1", "yes")

# ── URL base de la aplicación (para links en emails) ────────────────────────
# Ejemplo: https://rur.miempresa.com  (sin barra final)
APP_BASE_URL: str = os.environ.get("APP_BASE_URL", "").rstrip("/")

# ── SMTP para envío de correos (reset de contraseña) ────────────────────────
SMTP_HOST:     str = os.environ.get("SMTP_HOST", "")
SMTP_PORT:     int = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER:     str = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD: str = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM:     str = os.environ.get("SMTP_FROM", "")

# ── Seed de base de datos ────────────────────────────────────────────────────
# Contraseña del administrador inicial. Si no se define, se genera una aleatoria
# y se imprime en el log de arranque (solo aplica en el primer despliegue).
ADMIN_INITIAL_PASSWORD: str = os.environ.get("ADMIN_INITIAL_PASSWORD", "")

# Correo por defecto del superior inmediato en carga masiva de usuarios.
# Debe definirse en el entorno; no se hardcodea en el código fuente.
# .strip() convierte el espacio usado como placeholder en GCP Secret Manager en cadena vacía.
DEFAULT_SUPERIOR_INMEDIATO: str = os.environ.get("DEFAULT_SUPERIOR_INMEDIATO", "").strip()
