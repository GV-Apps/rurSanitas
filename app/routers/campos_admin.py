"""routers/campos_admin.py — Administración de campos del formulario (solo ADMIN)."""
import re

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.auth import require_admin
from app.core.fields import _col, _refresh_globals
from app.database import get_db

router = APIRouter()

_ROLES_VALIDOS = {"GESTOR 1", "GESTOR 2", "LIDER", "CONTRALOR", "ADMIN"}

# CWE-89 / F-15: códigos de campo usados en DDL dinámico — validación estricta
_CODIGO_RE = re.compile(r'^[A-Z]{1,3}[0-9]{0,2}$')


def _validate_codigo(codigo: str) -> None:
    """Valida que el código de campo sea alfanumérico seguro para usar en DDL."""
    if not _CODIGO_RE.match(codigo):
        raise HTTPException(
            status_code=400,
            detail="El código solo puede contener letras mayúsculas y opcionalmente dígitos (ej: A, AB, FX, A1). Máx 5 caracteres.",
        )


def _campo_row_to_dict(row) -> dict:
    keys = row.keys()
    return {
        "id":                  row["id"],
        "codigo":              row["codigo"],
        "nombre":              row["nombre"],
        "modo":                row["modo"],
        "origen":              row["origen"],
        "tipo_dato":           row["tipo_dato"],
        "comentario":          row["comentario"],
        "formula":             row["formula"],
        "rol":                 row["rol"],
        "orden":               row["orden"],
        "requerido_crear":     row["requerido_crear"]     if "requerido_crear"     in keys else 0,
        "requerido_g2_lider":  row["requerido_g2_lider"]  if "requerido_g2_lider"  in keys else 0,
        "requerido_contralor": row["requerido_contralor"] if "requerido_contralor" in keys else 0,
        "dependencias":        row["dependencias"]         if "dependencias"        in keys else None,
    }


# NOTE: static route /reorder must be registered BEFORE /{cid} to avoid route conflict
@router.post("/api/admin/campos/reorder")
def api_admin_campos_reorder(
    body: dict = Body(...),
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    """Actualiza el orden de los campos. Recibe lista de IDs en el nuevo orden."""
    ids = body.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="Lista de IDs vacía")
    for idx, cid in enumerate(ids):
        db.execute("UPDATE campos SET orden = ? WHERE id = ?", (idx * 10, cid))
    db.commit()
    _refresh_globals()
    return {"mensaje": f"{len(ids)} campos reordenados"}


@router.get("/api/admin/campos")
def api_admin_campos_list(db=Depends(get_db), sess: dict = Depends(require_admin)):
    """Retorna todos los campos ordenados, para el UI de administración."""
    rows = db.execute("SELECT * FROM campos ORDER BY orden").fetchall()
    return [_campo_row_to_dict(r) for r in rows]


