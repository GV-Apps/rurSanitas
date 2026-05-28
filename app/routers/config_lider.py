"""routers/config_lider.py — Configuración del umbral LIDER→CONTRALOR.

Permite al Administrador definir:
- Un campo de tipo Moneda cuyo valor se compara contra un umbral.
- El umbral numérico.

Cuando BY = "ENVIADA A CONTROLAR MEDICO NACIONAL" Y el valor del campo ≤ umbral,
el LIDER puede ver y editar los campos de CONTRALOR del registro.
"""
from fastapi import APIRouter, Body, Depends, HTTPException

from app.auth import require_admin, require_login
from app.database import get_db

router = APIRouter()


@router.get("/api/config-umbral-lider")
def get_config_umbral_lider(db=Depends(get_db), sess: dict = Depends(require_login)):
    """Retorna la configuración activa del umbral LIDER→CONTRALOR.
    Accesible para todos los usuarios autenticados (el FE la necesita para
    evaluar la condición en tiempo real al abrir un registro).
    """
    row = db.execute(
        "SELECT campo_codigo, umbral, activo"
        " FROM config_umbral_lider_contralor WHERE activo = 1 LIMIT 1"
    ).fetchone()
    if not row:
        return {"campo_codigo": None, "umbral": None, "activo": False}
    return {
        "campo_codigo": row["campo_codigo"],
        "umbral":       row["umbral"],
        "activo":       bool(row["activo"]),
    }


@router.get("/api/admin/config-umbral-lider/campos-moneda")
def get_campos_moneda(db=Depends(get_db), sess: dict = Depends(require_admin)):
    """Retorna todos los campos de tipo Moneda disponibles para usar en el dropdown."""
    rows = db.execute(
        "SELECT codigo, nombre FROM campos WHERE tipo_dato = 'Moneda' ORDER BY orden"
    ).fetchall()
    return [{"codigo": r["codigo"], "nombre": r["nombre"]} for r in rows]


@router.put("/api/admin/config-umbral-lider")
def put_config_umbral_lider(
    body: dict = Body(...),
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    """Guarda (upsert) la configuración del umbral LIDER→CONTRALOR.
    Para desactivar la configuración, pasar campo_codigo vacío o activo=false.
    """
    campo_codigo = (body.get("campo_codigo") or "").strip().upper()
    umbral_raw   = body.get("umbral")
    activo       = int(bool(body.get("activo", True)))

    # Si se desactiva o no hay campo: borrar configuración
    if not campo_codigo or not activo:
        db.execute("DELETE FROM config_umbral_lider_contralor")
        db.commit()
        return {"ok": True, "activo": False, "message": "Configuración desactivada."}

    # Validar que el campo existe y es de tipo Moneda
    campo_row = db.execute(
        "SELECT tipo_dato FROM campos WHERE codigo = ?", (campo_codigo,)
    ).fetchone()
    if not campo_row:
        raise HTTPException(status_code=400, detail=f"Campo '{campo_codigo}' no existe.")
    if campo_row["tipo_dato"] != "Moneda":
        raise HTTPException(
            status_code=400,
            detail=f"El campo '{campo_codigo}' no es de tipo Moneda. "
                   "Solo se pueden usar campos de tipo Moneda para el umbral.",
        )

    try:
        umbral = float(umbral_raw) if umbral_raw is not None else 0.0
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="El umbral debe ser un número válido.")

    if umbral < 0:
        raise HTTPException(status_code=400, detail="El umbral no puede ser negativo.")

    # Upsert: siempre una sola fila
    existing = db.execute(
        "SELECT id FROM config_umbral_lider_contralor LIMIT 1"
    ).fetchone()
    if existing:
        db.execute(
            "UPDATE config_umbral_lider_contralor"
            " SET campo_codigo = ?, umbral = ?, activo = ? WHERE id = ?",
            (campo_codigo, umbral, activo, existing["id"]),
        )
    else:
        db.execute(
            "INSERT INTO config_umbral_lider_contralor (campo_codigo, umbral, activo)"
            " VALUES (?, ?, ?)",
            (campo_codigo, umbral, activo),
        )
    db.commit()
    return {
        "ok":          True,
        "campo_codigo": campo_codigo,
        "umbral":       umbral,
        "activo":       bool(activo),
    }
