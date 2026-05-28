"""routers/auth_routes.py — Login, logout, check_session y Microsoft EntraID SSO."""
import logging
import os
import time
import urllib.parse
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse

from app.auth import require_admin
from app.core.helpers import hash_password, verify_password
from app.database import get_db

router = APIRouter()

logger = logging.getLogger("rur.security")

_ROLE_PRIORITY        = ["CONTRALOR", "LIDER", "GESTOR 2", "GESTOR 1"]
_MAX_FAILED_ATTEMPTS  = 5
_LOCKOUT_WINDOW_SEC   = 300  # 5 minutos

# ── Microsoft EntraID / OAuth ──────────────────────────────────────────────
_AZURE_CLIENT_ID     = os.environ.get("AZURE_CLIENT_ID", "")
_AZURE_CLIENT_SECRET = os.environ.get("AZURE_CLIENT_SECRET", "")
_AZURE_TENANT_ID     = os.environ.get("AZURE_TENANT_ID", "common")
_AZURE_REDIRECT_URI  = os.environ.get(
    "AZURE_REDIRECT_URI", "http://localhost:8000/api/auth/microsoft/callback"
)

_MS_CONFIGURED = bool(_AZURE_CLIENT_ID and _AZURE_CLIENT_SECRET)

try:
    from authlib.integrations.starlette_client import OAuth as _OAuth
    _oauth = _OAuth()
    if _MS_CONFIGURED:
        _oauth.register(
            name="microsoft",
            client_id=_AZURE_CLIENT_ID,
            client_secret=_AZURE_CLIENT_SECRET,
            server_metadata_url=(
                f"https://login.microsoftonline.com/{_AZURE_TENANT_ID}"
                "/v2.0/.well-known/openid-configuration"
            ),
            client_kwargs={"scope": "openid email profile"},
        )
    _AUTHLIB_OK = True
except ImportError:
    _oauth = None
    _AUTHLIB_OK = False
    logger.warning("authlib no instalado — Microsoft EntraID SSO deshabilitado")


def _build_session(request: Request, user) -> dict:
    """Construye y guarda la sesión a partir de una fila de usuario."""
    permisos: list[str] = []
    if user["perm_gestor_1"]:  permisos.append("GESTOR 1")
    if user["perm_gestor_2"]:  permisos.append("GESTOR 2")
    if user["perm_lider"]:     permisos.append("LIDER")
    try:
        if user["perm_coordinador"]: permisos.append("COORDINADOR")
    except (KeyError, IndexError):
        pass
    if user["perm_contralor"]: permisos.append("CONTRALOR")

    primary_role = "GESTOR 1"
    for r in _ROLE_PRIORITY:
        if r in permisos:
            primary_role = r
            break
    if user["is_admin"]:
        primary_role = "ADMIN"
        permisos = ["ADMIN"]

    request.session["usuario"]  = user["usuario"]
    request.session["nombre"]   = user["nombre_completo"]
    request.session["rol"]      = primary_role
    request.session["permisos"] = permisos
    request.session["is_admin"] = bool(user["is_admin"])
    request.session["regional"] = user["regional"]
    return {
        "usuario":  user["usuario"],
        "nombre":   user["nombre_completo"],
        "rol":      primary_role,
        "permisos": permisos,
        "is_admin": bool(user["is_admin"]),
        "regional": user["regional"],
    }


# ── Login con usuario y contraseña ────────────────────────────────────────
@router.post("/api/login")
def login(request: Request, body: dict = Body(...), db=Depends(get_db)):
    usuario  = (body.get("usuario") or "").strip()
    password = body.get("password") or ""

    if not usuario or not password:
        raise HTTPException(status_code=400, detail="Usuario y contraseña son requeridos")

    # Lockout: verificar intentos fallidos recientes por usuario
    _cutoff = time.time() - _LOCKOUT_WINDOW_SEC
    _recent_failures = db.execute(
        "SELECT COUNT(*) FROM login_attempts WHERE usuario = ? AND timestamp > ?",
        (usuario, _cutoff),
    ).fetchone()[0]
    if _recent_failures >= _MAX_FAILED_ATTEMPTS:
        logger.warning("LOCKOUT | usuario=%s | ip=%s", usuario, request.client.host)
        raise HTTPException(
            status_code=429,
            detail="Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intente en 5 minutos.",
        )

    user = db.execute(
        "SELECT * FROM usuarios WHERE usuario = ? AND activo = 1", (usuario,)
    ).fetchone()

    # Verificar que el usuario tiene habilitado el login con contraseña
    if user:
        try:
            _local_auth_ok = bool(user["local_auth_enabled"])
        except (KeyError, IndexError):
            _local_auth_ok = True  # fallback: columna aún no migrada
        if not _local_auth_ok:
            logger.warning("LOCAL_AUTH_DISABLED | usuario=%s | ip=%s", usuario, request.client.host)
            raise HTTPException(
                status_code=403,
                detail="Este usuario debe autenticarse con Microsoft EntraID.",
            )

    if not user or not verify_password(password, user["password_hash"]):
        db.execute(
            "INSERT INTO login_attempts (usuario, ip, timestamp) VALUES (?, ?, ?)",
            (usuario, request.client.host, time.time()),
        )
        db.commit()
        logger.warning("LOGIN_FAILED | usuario=%s | ip=%s", usuario, request.client.host)
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    # Login exitoso: limpiar historial de intentos fallidos
    db.execute("DELETE FROM login_attempts WHERE usuario = ?", (usuario,))
    db.commit()

    # Migración lazy SHA-256 → bcrypt
    _stored_hash = user["password_hash"]
    if not (_stored_hash.startswith("$2b$") or _stored_hash.startswith("$2a$")):
        db.execute(
            "UPDATE usuarios SET password_hash = ? WHERE usuario = ?",
            (hash_password(password), usuario),
        )
        db.commit()
        logger.info("HASH_MIGRATED | usuario=%s", usuario)

    return _build_session(request, user)