@router.post("/api/admin/campos")
def api_admin_campos_create(
    body: dict = Body(...),
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    """Crea un nuevo campo en `campos` y agrega su columna a `registros` de inmediato."""
    codigo    = (body.get("codigo")    or "").strip().upper()
    nombre    = (body.get("nombre")    or "").strip()
    modo      = (body.get("modo")      or "MANUAL").strip().upper()
    origen    = (body.get("origen")    or "").strip() or None
    tipo_dato = (body.get("tipo_dato") or "Texto").strip()
    comentario = (body.get("comentario") or "").strip() or None
    formula   = (body.get("formula")   or "").strip() or None
    rol       = (body.get("rol")       or "").strip()

    if not codigo:
        raise HTTPException(status_code=400, detail="El código es requerido")
    _validate_codigo(codigo)
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre es requerido")
    if not rol:
        raise HTTPException(status_code=400, detail="El rol es requerido")

    roles_lista   = [r.strip() for r in rol.split(",") if r.strip()]
    invalid_roles = [r for r in roles_lista if r not in _ROLES_VALIDOS]
    if invalid_roles:
        raise HTTPException(status_code=400, detail=f"Roles inválidos: {invalid_roles}")
    rol_norm = ",".join(roles_lista)

    max_orden  = db.execute("SELECT MAX(orden) FROM campos").fetchone()[0]
    nuevo_orden = (max_orden or 0) + 10

    try:
        db.execute(
            "INSERT INTO campos (codigo, nombre, modo, origen, tipo_dato, comentario,"
            " formula, rol, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (codigo, nombre, modo, origen, tipo_dato, comentario, formula, rol_norm, nuevo_orden),
        )
        db.commit()
    except Exception as exc:
        # Handles both sqlite3.IntegrityError and psycopg2.errors.UniqueViolation
        if "unique" in str(exc).lower() or "duplicate" in str(exc).lower():
            raise HTTPException(
                status_code=409,
                detail=f"Ya existe un campo con código '{codigo}'",
            )
        raise HTTPException(status_code=500, detail=str(exc))

    # Agregar columna en registros si no existe
    col_name = _col(codigo)
    existing = [r[1] for r in db.execute("PRAGMA table_info(registros)").fetchall()]
    if col_name not in existing:
        try:
            db.execute(f"ALTER TABLE registros ADD COLUMN {col_name} TEXT")  # nosemgrep
            db.commit()
        except Exception:
            pass  # columna ya existe o nombre inválido

    row = db.execute("SELECT * FROM campos WHERE codigo = ?", (codigo,)).fetchone()
    _refresh_globals()
    return JSONResponse(content=_campo_row_to_dict(row), status_code=201)


@router.put("/api/admin/campos/{cid}")
def api_admin_campos_update(
    cid: int,
    body: dict = Body(...),
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    """Actualiza un campo existente."""
    existing = db.execute("SELECT * FROM campos WHERE id = ?", (cid,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Campo no encontrado")

    nombre    = (body.get("nombre") or "").strip()
    comentario = (body.get("comentario") or "").strip() or None
    rol       = (body.get("rol") or "").strip()

    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre es requerido")
    if not rol:
        raise HTTPException(status_code=400, detail="El rol es requerido")

    roles_lista   = [r.strip() for r in rol.split(",") if r.strip()]
    invalid_roles = [r for r in roles_lista if r not in _ROLES_VALIDOS]
    if invalid_roles:
        raise HTTPException(status_code=400, detail=f"Roles inválidos: {invalid_roles}")
    rol_norm = ",".join(roles_lista)

    requerido_crear     = 1 if body.get("requerido_crear")     else 0
    requerido_g2_lider  = 1 if body.get("requerido_g2_lider")  else 0
    requerido_contralor = 1 if body.get("requerido_contralor") else 0
    dependencias        = body.get("dependencias") or None

    db.execute(
        """UPDATE campos
           SET nombre=?, comentario=?, rol=?,
               requerido_crear=?, requerido_g2_lider=?, requerido_contralor=?,
               dependencias=?
           WHERE id=?""",
        (nombre, comentario, rol_norm,
         requerido_crear, requerido_g2_lider, requerido_contralor,
         dependencias, cid),
    )
    db.commit()
    row = db.execute("SELECT * FROM campos WHERE id = ?", (cid,)).fetchone()
    _refresh_globals()
    return _campo_row_to_dict(row)


@router.delete("/api/admin/campos/{cid}")
def api_admin_campos_delete(
    cid: int,
    db=Depends(get_db),
    sess: dict = Depends(require_admin),
):
    """Elimina un campo de la configuración.
    La columna en `registros` se conserva para no perder datos históricos,
    pero el campo deja de aparecer en el formulario inmediatamente.
    """
    if not db.execute("SELECT id FROM campos WHERE id = ?", (cid,)).fetchone():
        raise HTTPException(status_code=404, detail="Campo no encontrado")
    db.execute("DELETE FROM campos WHERE id = ?", (cid,))
    db.commit()
    _refresh_globals()
    return {"mensaje": "Campo eliminado. Los datos históricos en registros existentes se conservan."}
