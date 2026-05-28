"""routers/campos.py — Endpoints de campos, roles y secciones."""
from fastapi import APIRouter, Depends

from app.auth import require_login
from app.core import fields as F
from app.database import get_db

router = APIRouter()


@router.get("/api/roles")
def api_roles(sess: dict = Depends(require_login)):
    user_rol = sess.get("rol")
    if user_rol == "ADMIN":
        return F.ROLE_NAMES
    return [user_rol] if user_rol in F.ROLES_FIELDS else []


@router.get("/api/campo-reglas")
def api_campo_reglas(db=Depends(get_db), sess: dict = Depends(require_login)):
    rows = db.execute(
        """SELECT codigo, nombre,
                  requerido_crear, requerido_g2_lider, requerido_contralor,
                  dependencias
           FROM campos ORDER BY orden"""
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/api/campos/{rol}")
def api_campos(rol: str, db=Depends(get_db), sess: dict = Depends(require_login)):
    if rol == "LIDER":
        # Combinar GESTOR 2 + LIDER y deduplicar por código
        # (campos con rol "GESTOR 2, LIDER" aparecen en ambas listas)
        all_f = list(F.ROLES_FIELDS.get("GESTOR 2", [])) + list(F.ROLES_FIELDS.get("LIDER", []))
        unique_map = {f["codigo"]: f for f in all_f}
        fields = list(unique_map.values())
    else:
        fields = F.ROLES_FIELDS.get(rol, [])

    enriched = []
    for f in fields:
        field = dict(f)
        if field.get("opciones") is not None:
            rows = db.execute(
                "SELECT valor FROM lista_opciones WHERE codigo_campo = ? AND activo = 1 ORDER BY valor",
                (field["codigo"],),
            ).fetchall()
            if rows:
                field["opciones"] = [r["valor"] for r in rows]
        enriched.append(field)
    return enriched


@router.get("/api/campos-secciones/{rol}")
def api_campos_secciones(rol: str, db=Depends(get_db), sess: dict = Depends(require_login)):
    primary_role = sess.get("rol")

    def enrich(fields):
        result = []
        for f in fields:
            field = dict(f)
            if field.get("opciones") is not None:
                rows = db.execute(
                    "SELECT valor FROM lista_opciones WHERE codigo_campo = ? AND activo = 1 ORDER BY valor",
                    (field["codigo"],),
                ).fetchall()
                if rows:
                    field["opciones"] = [r["valor"] for r in rows]
            result.append(field)
        return result

    HIERARCHY = {
        "GESTOR 1":  [],
        "GESTOR 2":  ["GESTOR 1"],
        "LIDER":     ["GESTOR 1"],
        "CONTRALOR": ["GESTOR 1", "G2+LIDER"],
        "ADMIN":     ["GESTOR 1", "G2+LIDER", "CONTRALOR"],
    }

    lower_sections = HIERARCHY.get(primary_role, [])
    # Codes owned by the viewer's own section — exclude them from lower sections to avoid duplicates
    own_codes = {f["codigo"] for f in F.ROLES_FIELDS.get(primary_role, [])}
    secciones = []
    for section_key in lower_sections:
        if section_key == "G2+LIDER":
            fs = list(F.ROLES_FIELDS.get("GESTOR 2", [])) + list(F.ROLES_FIELDS.get("LIDER", []))
            fs = [f for f in fs if f["codigo"] not in own_codes]
            # Deduplicar por código (campos con rol 'GESTOR 2,LIDER' aparecen en ambas listas)
            unique_map = {f["codigo"]: f for f in fs}
            deduped = list(unique_map.values())
            if deduped:
                secciones.append({"rol": "GESTOR 2 / LIDER", "fields": enrich(deduped)})
        else:
            fs = [f for f in F.ROLES_FIELDS.get(section_key, []) if f["codigo"] not in own_codes]
            if fs:
                secciones.append({"rol": section_key, "fields": enrich(fs)})
    return secciones
