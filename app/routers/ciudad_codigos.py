"""routers/ciudad_codigos.py — Gestión de prefijos de ciudad para consecutivos."""
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from app.auth import require_admin, require_login
from app.database import get_db

router = APIRouter()


@router.get("/api/ciudad-codigos/por-ciudad")
def ciudad_codigos_por_ciudad(
    ciudad: str = Query(""),
    db=Depends(get_db),
    sess: dict = Depends(require_login),
):
    """Devuelve los códigos activos para una ciudad (para el formulario)."""
    ciudad = ciudad.strip().upper()
    if not ciudad:
        return []
    rows = db.execute(
        "SELECT codigo FROM ciudad_codigos WHERE UPPER(ciudad) = ? AND activo = 1 ORDER BY codigo",
        (ciudad,),
    ).fetchall()
    return [r["codigo"] for r in rows]


@router.get("/api/ciudad-codigos")
def listar_ciudad_codigos(db=Depends(get_db), sess: dict = Depends(require_login)):
    rows = db.execute(
        "SELECT id, ciudad, codigo, activo FROM ciudad_codigos ORDER BY ciudad, codigo"
    ).fetchall()
    return [dict(r) for r in rows]


@router.post("/api/ciudad-codigos")
def crear_ciudad_codigo(
    body: dict = Body(...),
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    ciudad = (body.get("ciudad") or "").strip()
    codigo = (body.get("codigo") or "").strip().upper()
    if not ciudad or not codigo:
        raise HTTPException(status_code=400, detail="Ciudad y código son requeridos")
    db.execute(
        "INSERT INTO ciudad_codigos (ciudad, codigo, activo) VALUES (?, ?, 1)",
        (ciudad, codigo),
    )
    db.commit()
    new_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return {"id": new_id, "ciudad": ciudad, "codigo": codigo, "activo": 1}


@router.put("/api/ciudad-codigos/{cid}")
def actualizar_ciudad_codigo(
    cid: int,
    body: dict = Body(...),
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    ciudad = (body.get("ciudad") or "").strip()
    codigo = (body.get("codigo") or "").strip().upper()
    activo = int(body.get("activo", 1))
    if not ciudad or not codigo:
        raise HTTPException(status_code=400, detail="Ciudad y código son requeridos")
    db.execute(
        "UPDATE ciudad_codigos SET ciudad=?, codigo=?, activo=? WHERE id=?",
        (ciudad, codigo, activo, cid),
    )
    db.commit()
    return {"ok": True}


@router.delete("/api/ciudad-codigos/{cid}")
def eliminar_ciudad_codigo(
    cid: int,
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    db.execute("DELETE FROM ciudad_codigos WHERE id=?", (cid,))
    db.commit()
    return {"ok": True}
