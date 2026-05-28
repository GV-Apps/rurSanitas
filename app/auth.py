"""
auth.py — Dependencias de autenticación para FastAPI.

Uso en rutas:
    from app.auth import require_login, require_admin

    @router.get("/mi-ruta")
    def mi_ruta(sess = Depends(require_login)):
        return {"usuario": sess["usuario"]}
"""
from fastapi import Depends, HTTPException, Request


def require_login(request: Request) -> dict:
    """Verifica que haya una sesión activa. Retorna el dict de sesión."""
    if "usuario" not in request.session:
        raise HTTPException(status_code=401, detail="No autenticado")
    return dict(request.session)


def require_admin(sess: dict = Depends(require_login)) -> dict:
    """Verifica que el usuario sea administrador."""
    if not sess.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo administradores.")
    return sess
