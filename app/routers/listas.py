"""routers/listas.py — Gestión de lista_opciones para campos de tipo Lista."""
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException

from app.auth import require_admin
from app.database import get_db

router = APIRouter()


@router.get("/api/admin/listas")
def api_listas(db=Depends(get_db), sess: dict = Depends(require_admin)):
    rows = db.execute(
        """SELECT codigo_campo, nombre_campo,
                  COUNT(*) as total,
                  SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos
           FROM lista_opciones
           GROUP BY codigo_campo, nombre_campo
           ORDER BY codigo_campo"""
    ).fetchall()
    return [
        {
            "codigo":  r["codigo_campo"],
            "nombre":  r["nombre_campo"],
            "total":   r["total"],
            "activos": r["activos"],
        }
        for r in rows
    ]


@router.get("/api/admin/listas/{codigo}")
def api_lista_opciones(
    codigo: str,
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    rows = db.execute(
        "SELECT id, valor, activo, fecha_creacion FROM lista_opciones"
        " WHERE codigo_campo = ? ORDER BY valor",
        (codigo,),
    ).fetchall()
    return [
        {
            "id":             r["id"],
            "valor":          r["valor"],
            "activo":         r["activo"],
            "fecha_creacion": r["fecha_creacion"],
        }
        for r in rows
    ]


@router.post("/api/admin/listas/{codigo}/agregar")
def agregar_opcion_lista(
    codigo: str,
    body: dict = Body(...),
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    valor = (body.get("valor") or "").strip()
    if not valor:
        raise HTTPException(status_code=400, detail="El valor es requerido")

    field_info = db.execute(
        "SELECT nombre_campo FROM lista_opciones WHERE codigo_campo = ? LIMIT 1",
        (codigo,),
    ).fetchone()
    if not field_info:
        raise HTTPException(status_code=404, detail="Campo no encontrado")

    existing = db.execute(
        "SELECT id FROM lista_opciones WHERE codigo_campo = ? AND valor = ?",
        (codigo, valor),
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="El valor ya existe en esta lista")

    db.execute(
        "INSERT INTO lista_opciones (codigo_campo, nombre_campo, valor, activo, fecha_creacion)"
        " VALUES (?, ?, ?, 1, ?)",
        (codigo, field_info["nombre_campo"], valor, datetime.now().isoformat()),
    )
    db.commit()
    return {"mensaje": f"Opcion '{valor}' agregada exitosamente"}


@router.delete("/api/admin/listas/opcion/{opcion_id}")
def eliminar_opcion_lista(
    opcion_id: int,
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    row = db.execute(
        "SELECT id, valor FROM lista_opciones WHERE id = ?", (opcion_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Opcion no encontrada")
    db.execute("DELETE FROM lista_opciones WHERE id = ?", (opcion_id,))
    db.commit()
    return {"mensaje": f"Opcion '{row['valor']}' eliminada"}


@router.put("/api/admin/listas/opcion/{opcion_id}/toggle")
def toggle_opcion_lista(
    opcion_id: int,
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    row = db.execute(
        "SELECT id, activo FROM lista_opciones WHERE id = ?", (opcion_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Opcion no encontrada")
    new_state = 0 if row["activo"] else 1
    db.execute("UPDATE lista_opciones SET activo = ? WHERE id = ?", (new_state, opcion_id))
    db.commit()
    return {"mensaje": "Estado actualizado", "activo": new_state}
