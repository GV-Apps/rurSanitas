"""routers/notificaciones.py — Notificaciones de usuario."""
from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import require_login
from app.database import get_db

router = APIRouter()


@router.get("/api/notificaciones")
def listar_notificaciones(db=Depends(get_db), sess: dict = Depends(require_login)):
    rows = db.execute(
        "SELECT id, tipo, mensaje, registro_id, leida, fecha_creacion"
        " FROM notificaciones WHERE usuario_destino = ? AND leida = 0"
        " ORDER BY fecha_creacion DESC LIMIT 50",
        (sess["usuario"],),
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/api/notificaciones/historial")
def historial_notificaciones(
    filtro: str = Query("todas"),
    db=Depends(get_db),
    sess: dict = Depends(require_login),
):
    base   = ("SELECT id, tipo, mensaje, registro_id, leida, fecha_creacion"
              " FROM notificaciones WHERE usuario_destino = ?")
    params = [sess["usuario"]]
    if filtro == "leidas":
        base += " AND leida = 1"
    elif filtro == "no_leidas":
        base += " AND leida = 0"
    base += " ORDER BY fecha_creacion DESC"
    rows = db.execute(base, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/api/notificaciones/no-leidas")
def count_no_leidas(db=Depends(get_db), sess: dict = Depends(require_login)):
    count = db.execute(
        "SELECT COUNT(*) FROM notificaciones WHERE usuario_destino = ? AND leida = 0",
        (sess["usuario"],),
    ).fetchone()[0]
    return {"count": count}


@router.put("/api/notificaciones/leer-todas")
def marcar_todas_leidas(db=Depends(get_db), sess: dict = Depends(require_login)):
    db.execute(
        "UPDATE notificaciones SET leida = 1 WHERE usuario_destino = ?",
        (sess["usuario"],),
    )
    db.commit()
    return {"ok": True}


@router.put("/api/notificaciones/{nid}/leer")
def marcar_leida(nid: int, db=Depends(get_db), sess: dict = Depends(require_login)):
    db.execute(
        "UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_destino = ?",
        (nid, sess["usuario"]),
    )
    db.commit()
    return {"ok": True}


@router.delete("/api/notificaciones/{nid}")
def eliminar_notificacion(nid: int, db=Depends(get_db), sess: dict = Depends(require_login)):
    db.execute(
        "DELETE FROM notificaciones WHERE id = ? AND usuario_destino = ?",
        (nid, sess["usuario"]),
    )
    db.commit()
    return {"ok": True}
