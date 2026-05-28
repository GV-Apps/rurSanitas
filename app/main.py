"""main.py — Punto de entrada FastAPI para la Automatización RUR."""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from app.config import DEBUG, SECRET_KEY

# Prefijo de subpath cuando la app se sirve bajo un directorio (p.ej. /rur).
# Vacío cuando la app ocupa la raíz del dominio.
# Configurar mediante variable de entorno ROOT_PATH=/rur en .env.prod
ROOT_PATH: str = os.environ.get("ROOT_PATH", "").rstrip("/")
from app.core.fields import _refresh_globals
from app.core.helpers import init_db

# ── Routers ────────────────────────────────────────────────────────────────
from app.routers import (
    audit,
    auditoria,
    auth_routes,
    campos,
    campos_admin,
    ciudad_codigos,
    config_lider,
    export,
    festivos,
    listas,
    notificaciones,
    prestadores,
    registros,
    usuarios,
)


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa la base de datos y carga los campos al arrancar."""
    init_db()
    _refresh_globals()
    yield
    # (cleanup goes here if needed)


# ── App instance ──────────────────────────────────────────────────────────
app = FastAPI(
    title="Automatización RUR — Sanitas",
    version="2.0.0",
    docs_url="/docs" if DEBUG else None,
    redoc_url=None,
    lifespan=lifespan,
)

# ── Session middleware (must be added before mounting static / routes) ─────
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    https_only=not DEBUG,
    max_age=28800,
    same_site="lax",   # "strict" bloquea cookies en redirects OAuth cross-site
)

# ── Static files & templates ──────────────────────────────────────────────
_BASE_DIR = os.path.dirname(__file__)
app.mount(
    "/static",
    StaticFiles(directory=os.path.join(_BASE_DIR, "static")),
    name="static",
)
templates = Jinja2Templates(directory=os.path.join(_BASE_DIR, "templates"))


# ── Include routers ───────────────────────────────────────────────────────
# Order matters for overlapping prefixes: static paths first.
app.include_router(auth_routes.router)
app.include_router(auditoria.router)      # /api/auditoria/activas before /api/auditoria/{id}
app.include_router(campos.router)
app.include_router(config_lider.router)   # /api/config-umbral-lider (static before /{id})
app.include_router(campos_admin.router)   # /api/admin/campos/reorder before /{cid}
app.include_router(export.router)         # /api/registros/exportar/{rol}
app.include_router(registros.router)      # /api/registros/lista  before  /api/registros/{rol}
app.include_router(prestadores.router)
app.include_router(usuarios.router)
app.include_router(audit.router)
app.include_router(notificaciones.router)
app.include_router(festivos.router)
app.include_router(ciudad_codigos.router) # /api/ciudad-codigos/por-ciudad before /{cid}
app.include_router(listas.router)


# ── Health check (Kubernetes liveness / readiness probes) ────────────────
@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}


# ── Frontend catch-all ────────────────────────────────────────────────────
@app.get("/{full_path:path}", response_class=HTMLResponse, include_in_schema=False)
async def serve_spa(request: Request, full_path: str):
    """Serve the single-page application for all non-API routes."""
    return templates.TemplateResponse(request, "index.html", {"root_path": ROOT_PATH})
