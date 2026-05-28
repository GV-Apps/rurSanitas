"""routers/auditoria.py — Auditoría de registros (ADMIN genera, destinatario responde)."""
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException

from app.auth import require_admin, require_login
from app.core.fields import _col
from app.core.helpers import crear_notificacion, get_visibility_filter
from app.database import get_db

router = APIRouter()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_auditoria_or_404(aud_id: int, db):
    row = db.execute(
        "SELECT * FROM auditoria_registros WHERE id = ?", (aud_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada.")
    return row


def _consecutivo(reg_row) -> str:
    try:
        val = reg_row[_col("A")]
        return val if val else f"ID {reg_row['id']}"
    except (IndexError, KeyError):
        return f"ID {reg_row['id']}"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/api/auditoria/registro/{registro_id}")
def crear_auditoria(
    registro_id: int,
    body: dict = Body(...),
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    """ADMIN crea una auditoría en un registro. Solo puede existir una activa a la vez."""
    comentario = (body.get("comentario") or "").strip()
    if not comentario:
        raise HTTPException(status_code=400, detail="El comentario es requerido.")

    reg_row = db.execute("SELECT * FROM registros WHERE id = ?", (registro_id,)).fetchone()
    if not reg_row:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")

    # Verificar que no haya auditoría activa o en proceso
    activa = db.execute(
        "SELECT id FROM auditoria_registros WHERE registro_id = ? AND estado IN ('activa','en_proceso')",
        (registro_id,),
    ).fetchone()
    if activa:
        raise HTTPException(
            status_code=409,
            detail="Ya existe una auditoría activa en este registro. Debe cerrarse antes de crear una nueva.",
        )

    # Obtener usuario destinatario (AG = nombre_completo del responsable)
    try:
        ag_nombre = (reg_row[_col("AG")] or "").strip()
    except (IndexError, KeyError):
        ag_nombre = ""

    if not ag_nombre:
        raise HTTPException(
            status_code=400,
            detail="Este registro no tiene responsable asignado (campo AG). Asigne uno antes de crear una auditoría.",
        )

    dest_row = db.execute(
        "SELECT usuario FROM usuarios WHERE nombre_completo = ? AND activo = 1",
        (ag_nombre,),
    ).fetchone()
    if not dest_row:
        raise HTTPException(
            status_code=400,
            detail=f"No se encontró el usuario con nombre '{ag_nombre}'. Verifique el campo AG del registro.",
        )

    destinatario_usuario = dest_row["usuario"]
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    consecutivo = _consecutivo(reg_row)

    db.execute(
        """INSERT INTO auditoria_registros
           (registro_id, comentario_admin, estado, admin_usuario, destinatario_usuario, fecha_creacion)
           VALUES (?, ?, 'activa', ?, ?, ?)""",
        (registro_id, comentario, sess["usuario"], destinatario_usuario, fecha),
    )
    db.commit()

    crear_notificacion(
        db=db,
        usuario_destino=destinatario_usuario,
        tipo="auditoria_nueva",
        mensaje=f"Nueva auditoría en el registro {consecutivo}: {comentario}",
        registro_id=registro_id,
    )

    return {"ok": True, "mensaje": "Auditoría creada correctamente."}


@router.get("/api/auditoria/mis-pendientes")
def mis_auditorias_pendientes(
    db=Depends(get_db),
    sess: dict = Depends(require_login),
):
    """Auditorías activas o en proceso donde el usuario en sesión es el destinatario."""
    usuario = sess["usuario"]
    rows = db.execute(
        """SELECT a.id, a.registro_id, a.comentario_admin, a.estado,
                  a.admin_usuario, a.fecha_creacion,
                  u1.nombre_completo AS nombre_admin
           FROM auditoria_registros a
           LEFT JOIN usuarios u1 ON a.admin_usuario = u1.usuario
           WHERE a.destinatario_usuario = ? AND a.estado IN ('activa','en_proceso')
           ORDER BY a.fecha_creacion DESC""",
        (usuario,),
    ).fetchall()

    result = []
    for row in rows:
        d = dict(row)
        try:
            reg = db.execute(
                "SELECT * FROM registros WHERE id = ?", (row["registro_id"],)
            ).fetchone()
            if reg:
                d["consecutivo"]     = reg[_col("A")]
                d["nombre_prestador"] = reg[_col("I")]
            else:
                d["consecutivo"]     = None
                d["nombre_prestador"] = None
        except Exception:
            d["consecutivo"]     = None
            d["nombre_prestador"] = None
        result.append(d)

    return result


@router.get("/api/auditoria/activas")
def get_auditorias_activas(
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    """ADMIN: lista de registros con auditorías activas o en proceso."""
    rows = db.execute(
        """SELECT a.id AS auditoria_id, a.registro_id, a.comentario_admin,
                  a.estado, a.admin_usuario, a.destinatario_usuario,
                  a.comentario_respuesta, a.fecha_creacion, a.fecha_respuesta,
                  u2.nombre_completo AS nombre_destinatario
           FROM auditoria_registros a
           LEFT JOIN usuarios u2 ON a.destinatario_usuario = u2.usuario
           WHERE a.estado IN ('activa','en_proceso')
           ORDER BY a.fecha_creacion DESC"""
    ).fetchall()

    result = []
    for row in rows:
        d = dict(row)
        reg = db.execute("SELECT * FROM registros WHERE id = ?", (row["registro_id"],)).fetchone()
        if reg:
            try:
                d["consecutivo"] = reg[_col("A")]
                d["compania"]    = reg[_col("D")]
                d["ciudad_resp"] = reg[_col("C")]
            except Exception:
                d["consecutivo"] = None
                d["compania"]    = None
                d["ciudad_resp"] = None
        else:
            d["consecutivo"] = None
            d["compania"]    = None
            d["ciudad_resp"] = None
        result.append(d)

    return result


@router.get("/api/auditoria/registro/{registro_id}")
def get_auditoria_historial(
    registro_id: int,
    db=Depends(get_db),
    sess: dict = Depends(require_login),
):
    """Historial de auditorías de un registro. Solo visible si el usuario tiene acceso al registro."""
    # Verificar visibilidad del registro
    where, params = get_visibility_filter(db, sess)
    if where is not None:
        row = db.execute(
            f"SELECT id FROM registros WHERE id = ? AND ({where})",
            (registro_id, *params),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=403, detail="No tiene acceso a este registro.")

    rows = db.execute(
        """SELECT a.id, a.registro_id, a.comentario_admin, a.estado,
                  a.admin_usuario, a.destinatario_usuario,
                  a.comentario_respuesta, a.fecha_creacion, a.fecha_respuesta,
                  u1.nombre_completo AS nombre_admin,
                  u2.nombre_completo AS nombre_destinatario
           FROM auditoria_registros a
           LEFT JOIN usuarios u1 ON a.admin_usuario    = u1.usuario
           LEFT JOIN usuarios u2 ON a.destinatario_usuario = u2.usuario
           WHERE a.registro_id = ?
           ORDER BY a.fecha_creacion DESC""",
        (registro_id,),
    ).fetchall()

    return [dict(r) for r in rows]


@router.put("/api/auditoria/{aud_id}/responder")
def responder_auditoria(
    aud_id: int,
    body: dict = Body(...),
    db=Depends(get_db),
    sess: dict = Depends(require_login),
):
    """El destinatario responde a la auditoría: en_proceso o terminada."""
    estado    = (body.get("estado") or "").strip()
    comentario = (body.get("comentario") or "").strip()

    if estado not in ("en_proceso", "terminada"):
        raise HTTPException(status_code=400, detail="Estado inválido. Use 'en_proceso' o 'terminada'.")

    aud = _get_auditoria_or_404(aud_id, db)

    if aud["estado"] == "terminada":
        raise HTTPException(status_code=409, detail="Esta auditoría ya está terminada.")

    if aud["destinatario_usuario"] != sess["usuario"]:
        raise HTTPException(status_code=403, detail="Solo el destinatario puede responder esta auditoría.")

    fecha_resp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.execute(
        """UPDATE auditoria_registros
           SET estado = ?, comentario_respuesta = ?, fecha_respuesta = ?
           WHERE id = ?""",
        (estado, comentario if comentario else None, fecha_resp, aud_id),
    )
    db.commit()

    # Notificar al ADMIN cuando se marca como terminada
    if estado == "terminada":
        reg_row = db.execute("SELECT * FROM registros WHERE id = ?", (aud["registro_id"],)).fetchone()
        consecutivo = _consecutivo(reg_row) if reg_row else f"ID {aud['registro_id']}"
        resp_txt = f": {comentario}" if comentario else "."
        crear_notificacion(
            db=db,
            usuario_destino=aud["admin_usuario"],
            tipo="auditoria_terminada",
            mensaje=f"Auditoría del registro {consecutivo} marcada como Terminada{resp_txt}",
            registro_id=aud["registro_id"],
        )

    return {"ok": True, "estado": estado}