# ── Logout ────────────────────────────────────────────────────────────────
@router.post("/api/logout")
def logout(request: Request):
    request.session.clear()
    return {"mensaje": "Sesion cerrada"}


# ── Check session ─────────────────────────────────────────────────────────
@router.get("/api/session")
def check_session(request: Request):
    if "usuario" in request.session:
        return {
            "usuario":  request.session["usuario"],
            "nombre":   request.session["nombre"],
            "rol":      request.session["rol"],
            "permisos": request.session.get("permisos", []),
            "is_admin": request.session.get("is_admin", False),
            "regional": request.session.get("regional"),
        }
    return JSONResponse(content=None)


# ── Microsoft EntraID — config pública ───────────────────────────────────
@router.get("/api/auth/microsoft/config")
def microsoft_auth_config():
    """Informa al frontend si EntraID está disponible (credenciales configuradas)."""
    return {"microsoft_available": _MS_CONFIGURED and _AUTHLIB_OK}


# ── Microsoft EntraID — iniciar flujo OIDC ───────────────────────────────
@router.get("/api/auth/microsoft")
async def auth_microsoft_start(request: Request):
    if not _MS_CONFIGURED or not _AUTHLIB_OK:
        return RedirectResponse("/?ms_error=not_configured")
    return await _oauth.microsoft.authorize_redirect(request, _AZURE_REDIRECT_URI)


# ── Microsoft EntraID — callback ─────────────────────────────────────────
@router.get("/api/auth/microsoft/callback")
async def auth_microsoft_callback(request: Request, db=Depends(get_db)):
    if not _MS_CONFIGURED or not _AUTHLIB_OK:
        return RedirectResponse("/?ms_error=not_configured")
    try:
        # claims_options: desactiva validación de "iss" para soportar tenant=common
        # y cuentas personales Microsoft (el iss varía por tenant en tokens reales)
        token = await _oauth.microsoft.authorize_access_token(
            request,
            claims_options={"iss": {"essential": False}},
        )
        userinfo = token.get("userinfo") or {}
    except Exception as exc:
        logger.warning("MS_CALLBACK_ERROR | %s", exc)
        return RedirectResponse("/?ms_error=auth_failed")

    # EntraID puede devolver el email en "email" o en "preferred_username"
    email  = (
        userinfo.get("email") or
        userinfo.get("preferred_username") or ""
    ).lower().strip()
    nombre = (
        userinfo.get("name") or
        userinfo.get("displayName") or
        email
    ).strip()

    if not email:
        return RedirectResponse("/?ms_error=no_email")

    user = db.execute(
        "SELECT * FROM usuarios WHERE LOWER(usuario) = ? AND activo = 1", (email,)
    ).fetchone()

    if not user:
        params = urllib.parse.urlencode({
            "ms_error": "not_found",
            "email":    email,
            "nombre":   nombre,
        })
        return RedirectResponse(f"/?{params}")

    logger.info("MS_LOGIN_OK | usuario=%s", email)
    _build_session(request, user)
    return RedirectResponse("/?ms_login=ok")


# ── Microsoft EntraID — solicitar acceso ─────────────────────────────────
@router.post("/api/auth/microsoft/request-access")
async def microsoft_request_access(request: Request, db=Depends(get_db)):
    data       = await request.json()
    email      = (data.get("email") or "").strip()
    nombre     = (data.get("nombre") or "").strip()
    comentario = (data.get("comentario") or "").strip()

    if not email:
        return JSONResponse({"error": "Email requerido"}, status_code=400)

    existing = db.execute(
        "SELECT id FROM sso_access_requests WHERE email = ? AND estado = 'pendiente'",
        (email,),
    ).fetchone()
    if existing:
        return JSONResponse({"mensaje": "Ya existe una solicitud pendiente para este correo."})

    db.execute(
        "INSERT INTO sso_access_requests (email, nombre, comentario, estado, fecha)"
        " VALUES (?, ?, ?, 'pendiente', ?)",
        (email, nombre, comentario, datetime.now().isoformat()),
    )
    db.commit()
    return JSONResponse({"mensaje": "Solicitud enviada al administrador."}, status_code=201)


# ── Admin — listar solicitudes de acceso SSO ─────────────────────────────
@router.get("/api/admin/sso-access-requests")
def list_sso_access_requests(
    request: Request,
    estado: str = "",
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    if estado:
        rows = db.execute(
            "SELECT * FROM sso_access_requests WHERE estado = ? ORDER BY fecha DESC",
            (estado,),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM sso_access_requests ORDER BY fecha DESC"
        ).fetchall()
    return [dict(r) for r in rows]


# ── Admin — marcar solicitud como vista ──────────────────────────────────
@router.put("/api/admin/sso-access-requests/{req_id}/vista")
def mark_sso_request_vista(
    req_id: int,
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    db.execute(
        "UPDATE sso_access_requests SET estado = 'visto' WHERE id = ?", (req_id,)
    )
    db.commit()
    return {"ok": True}


# ── Admin — eliminar solicitud ────────────────────────────────────────────
@router.delete("/api/admin/sso-access-requests/{req_id}")
def delete_sso_request(
    req_id: int,
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    db.execute("DELETE FROM sso_access_requests WHERE id = ?", (req_id,))
    db.commit()
    return {"ok": True}
