"""routers/registros.py — CRUD de registros de conciliación."""
import re
import logging
from datetime import datetime, date as _date

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from app.auth import require_login
from app.core import fields as F
from app.core.helpers import (
    _registrar_audit, can_edit_registro, crear_notificacion,
    get_visibility_filter,
)
from app.database import get_db

router = APIRouter()

_ACTA_RE = re.compile(r'^[AB]\d{8}-\d{4}$')
_N_MAX_DIAS_SIN_APROBACION = 14  # N con más de 14 días de antigüedad requiere aprobación


def _safe_str(row, col: str) -> str:
    """Lee una columna de un row sin lanzar excepción si no existe.
    Convierte a str antes de strip() para tolerar tipos date/datetime de PostgreSQL."""
    try:
        val = row[col]
        if val is None:
            return ""
        return str(val).strip()
    except (KeyError, IndexError):
        return ""


def _n_requiere_aprobacion(n_val: str) -> bool:
    """Retorna True si la fecha N es más antigua que 14 días desde hoy."""
    if not n_val:
        return False
    try:
        n_date = datetime.strptime(n_val.strip(), "%Y-%m-%d").date()
        return (_date.today() - n_date).days > _N_MAX_DIAS_SIN_APROBACION
    except Exception:
        return False


def _notificar_lider_aprobacion_n(db, registro_id: int, consec: str,
                                   creator: str, creator_nombre: str,
                                   comentario: str, regional_b: str = ""):
    """Notifica al líder de la regional del campo C del registro sobre la solicitud de aprobación N.
    Prioridad: (1) líderes/coordinadores de regional_b, (2) superior_inmediato del creador,
    (3) contralores de regional_b como último fallback.
    El parámetro regional_b recibe el valor del campo C (CIUDAD_RESPONSABLE_DE_LA_CONCILIACION).
    """
    msg = (
        f"[SOLICITUD APROBACIÓN FECHA N] {creator_nombre} creó/modificó el registro "
        f"{consec} (ID: {registro_id}) con una Fecha de Solicitud [N] con más de "
        f"{_N_MAX_DIAS_SIN_APROBACION} días de antigüedad.\n"
        f"Comentario del gestor: {comentario or '(sin comentario)'}"
    )
    notified: set = set()

    # 1. Líderes/coordinadores de la regional del campo B del registro
    if regional_b:
        for lc in db.execute(
            """SELECT usuario FROM usuarios
               WHERE activo = 1 AND (perm_lider = 1 OR perm_coordinador = 1)
                 AND perm_contralor = 0
                 AND UPPER(TRIM(regional)) = UPPER(TRIM(?)) AND usuario != ?""",
            (regional_b, creator)
        ).fetchall():
            crear_notificacion(db, lc["usuario"], "solicitud_aprobacion_n", msg, registro_id)
            notified.add(lc["usuario"])

    # 2. Fallback: superior_inmediato del creador (si no se notificó a nadie aún)
    if not notified:
        creator_row = db.execute(
            "SELECT superior_inmediato, regional FROM usuarios WHERE usuario = ? AND activo = 1",
            (creator,)
        ).fetchone()
        if creator_row:
            lider = (creator_row["superior_inmediato"] or "").strip()
            if lider and lider != creator:
                crear_notificacion(db, lider, "solicitud_aprobacion_n", msg, registro_id)
                notified.add(lider)

            # 3. Último fallback: contralores de regional_b (o regional del creador)
            if not notified:
                fallback_regional = regional_b or (creator_row["regional"] or "").strip()
                if fallback_regional:
                    for ct in db.execute(
                        """SELECT usuario FROM usuarios
                           WHERE activo = 1 AND perm_contralor = 1
                             AND UPPER(TRIM(regional)) = UPPER(TRIM(?)) AND usuario != ?""",
                        (fallback_regional, creator)
                    ).fetchall():
                        crear_notificacion(db, ct["usuario"], "solicitud_aprobacion_n", msg, registro_id)

def _lider_tiene_acceso_contralor(db, row) -> bool:
    """Evalúa si la condición de acceso extendido LIDER→CONTRALOR se cumple para este registro.

    Condición:
      1. BY == 'ENVIADA A CONTROLAR MEDICO NACIONAL'
      2. Existe una configuración activa en config_umbral_lider_contralor
      3. El valor del campo Moneda configurado en el registro ≤ umbral configurado
    """
    by_col = F._col("BY")
    try:    by_val = (row[by_col] or "").strip()
    except (KeyError, IndexError): by_val = ""
    if by_val != "ENVIADA A CONTROLAR MEDICO NACIONAL":
        return False

    try:
        cfg = db.execute(
            "SELECT campo_codigo, umbral"
            " FROM config_umbral_lider_contralor WHERE activo = 1 LIMIT 1"
        ).fetchone()
    except Exception:
        return False
    if not cfg:
        return False

    campo_col = F._col(cfg["campo_codigo"])
    try:    campo_val = row[campo_col]
    except (KeyError, IndexError): return False
    if campo_val is None:
        return False
    try:
        return float(campo_val) <= float(cfg["umbral"])
    except (ValueError, TypeError):
        return False


# ── IMPORTANTE: rutas estáticas ANTES de las paramétricas ──────────────────

@router.get("/api/registros/lista")
def listar_registros_picker(db=Depends(get_db), sess: dict = Depends(require_login)):
    """Retorna info mínima de registros visibles para el selector."""
    where, params = get_visibility_filter(db, sess)
    if where is None:
        rows = db.execute("SELECT * FROM registros ORDER BY id DESC").fetchall()
    else:
        rows = db.execute(  # nosemgrep
            f"SELECT * FROM registros WHERE {where} ORDER BY id DESC", params
        ).fetchall()

    current_user     = sess["usuario"]
    current_regional = (sess.get("regional") or "").strip().upper()
    is_admin_or_ctrl = sess.get("is_admin") or "CONTRALOR" in sess.get("permisos", [])
    is_lider         = "LIDER" in (sess.get("permisos") or [])

    me = db.execute(
        "SELECT nombre_completo FROM usuarios WHERE usuario = ? AND activo = 1",
        (current_user,)
    ).fetchone()
    current_nombre = (me["nombre_completo"] or "").strip() if me else None

    # ── "Pendiente de aprobación otra regional": registros donde campo C = regional
    # del líder actual pero campo B ≠ campo C. Solo para líderes no-admin/contralor.
    otra_regional_ids: set = set()
    if not is_admin_or_ctrl and is_lider and current_regional:
        _col_b = F._col("B")   # REGIONAL_IPS
        _col_c = F._col("C")   # CIUDAD_RESPONSABLE_DE_LA_CONCILIACION
        extra_rows = db.execute(  # nosemgrep
            f"""SELECT * FROM registros
               WHERE estado_aprobacion_n = 'pendiente'
                 AND UPPER(TRIM({_col_c})) = UPPER(TRIM(?))
                 AND UPPER(TRIM({_col_b})) != UPPER(TRIM({_col_c}))""",
            (current_regional,)
        ).fetchall()
        existing_ids = {r["id"] for r in rows}
        extra_to_add = [er for er in extra_rows if er["id"] not in existing_ids]
        rows = list(rows) + extra_to_add
        otra_regional_ids = {er["id"] for er in extra_to_add}

    creator_ids = list({row["usuario"] for row in rows})
    creator_map: dict = {}
    if creator_ids:
        ph = ",".join("?" * len(creator_ids))
        for cr in db.execute(  # nosemgrep
            f"SELECT usuario, nombre_completo, superior_inmediato FROM usuarios WHERE usuario IN ({ph})",
            creator_ids
        ).fetchall():
            creator_map[cr["usuario"]] = {
                "nombre": cr["nombre_completo"],
                "lider":  cr["superior_inmediato"],
            }

    lider_ids = list({v["lider"] for v in creator_map.values() if v.get("lider")})
    lider_nombre_map: dict = {}
    if lider_ids:
        ph2 = ",".join("?" * len(lider_ids))
        for lr in db.execute(  # nosemgrep
            f"SELECT usuario, nombre_completo FROM usuarios WHERE usuario IN ({ph2})",
            lider_ids
        ).fetchall():
            lider_nombre_map[lr["usuario"]] = lr["nombre_completo"]

    # IDs de registros con auditoría activa o en proceso
    auditoria_activa_rows = db.execute(
        "SELECT DISTINCT registro_id FROM auditoria_registros WHERE estado IN ('activa', 'en_proceso')"
    ).fetchall()
    activos_set = {r["registro_id"] for r in auditoria_activa_rows}

    result = []
    for row in rows:
        def get_val(cod, _row=row):
            try:
                return _row[F._col(cod)]
            except (IndexError, KeyError):
                return None

        ciudad_val = (get_val("C") or "").strip()
        ag_val     = (get_val("AG") or "").strip()
        creador    = row["usuario"]
        cr_info    = creator_map.get(creador, {})

        if is_admin_or_ctrl:
            section = None
        elif current_nombre and ag_val.lower() == current_nombre.lower():
            section = "asignado"
        elif creador == current_user:
            section = "creado"
        elif is_lider and cr_info.get("lider") == current_user:
            section = "ciudad"
        else:
            section = None

        try:    _validado_flag = bool(row["validado"])
        except (KeyError, IndexError): _validado_flag = False

        result.append({
            "id":             row["id"],
            "rol":            row["rol"],
            "usuario":        creador,
            "fecha_creacion": row["fecha_creacion"],
            "consecutivo":    get_val("A"),
            "compania":       get_val("D"),
            "nit":            get_val("E"),
            "nombre":         get_val("I"),
            "vr_cartera":     get_val("M"),
            "periodo_desde":  get_val("K"),
            "periodo_hasta":  get_val("L"),
            "ciudad_resp":    get_val("C"),
            "can_edit":       can_edit_registro(row, sess, db),
            "section":        section,
            "nombre_creador": cr_info.get("nombre") or creador,
            "lider_creador":  cr_info.get("lider"),
            "nombre_lider":   lider_nombre_map.get(cr_info.get("lider"), cr_info.get("lider")),
            "estado_ac":      get_val("AC"),
            "estado_bd":      get_val("BD"),
            "estado_ce":      get_val("CE"),
            "tiene_auditoria_activa": row["id"] in activos_set,
            "estado_aprobacion_n": _safe_str(row, "estado_aprobacion_n"),
            "regional_ips":    get_val("B"),
            "pendiente_otra_regional": row["id"] in otra_regional_ids,
            # Campos nuevos para gestión de validación y filtrado por BY
            "validado":           _validado_flag,
            "estado_by":          get_val("BY"),
            "nombre_responsable": ag_val,
        })
    return result


# ── Helpers para paginación ───────────────────────────────────────────────────

def _sql_cerrado() -> str:
    ac, bd, ce = F._col("AC"), F._col("BD"), F._col("CE")
    # COALESCE es necesario: NULL IN (...) = NULL en SQL, y NOT NULL = NULL,
    # lo que hace que registros con campos vacíos queden excluidos por not_cerrado.
    return (
        f"(COALESCE({ac},'') IN ('CERRADO POR CANCELACION DE MESA','CERRADO POR CANCELACION DE MESAS',"
        f"'CERRADO SIN FINALIZACIÓN','IPS NO ASISTE A MESAS')"
        f" OR UPPER(TRIM(COALESCE({bd},''))) = 'CERRADO SIN FINALIZACION'"
        f" OR COALESCE({ce},'') IN ('CERRADO POR CANCELACION DE MESAS','CERRADO SIN FINALIZACIÓN'))"
    )


def _sql_sep() -> str:
    # COALESCE trata NULL como '' → no queda atrapado por NOT (NULL IN (...)) = NULL
    return "COALESCE(estado_aprobacion_n, '') IN ('pendiente','rechazado','cancelado')"


def _user_filter_sql(busqueda: str, f_gestor: str, f_region: str, f_lider: str, db) -> tuple:
    """Devuelve (extra_where, extra_params) para los filtros del usuario."""
    conds, params = [], []
    col_a  = F._col("A")
    col_e  = F._col("E")
    col_i  = F._col("I")
    col_c  = F._col("C")
    col_ag = F._col("AG")
    if busqueda:
        like = f"%{busqueda.lower()}%"
        conds.append(
            f"(LOWER(COALESCE(CAST({col_a} AS TEXT),'')) LIKE ?"
            f" OR LOWER(COALESCE(CAST({col_e} AS TEXT),'')) LIKE ?"
            f" OR LOWER(COALESCE(CAST({col_i} AS TEXT),'')) LIKE ?)"
        )
        params.extend([like, like, like])
    if f_gestor:
        conds.append(f"LOWER(TRIM({col_ag})) = LOWER(?)")
        params.append(f_gestor)
    if f_region:
        conds.append(f"LOWER(TRIM({col_c})) = LOWER(?)")
        params.append(f_region)
    if f_lider:
        sub_rows = db.execute(
            "SELECT usuario FROM usuarios WHERE superior_inmediato = ? AND activo = 1",
            (f_lider,)
        ).fetchall()
        sub_users = [r["usuario"] for r in sub_rows]
        if sub_users:
            ph = ",".join(["?"] * len(sub_users))
            conds.append(f"usuario IN ({ph})")
            params.extend(sub_users)
        else:
            conds.append("1=0")
    return (" AND ".join(conds), params) if conds else ("", [])


def _build_base_where(vis_where, vis_params, user_sql, user_params,
                      extra_conds="", extra_params=None) -> tuple:
    parts, all_params = [], []
    if vis_where:
        parts.append(vis_where)
        all_params.extend(vis_params or [])
    if user_sql:
        parts.append(user_sql)
        all_params.extend(user_params or [])
    if extra_conds:
        parts.append(extra_conds)
        all_params.extend(extra_params or [])
    where = " AND ".join(f"({p})" for p in parts) if parts else "1=1"
    return where, all_params


def _serialize_registro(row, sess, db, creator_map, lider_nombre_map,
                        activos_set, otra_regional_ids,
                        current_nombre, is_admin_ctrl, is_lider, current_user):
    def get_val(cod, _row=row):
        try:
            return _row[F._col(cod)]
        except (IndexError, KeyError):
            return None

    ag_val  = (get_val("AG") or "").strip()
    creador = row["usuario"]
    cr_info = creator_map.get(creador, {})

    if is_admin_ctrl:
        section = None
    elif current_nombre and ag_val.lower() == current_nombre.lower():
        section = "asignado"
    elif creador == current_user:
        section = "creado"
    elif is_lider and cr_info.get("lider") == current_user:
        section = "ciudad"
    else:
        section = None

    try:
        _validado_flag = bool(row["validado"])
    except (KeyError, IndexError):
        _validado_flag = False

    return {
        "id":             row["id"],
        "rol":            row["rol"],
        "usuario":        creador,
        "fecha_creacion": row["fecha_creacion"],
        "consecutivo":    get_val("A"),
        "compania":       get_val("D"),
        "nit":            get_val("E"),
        "nombre":         get_val("I"),
        "vr_cartera":     get_val("M"),
        "periodo_desde":  get_val("K"),
        "periodo_hasta":  get_val("L"),
        "ciudad_resp":    get_val("C"),
        "can_edit":       can_edit_registro(row, sess, db),
        "section":        section,
        "nombre_creador": cr_info.get("nombre") or creador,
        "lider_creador":  cr_info.get("lider"),
        "nombre_lider":   lider_nombre_map.get(cr_info.get("lider"), cr_info.get("lider")),
        "estado_ac":      get_val("AC"),
        "estado_bd":      get_val("BD"),
        "estado_ce":      get_val("CE"),
        "tiene_auditoria_activa": row["id"] in activos_set,
        "estado_aprobacion_n": _safe_str(row, "estado_aprobacion_n"),
        "regional_ips":    get_val("B"),
        "pendiente_otra_regional": row["id"] in otra_regional_ids,
        "validado":           _validado_flag,
        "estado_by":          get_val("BY"),
        "nombre_responsable": ag_val,
    }


@router.get("/api/registros/grupos-resumen")
def grupos_resumen(
    busqueda: str = Query(default=""),
    f_gestor: str = Query(default=""),
    f_region: str = Query(default=""),
    f_lider:  str = Query(default=""),
    db=Depends(get_db),
    sess: dict = Depends(require_login),
):
    """Conteos por sección y grupos para la vista paginada."""
    vis_where, vis_params = get_visibility_filter(db, sess)
    user_sql,  user_params = _user_filter_sql(busqueda, f_gestor, f_region, f_lider, db)

    is_admin_ctrl    = sess.get("is_admin") or "CONTRALOR" in sess.get("permisos", [])
    is_contralor_role = "CONTRALOR" in sess.get("permisos", [])
    is_admin_only    = is_admin_ctrl and not is_contralor_role   # ADMIN puro, sin rol CONTRALOR
    is_lider         = "LIDER" in sess.get("permisos", [])
    current_user     = sess["usuario"]
    current_regional = (sess.get("regional") or "").strip().upper()

    me_row = db.execute(
        "SELECT nombre_completo FROM usuarios WHERE usuario = ? AND activo = 1",
        (current_user,)
    ).fetchone()
    current_nombre = (me_row["nombre_completo"] or "").strip() if me_row else ""

    col_b  = F._col("B")
    col_c  = F._col("C")
    col_ag = F._col("AG")
    col_by = F._col("BY")
    cerrado     = _sql_cerrado()
    sep         = _sql_sep()
    by_env      = f"COALESCE({col_by},'') = 'ENVIADA A CONTROLAR MEDICO NACIONAL'"
    not_cerrado = f"NOT {cerrado}"
    not_sep     = f"NOT ({sep})"
    not_fin     = "COALESCE(proceso_finalizado, 0) = 0"

    def count_extra(extra_conds: str, extra_params: list = None) -> int:
        w, p = _build_base_where(vis_where, vis_params, user_sql, user_params,
                                 extra_conds, extra_params or [])
        row = db.execute(f"SELECT COUNT(*) AS c FROM registros WHERE {w}", p).fetchone()  # nosemgrep
        return row["c"] if row else 0

    secciones: dict = {}

    # ── Conteo sección principal ──────────────────────────────────────────────
    # CONTRALOR: solo BY=ENVIADA  |  ADMIN/LIDER: excluye BY=ENVIADA  |  GESTOR: idem
    if is_contralor_role:
        secciones["main"] = count_extra(f"({by_env}) AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin}) AND validado = 1")
    elif is_admin_only:
        secciones["main"] = count_extra(f"NOT ({by_env}) AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin}) AND validado = 1")
    elif is_lider:
        secciones["main"] = count_extra(f"({not_cerrado}) AND ({not_sep}) AND ({not_fin}) AND validado = 1 AND NOT ({by_env})")
    else:
        if current_nombre:
            secciones["main"] = count_extra(
                f"NOT ({by_env}) AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin}) AND LOWER(TRIM({col_ag})) = LOWER(?)",
                [current_nombre]
            )
        else:
            secciones["main"] = 0

    secciones["creados"]  = count_extra(f"({not_cerrado}) AND ({not_sep}) AND ({not_fin}) AND usuario = ?", [current_user])
    secciones["cerrados"] = count_extra(f"({cerrado}) AND ({not_fin})")

    if is_lider and current_regional:
        pn_sql = (f"estado_aprobacion_n = 'pendiente' AND NOT ("
                  f"UPPER(TRIM({col_c})) = UPPER(TRIM(?)) AND UPPER(TRIM({col_b})) != UPPER(TRIM({col_c})))")
        secciones["pendientes_n"] = count_extra(pn_sql, [current_regional])
    else:
        secciones["pendientes_n"] = count_extra("estado_aprobacion_n = 'pendiente'")

    is_priv = is_admin_ctrl or is_lider
    if is_priv:
        secciones["rechazados_n"] = count_extra("estado_aprobacion_n = 'rechazado'")
    else:
        secciones["rechazados_n"] = count_extra(
            "estado_aprobacion_n = 'rechazado' AND usuario = ?", [current_user]
        )

    if is_lider and current_regional:
        or_parts  = [f"estado_aprobacion_n = 'pendiente'",
                     f"UPPER(TRIM({col_c})) = UPPER(TRIM(?))",
                     f"UPPER(TRIM({col_b})) != UPPER(TRIM({col_c}))"]
        or_params = [current_regional]
        if user_sql:
            or_parts.append(user_sql)
            or_params.extend(user_params)
        or_where = " AND ".join(f"({x})" for x in or_parts)
        row = db.execute(f"SELECT COUNT(*) AS c FROM registros WHERE {or_where}", or_params).fetchone()  # nosemgrep
        secciones["otra_regional"] = row["c"] if row else 0
    else:
        secciones["otra_regional"] = 0

    # Pendientes de validar: todos los roles excluyen BY=ENVIADA
    if is_lider or is_admin_ctrl:
        secciones["pendientes_validar"] = count_extra(
            f"validado = 0 AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin}) AND NOT ({by_env})"
        )
    else:
        secciones["pendientes_validar"] = 0

    # ── Secciones nuevas: "Registros en Revisión de Contralor" y "Registros en Curso" ──
    # LIDER (sin CONTRALOR) + ADMIN: ven BY=ENVIADA en "en_revision_contralor"
    if (is_lider and not is_contralor_role) or is_admin_only:
        secciones["en_revision_contralor"] = count_extra(
            f"({by_env}) AND ({not_cerrado}) AND ({not_sep}) AND COALESCE(proceso_finalizado,0)=0"
        )
    else:
        secciones["en_revision_contralor"] = 0

    # CONTRALOR: ve non-ENVIADA en "en_curso_contralor"
    if is_contralor_role:
        secciones["en_curso_contralor"] = count_extra(
            f"NOT ({by_env}) AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin}) AND validado = 1"
        )
    else:
        secciones["en_curso_contralor"] = 0

    # ── Groups ────────────────────────────────────────────────────────────────
    grupos_main: list              = []
    grupos_pend_validar: list      = []
    grupos_en_revision: list       = []   # LIDER (sin CONTRALOR) + ADMIN: BY=ENVIADA
    grupos_en_curso_contralor: list = []  # CONTRALOR: non-ENVIADA
    base_w, base_p = _build_base_where(vis_where, vis_params, user_sql, user_params)

    def group_query(group_col: str, extra_where: str, extra_params: list) -> list:
        w = f"({base_w}) AND ({extra_where})" if base_w != "1=1" else extra_where
        p = list(base_p) + list(extra_params)
        return db.execute(
            f"SELECT COALESCE({group_col},'') AS clave, COUNT(*) AS total "
            f"FROM registros WHERE {w} GROUP BY {group_col} ORDER BY {group_col}",
            p
        ).fetchall()

    if is_contralor_role:
        # Main: solo BY=ENVIADA agrupado por C
        for r in group_query(col_c, f"({by_env}) AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin}) AND validado = 1", []):
            grupos_main.append({"clave": r["clave"], "label": r["clave"] or "Sin ciudad responsable", "total": r["total"]})
        # Pendientes validar: non-ENVIADA, validado=0
        for r in group_query(col_c, f"NOT ({by_env}) AND validado = 0 AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin})", []):
            grupos_pend_validar.append({"clave": r["clave"], "label": r["clave"] or "Sin ciudad responsable", "total": r["total"]})
        # En Curso (CONTRALOR): non-ENVIADA, validado=1
        for r in group_query(col_c, f"NOT ({by_env}) AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin}) AND validado = 1", []):
            grupos_en_curso_contralor.append({"clave": r["clave"], "label": r["clave"] or "Sin ciudad responsable", "total": r["total"]})

    elif is_admin_only:
        # Main: non-ENVIADA agrupado por C (igual que antes pero sin ENVIADA)
        for r in group_query(col_c, f"NOT ({by_env}) AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin}) AND validado = 1", []):
            grupos_main.append({"clave": r["clave"], "label": r["clave"] or "Sin ciudad responsable", "total": r["total"]})
        # Pendientes validar: non-ENVIADA, validado=0
        for r in group_query(col_c, f"NOT ({by_env}) AND validado = 0 AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin})", []):
            grupos_pend_validar.append({"clave": r["clave"], "label": r["clave"] or "Sin ciudad responsable", "total": r["total"]})
        # En Revisión (ADMIN): BY=ENVIADA agrupado por C
        for r in group_query(col_c, f"({by_env}) AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin})", []):
            grupos_en_revision.append({"clave": r["clave"], "label": r["clave"] or "Sin ciudad responsable", "total": r["total"]})

    elif is_lider:
        # Main: non-ENVIADA agrupado por AG (sin cambio)
        for r in group_query(col_ag, f"({not_cerrado}) AND ({not_sep}) AND ({not_fin}) AND validado = 1 AND NOT ({by_env})", []):
            clave = (r["clave"] or "").strip()
            grupos_main.append({"clave": clave, "label": clave or "Sin responsable", "total": r["total"]})
        # Pendientes validar: non-ENVIADA, validado=0
        for r in group_query(col_ag, f"validado = 0 AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin}) AND NOT ({by_env})", []):
            clave = (r["clave"] or "").strip()
            grupos_pend_validar.append({"clave": clave, "label": clave or "Sin responsable", "total": r["total"]})
        # En Revisión (LIDER): BY=ENVIADA agrupado por AG
        for r in group_query(col_ag, f"({by_env}) AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin})", []):
            clave = (r["clave"] or "").strip()
            grupos_en_revision.append({"clave": clave, "label": clave or "Sin responsable", "total": r["total"]})

    else:
        # GESTOR: subgrupos non-ENVIADA (sin cambio funcional)
        if current_nombre:
            asig_sql = f"LOWER(TRIM({col_ag})) = LOWER(?) AND ({not_cerrado}) AND ({not_sep}) AND ({not_fin})"
            w = f"({base_w}) AND ({asig_sql})" if base_w != "1=1" else asig_sql
            p = list(base_p) + [current_nombre]
            pend_row = db.execute(f"SELECT COUNT(*) AS c FROM registros WHERE {w} AND validado = 0 AND NOT ({by_env})", p).fetchone()  # nosemgrep
            encu_row = db.execute(f"SELECT COUNT(*) AS c FROM registros WHERE {w} AND validado = 1 AND NOT ({by_env})", p).fetchone()  # nosemgrep
            if pend_row and pend_row["c"]:
                grupos_main.append({"clave": "__pendientes__", "label": "Pendientes de validar", "total": pend_row["c"]})
            if encu_row and encu_row["c"]:
                grupos_main.append({"clave": "__en_curso__", "label": "Registros en curso", "total": encu_row["c"]})

        # Grupo especial: registros con auditoría activa donde este GESTOR es destinatario.
        # Se inserta primero para que aparezcan al inicio de la sección Registros.
        aud_row = db.execute(
            "SELECT COUNT(*) AS c FROM registros WHERE id IN ("
            "  SELECT registro_id FROM auditoria_registros "
            "  WHERE destinatario_usuario = ? AND estado IN ('activa','en_proceso')"
            ")",
            [current_user],
        ).fetchone()
        aud_c = aud_row["c"] if aud_row else 0
        if aud_c:
            grupos_main.insert(0, {
                "clave": "__auditorias__",
                "label": "Con auditorías activas",
                "total": aud_c,
            })
            secciones["main"] = (secciones.get("main") or 0) + aud_c

    # ── Grupos para sección "Cerrados sin finalización" ───────────────────────
    # ADMIN/CONTRALOR: agrupados por CIUDAD_RESPONSABLE (campo C)
    # LIDER:           agrupados por responsable de conciliación (campo AG)
    grupos_cerrados: list = []
    if is_admin_ctrl:
        for r in group_query(col_c, f"({cerrado}) AND ({not_fin})", []):
            grupos_cerrados.append({"clave": r["clave"], "label": r["clave"] or "Sin ciudad responsable", "total": r["total"]})
    elif is_lider:
        for r in group_query(col_ag, f"({cerrado}) AND ({not_fin})", []):
            clave = (r["clave"] or "").strip()
            grupos_cerrados.append({"clave": clave, "label": clave or "Sin responsable", "total": r["total"]})

    return {
        "grupos_main":               grupos_main,
        "grupos_pend_validar":       grupos_pend_validar,
        "grupos_cerrados":           grupos_cerrados,
        "grupos_en_revision":        grupos_en_revision,
        "grupos_en_curso_contralor": grupos_en_curso_contralor,
        "secciones":                 secciones,
    }


@router.get("/api/registros/lista-paginada")
def lista_paginada(
    seccion:  str = Query(default="main"),
    grupo:    str = Query(default=""),
    page:     int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=200),
    busqueda: str = Query(default=""),
    f_gestor: str = Query(default=""),
    f_region: str = Query(default=""),
    f_lider:  str = Query(default=""),
    db=Depends(get_db),
    sess: dict = Depends(require_login),
):
    """Registros paginados para una sección y grupo específicos, ordenados por campo N DESC."""
    is_admin_ctrl     = sess.get("is_admin") or "CONTRALOR" in sess.get("permisos", [])
    is_contralor_role = "CONTRALOR" in sess.get("permisos", [])
    is_admin_only     = is_admin_ctrl and not is_contralor_role
    is_lider          = "LIDER" in sess.get("permisos", [])
    current_user      = sess["usuario"]
    current_regional  = (sess.get("regional") or "").strip().upper()

    me_row = db.execute(
        "SELECT nombre_completo FROM usuarios WHERE usuario = ? AND activo = 1",
        (current_user,)
    ).fetchone()
    current_nombre = (me_row["nombre_completo"] or "").strip() if me_row else ""

    col_b  = F._col("B")
    col_c  = F._col("C")
    col_ag = F._col("AG")
    col_by = F._col("BY")
    col_n  = F._col("N")

    cerrado     = _sql_cerrado()
    sep         = _sql_sep()
    by_env      = f"COALESCE({col_by},'') = 'ENVIADA A CONTROLAR MEDICO NACIONAL'"
    not_cerrado = f"NOT {cerrado}"
    not_sep     = f"NOT ({sep})"

    user_sql, user_params = _user_filter_sql(busqueda, f_gestor, f_region, f_lider, db)

    if seccion == "otra_regional":
        parts      = [f"estado_aprobacion_n = 'pendiente'",
                      f"UPPER(TRIM({col_c})) = UPPER(TRIM(?))",
                      f"UPPER(TRIM({col_b})) != UPPER(TRIM({col_c}))",
                      "COALESCE(proceso_finalizado, 0) = 0"]
        all_params = [current_regional]
        if user_sql:
            parts.append(user_sql)
            all_params.extend(user_params)
        where = " AND ".join(f"({x})" for x in parts)
    else:
        vis_where, vis_params = get_visibility_filter(db, sess)
        extra_parts: list  = []
        extra_params: list = []

        if seccion == "main":
            extra_parts.append(f"({not_cerrado}) AND ({not_sep})")
            if is_contralor_role:
                # CONTRALOR: solo BY=ENVIADA en main
                extra_parts.append(f"validado = 1 AND ({by_env})")
                if grupo:
                    extra_parts.append(f"LOWER(TRIM({col_c})) = LOWER(?)")
                    extra_params.append(grupo)
            elif is_admin_only:
                # ADMIN puro: non-ENVIADA (como LIDER pero agrupado por C)
                extra_parts.append(f"validado = 1 AND NOT ({by_env})")
                if grupo:
                    extra_parts.append(f"LOWER(TRIM({col_c})) = LOWER(?)")
                    extra_params.append(grupo)
            elif is_lider:
                extra_parts.append(f"validado = 1 AND NOT ({by_env})")
                if grupo:
                    extra_parts.append(f"LOWER(TRIM({col_ag})) = LOWER(?)")
                    extra_params.append(grupo)
            else:
                if grupo == "__auditorias__":
                    # Grupo especial: registros con auditoría activa para este usuario.
                    # Bypasea los filtros de sección (not_cerrado, not_sep, col_ag).
                    extra_parts.clear()
                    extra_parts.append(
                        "id IN (SELECT registro_id FROM auditoria_registros "
                        "WHERE destinatario_usuario = ? AND estado IN ('activa','en_proceso'))"
                    )
                    extra_params.append(current_user)
                else:
                    extra_parts.append(f"LOWER(TRIM({col_ag})) = LOWER(?)")
                    extra_params.append(current_nombre)
                    if grupo == "__pendientes__":
                        extra_parts.append(f"validado = 0 AND NOT ({by_env})")
                    elif grupo == "__en_curso__":
                        extra_parts.append(f"validado = 1 AND NOT ({by_env})")

        elif seccion == "creados":
            extra_parts.append(f"({not_cerrado}) AND ({not_sep}) AND usuario = ?")
            extra_params.append(current_user)

        elif seccion == "cerrados":
            extra_parts.append(cerrado)
            if grupo:
                if is_admin_ctrl:
                    extra_parts.append(f"LOWER(TRIM({col_c})) = LOWER(?)")
                    extra_params.append(grupo)
                elif is_lider:
                    extra_parts.append(f"LOWER(TRIM({col_ag})) = LOWER(?)")
                    extra_params.append(grupo)

        elif seccion == "pendientes_n":
            extra_parts.append("estado_aprobacion_n = 'pendiente'")
            if is_lider and current_regional:
                extra_parts.append(
                    f"NOT (UPPER(TRIM({col_c})) = UPPER(TRIM(?)) AND UPPER(TRIM({col_b})) != UPPER(TRIM({col_c})))"
                )
                extra_params.append(current_regional)

        elif seccion == "rechazados_n":
            extra_parts.append("estado_aprobacion_n = 'rechazado'")
            if not (is_admin_ctrl or is_lider):
                extra_parts.append("usuario = ?")
                extra_params.append(current_user)

        elif seccion == "pendientes_validar":
            # Todos los roles excluyen BY=ENVIADA de pendientes de validar
            extra_parts.append(f"validado = 0 AND ({not_cerrado}) AND ({not_sep}) AND NOT ({by_env})")
            if grupo:
                if is_admin_ctrl:
                    extra_parts.append(f"LOWER(TRIM({col_c})) = LOWER(?)")
                    extra_params.append(grupo)
                elif is_lider:
                    extra_parts.append(f"LOWER(TRIM({col_ag})) = LOWER(?)")
                    extra_params.append(grupo)

        elif seccion == "en_revision_contralor":
            # LIDER (sin CONTRALOR) + ADMIN puro: BY=ENVIADA en proceso (no cerrados, no finalizados)
            if not ((is_lider and not is_contralor_role) or is_admin_only):
                raise HTTPException(status_code=403, detail="Acceso denegado.")
            extra_parts.append(f"({by_env}) AND ({not_cerrado}) AND ({not_sep})")
            if grupo:
                if is_admin_only:
                    extra_parts.append(f"LOWER(TRIM({col_c})) = LOWER(?)")
                else:
                    extra_parts.append(f"LOWER(TRIM({col_ag})) = LOWER(?)")
                extra_params.append(grupo)

        elif seccion == "en_curso_contralor":
            # Solo CONTRALOR: non-ENVIADA, validado=1 (registros en proceso que no han llegado al contralor)
            if not is_contralor_role:
                raise HTTPException(status_code=403, detail="Acceso denegado.")
            extra_parts.append(f"NOT ({by_env}) AND ({not_cerrado}) AND ({not_sep}) AND validado = 1")
            if grupo:
                extra_parts.append(f"LOWER(TRIM({col_c})) = LOWER(?)")
                extra_params.append(grupo)

        elif seccion == "finalizados":
            if not is_admin_ctrl:
                raise HTTPException(status_code=403, detail="Acceso denegado. Solo el Contralor o Administrador puede ver los registros finalizados.")
            extra_parts.append("COALESCE(proceso_finalizado, 0) = 1")

        # Excluir registros finalizados de todas las secciones que no sean "finalizados"
        if seccion != "finalizados":
            extra_parts.append("COALESCE(proceso_finalizado, 0) = 0")

        extra_sql = " AND ".join(f"({x})" for x in extra_parts) if extra_parts else ""
        where, all_params = _build_base_where(
            vis_where, vis_params, user_sql, user_params, extra_sql, extra_params
        )

        # Para "main": incluir también registros con auditoría activa donde el usuario
        # es destinatario, aunque estén en otra sección (cerrado, sep, etc.).
        # Estos bypasean los filtros de sección pero respetan la búsqueda de texto.
        if seccion == "main":
            audit_sub = (
                "id IN ("
                "SELECT registro_id FROM auditoria_registros "
                "WHERE destinatario_usuario = ? AND estado IN ('activa','en_proceso')"
                ") AND COALESCE(proceso_finalizado, 0) = 0"
            )
            if user_sql:
                audit_branch = f"({user_sql}) AND ({audit_sub})"
                audit_extra_params = list(user_params) + [current_user]
            else:
                audit_branch = audit_sub
                audit_extra_params = [current_user]
            where = f"(({where}) OR ({audit_branch}))"
            all_params = all_params + audit_extra_params

    count_row = db.execute(f"SELECT COUNT(*) AS c FROM registros WHERE {where}", all_params).fetchone()  # nosemgrep
    total  = count_row["c"] if count_row else 0
    pages  = max(1, (total + per_page - 1) // per_page)
    page   = min(page, pages)
    offset = (page - 1) * per_page

    rows = db.execute(  # nosemgrep
        f"""SELECT * FROM registros WHERE {where}
            ORDER BY (
                CASE WHEN id IN (
                    SELECT registro_id FROM auditoria_registros
                    WHERE destinatario_usuario = ? AND estado IN ('activa','en_proceso')
                ) THEN 0 ELSE 1 END
            ), {col_n} DESC, id DESC LIMIT ? OFFSET ?""",
        all_params + [current_user, per_page, offset],
    ).fetchall()

    creator_ids = list({r["usuario"] for r in rows})
    creator_map: dict = {}
    if creator_ids:
        ph = ",".join(["?"] * len(creator_ids))
        for cr in db.execute(  # nosemgrep
            f"SELECT usuario, nombre_completo, superior_inmediato FROM usuarios WHERE usuario IN ({ph})",
            creator_ids,
        ).fetchall():
            creator_map[cr["usuario"]] = {"nombre": cr["nombre_completo"], "lider": cr["superior_inmediato"]}

    lider_ids = list({v["lider"] for v in creator_map.values() if v.get("lider")})
    lider_nombre_map: dict = {}
    if lider_ids:
        ph2 = ",".join(["?"] * len(lider_ids))
        for lr in db.execute(  # nosemgrep
            f"SELECT usuario, nombre_completo FROM usuarios WHERE usuario IN ({ph2})", lider_ids
        ).fetchall():
            lider_nombre_map[lr["usuario"]] = lr["nombre_completo"]

    activos_set = {
        r["registro_id"]
        for r in db.execute(
            "SELECT DISTINCT registro_id FROM auditoria_registros WHERE estado IN ('activa','en_proceso')"
        ).fetchall()
    }

    otra_regional_ids: set = set()
    if not is_admin_ctrl and is_lider and current_regional and seccion != "otra_regional":
        ex = db.execute(
            f"SELECT id FROM registros WHERE estado_aprobacion_n = 'pendiente'"
            f" AND UPPER(TRIM({col_c})) = UPPER(TRIM(?))"
            f" AND UPPER(TRIM({col_b})) != UPPER(TRIM({col_c}))",
            (current_regional,),
        ).fetchall()
        existing_ids = {r["id"] for r in rows}
        otra_regional_ids = {er["id"] for er in ex if er["id"] not in existing_ids}

    result = [
        _serialize_registro(
            row, sess, db, creator_map, lider_nombre_map, activos_set,
            otra_regional_ids, current_nombre, is_admin_ctrl, is_lider, current_user
        )
        for row in rows
    ]

    return {"registros": result, "total": total, "page": page, "per_page": per_page, "pages": pages}


@router.get("/api/registros/filtros-disponibles")
def filtros_disponibles(
    db=Depends(get_db),
    sess: dict = Depends(require_login),
):
    """Listas únicas de valores para los filtros desplegables (ADMIN/CONTRALOR)."""
    vis_where, vis_params = get_visibility_filter(db, sess)
    where_clause = f"WHERE {vis_where}" if vis_where else ""
    params       = list(vis_params) if vis_params else []

    col_c  = F._col("C")
    col_ag = F._col("AG")

    regiones = [
        (r[0] or "").strip()
        for r in db.execute(  # nosemgrep
            f"SELECT DISTINCT {col_c} FROM registros {where_clause} ORDER BY {col_c}", params
        ).fetchall()
        if (r[0] or "").strip()
    ]
    gestores = [
        (r[0] or "").strip()
        for r in db.execute(  # nosemgrep
            f"SELECT DISTINCT {col_ag} FROM registros {where_clause} ORDER BY {col_ag}", params
        ).fetchall()
        if (r[0] or "").strip()
    ]
    lider_rows = db.execute(
        """SELECT DISTINCT u2.usuario, u2.nombre_completo
           FROM usuarios u1
           JOIN usuarios u2 ON u1.superior_inmediato = u2.usuario
           WHERE u2.activo = 1
           ORDER BY u2.nombre_completo"""
    ).fetchall()
    lideres = [[r["usuario"], r["nombre_completo"] or r["usuario"]] for r in lider_rows]

    return {"regiones": regiones, "gestores": gestores, "lideres": lideres}


@router.get("/api/registros/verificar-acta")
def verificar_acta(
    campo: str = Query(...),
    valor: str = Query(...),
    exclude_id: int = Query(None),
    db=Depends(get_db),
    sess: dict = Depends(require_login),
):
    """Verifica si ya existe un registro con el mismo valor en AB o AK."""
    if campo not in ("AB", "AK"):
        raise HTTPException(status_code=400, detail="Campo inválido.")
    col = F._col(campo)

    conditions = [f"{col} = ?"]
    query_params: list = [valor.strip()]

    if exclude_id is not None:
        conditions.append("id != ?")
        query_params.append(exclude_id)

    where_vis, params_vis = get_visibility_filter(db, sess)
    if where_vis is not None:
        conditions.append(where_vis)
        query_params.extend(params_vis)

    row = db.execute(  # nosemgrep
        f"SELECT id FROM registros WHERE {' AND '.join(conditions)}",
        query_params,
    ).fetchone()
    return {"duplicado": row is not None}


@router.get("/api/registros/{rol}")
def listar_registros(rol: str, db=Depends(get_db), sess: dict = Depends(require_login)):
    if sess.get("is_admin"):
        fields = [{"codigo": cod, "nombre": F.CODE_TO_NOMBRE.get(cod, cod)} for cod in F.ALL_FIELD_CODES]
    else:
        fields = F.ROLES_FIELDS.get(rol, [])

    where, params = get_visibility_filter(db, sess)
    if where is None:
        rows = db.execute("SELECT * FROM registros ORDER BY id DESC").fetchall()
    else:
        rows = db.execute(  # nosemgrep
            f"SELECT * FROM registros WHERE {where} ORDER BY id DESC", params
        ).fetchall()

    result = []
    for row in rows:
        datos = []
        for field in fields:
            cod = field["codigo"]
            if cod:
                try:
                    val = row[F._col(cod)]
                except (IndexError, KeyError):
                    val = None
                if val is not None:
                    datos.append([field["nombre"], val])
        result.append({
            "id":           row["id"],
            "rol_creador":  row["rol"],
            "usuario":      row["usuario"],
            "datos":        datos,
            "fecha_creacion": row["fecha_creacion"],
        })
    return result


@router.post("/api/registros")
def guardar_registro(body: dict = Body(...), db=Depends(get_db),
                     sess: dict = Depends(require_login)):
    rol    = body.get("rol")
    campos = body.get("campos", {})
    if not rol or not campos:
        raise HTTPException(status_code=400, detail="Rol y campos son requeridos")

    if "C" not in campos and sess.get("regional"):
        campos["C"] = sess.get("regional")

    valid = {
        cod: val for cod, val in campos.items()
        if cod in F.ALL_FIELD_CODES_SET and val not in (None, "")
    }
    if not valid:
        raise HTTPException(status_code=400, detail="Complete al menos un campo válido")

    if "AB" in valid:
        ab_raw = str(valid["AB"])
        if ab_raw != ab_raw.strip() or " " in ab_raw:
            raise HTTPException(status_code=400, detail="NÚMERO ACTA CONCILIACIÓN CARTERA: no se permiten espacios en blanco.")
        if not _ACTA_RE.match(ab_raw):
            raise HTTPException(status_code=400, detail="NÚMERO ACTA CONCILIACIÓN CARTERA: formato inválido. Ejemplo: A21012026-0001")
    if "AK" in valid:
        ak_raw = str(valid["AK"])
        if ak_raw != ak_raw.strip() or " " in ak_raw:
            raise HTTPException(status_code=400, detail="N° ACTA CONCILIACIÓN FINIQUITO: no se permiten espacios en blanco.")
        if not _ACTA_RE.match(ak_raw):
            raise HTTPException(status_code=400, detail="N° ACTA CONCILIACIÓN FINIQUITO: formato inválido. Ejemplo: A21012026-0001")

    # ── Validación de duplicidad: AB y AK deben ser únicos ──
    if "AB" in valid:
        if db.execute(f"SELECT id FROM registros WHERE {F._col('AB')} = ?", (str(valid["AB"]).strip(),)).fetchone():  # nosemgrep
            raise HTTPException(status_code=409, detail="NÚMERO ACTA CONCILIACIÓN CARTERA [AB]: ya existe un registro con este valor.")
    if "AK" in valid:
        if db.execute(f"SELECT id FROM registros WHERE {F._col('AK')} = ?", (str(valid["AK"]).strip(),)).fetchone():  # nosemgrep
            raise HTTPException(status_code=409, detail="N° ACTA CONCILIACIÓN FINIQUITO [AK]: ya existe un registro con este valor.")

    # ── Validación: BY solo se puede colocar si hay valores en AK y AL ──
    if "BY" in valid and valid["BY"]:
        if not valid.get("AK") or not valid.get("AL"):
            raise HTTPException(status_code=400, detail="OBSERVACIÓN CONCILIACIÓN [BY] solo se puede colocar si hay valores en N° ACTA CONCILIACIÓN FINIQUITO [AK] y FECHA ACTA CONCILIACIÓN FINIQUITO [AL].")

        # Validación: Si AM está vacío, BY debe contener "IPS"
        am_val = valid.get("AM")
        by_val = str(valid["BY"]).upper()

        if not am_val:
            if "IPS" not in by_val:
                raise HTTPException(status_code=400, detail="Si SALDO A REMANENTE [AM] está vacío, OBSERVACIÓN CONCILIACIÓN [BY] debe contener la palabra 'IPS'.")
        else:
            # Validación: Si AM tiene valor, BY NO puede contener "IPS"
            if "IPS" in by_val:
                raise HTTPException(status_code=400, detail="Si SALDO A REMANENTE [AM] tiene valor, OBSERVACIÓN CONCILIACIÓN [BY] NO puede contener la palabra 'IPS'.")

    # ── Validación: Fechas no pueden ser futuras ──
    today_str = datetime.now().strftime("%Y-%m-%d")
    campos_fecha_max_hoy = [
        "K", "L", "N",           # Fechas existentes
        "CC", "CD",              # Fechas de soportes
        "CK", "CL", "CM", "CN", "CO", "CP", "CQ", "CR",  # Fechas de pago reales cuotas 1-8
        "DC", "DH", "DW",        # Fechas de devolución e informe
        "EF", "EG", "EH", "EI",  # Fechas de pago reales cuotas 9-12
        "ET", "EU", "EV", "EW", "EX", "EY", "EZ",  # Fechas de pago reales cuotas 13-19
        "FA", "FB", "FD", "FF",  # Fechas de pago reales cuotas 20-23
        "FH",                    # Fecha de pago real cuota 24
    ]
    nombres_fecha = {
        "K": "PERIODO RECLAMADO DESDE", "L": "PERIODO RECLAMADO HASTA", "N": "FECHA SOLICITUD CONCILIACIÓN IPS",
        "CC": "FECHA DE RECIBIDO SOPORTES", "CD": "FECHA FIRMA GIRO CHEQUE",
        "CK": "FECHA DE PAGO ACTA DE FINIQUITO", "CL": "FECHA DE PAGO 2DA CUOTA",
        "CM": "FECHA PAGO 3RA CUOTA", "CN": "FECHA PAGO 4TA CUOTA", "CO": "FECHA PAGO 5TA CUOTA",
        "CP": "FECHA PAGO 6TA CUOTA", "CQ": "FECHA PAGO 7MA CUOTA", "CR": "FECHA PAGO 8VA CUOTA",
        "DC": "FECHA DEVOLUCIÓN", "DH": "FECHA DEVOLUCIÓN 2", "DW": "FECHA INFORME PROYECCIÓN",
        "EF": "FECHA PAGO REAL 9NA CUOTA", "EG": "FECHA PAGO REAL 10MA CUOTA",
        "EH": "FECHA PAGO REAL 11VA CUOTA", "EI": "FECHA PAGO REAL 12VA CUOTA",
        "ET": "FECHA PAGO REAL 13RA CUOTA", "EU": "FECHA PAGO REAL 14TA CUOTA",
        "EV": "FECHA PAGO REAL 15TA CUOTA", "EW": "FECHA PAGO REAL 16TA CUOTA",
        "EX": "FECHA PAGO REAL 17MA CUOTA", "EY": "FECHA PAGO REAL 18VA CUOTA",
        "EZ": "FECHA PAGO REAL 19NA CUOTA", "FA": "FECHA PAGO REAL 20MA CUOTA",
        "FB": "FECHA PAGO REAL 21RA CUOTA", "FD": "FECHA PAGO REAL 22DA CUOTA",
        "FF": "FECHA PAGO REAL 23RA CUOTA", "FH": "FECHA PAGO REAL 24TA CUOTA",
    }
    for cod in campos_fecha_max_hoy:
        if cod in valid and valid[cod]:
            try:
                fecha_val = str(valid[cod]).strip()
                if fecha_val and fecha_val > today_str:
                    raise HTTPException(status_code=400, detail=f"{nombres_fecha.get(cod, cod)} [{cod}] no puede ser mayor al día de hoy.")
            except HTTPException:
                raise
            except Exception as e:
                # Ignorar errores de comparación (ej: valores no-fecha)
                logger.warning(f"Error validando fecha {cod}: {e}")

    # Validación: PRUEBAS COVID en J solo permitido cuando C = BOGOTA
    if "J" in valid and (valid.get("J") or "").strip() == "PRUEBAS COVID":
        if (valid.get("C") or "").strip().upper() != "BOGOTA":
            raise HTTPException(
                status_code=400,
                detail="La opción 'PRUEBAS COVID' en CONCEPTO [J] solo está disponible para la ciudad BOGOTA."
            )

    # Validación: orden estricto entre pares de fechas
    _fecha_orden_pares_create = [("N", "O"), ("O", "P"), ("P", "Q"), ("AM", "BJ"), ("N", "CG")]
    _fecha_orden_nombres_nopq = {
        "N":  "FECHA SOLICITUD CONCILIACIÓN IPS",
        "O":  "FECHA DE ENVÍO ANALISIS CARTERA A IPS",
        "P":  "FECHA DEL ACTA DE CARTERA",
        "Q":  "FECHA FIRMA DE ACTA DE CONCILIACION DE CARTERA",
        "AL": "FECHA DE ELABORACIÓN ACTA DE FINIQUITO",
        "AM": "FECHA FIRMA DE ACTA DE CONCILIACION FINIQUITO",
        "BJ": "FECHA TENTATIVA 1RA CUOTA",
        "CG": "MES CIERRE",
    }
    for _cod_menor, _cod_mayor in _fecha_orden_pares_create:
        _v_menor = (valid.get(_cod_menor) or "").strip()
        _v_mayor = (valid.get(_cod_mayor) or "").strip()
        if _v_menor and _v_mayor and _v_mayor <= _v_menor:
            raise HTTPException(
                status_code=400,
                detail=f"{_fecha_orden_nombres_nopq[_cod_mayor]} [{_cod_mayor}] debe ser mayor a {_fecha_orden_nombres_nopq[_cod_menor]} [{_cod_menor}]."
            )
    # AM >= AL (mismo día permitido)
    _al_c = (valid.get("AL") or "").strip()
    _am_c = (valid.get("AM") or "").strip()
    if _al_c and _am_c and _am_c < _al_c:
        raise HTTPException(
            status_code=400,
            detail=f"{_fecha_orden_nombres_nopq['AM']} [AM] debe ser mayor o igual a {_fecha_orden_nombres_nopq['AL']} [AL]."
        )

    cols         = ", ".join(F._col(cod) for cod in valid)
    placeholders = ", ".join("?" for _ in valid)
    values       = list(valid.values())

    db.execute(  # nosemgrep
        f"INSERT INTO registros (rol, usuario, fecha_creacion, {cols}) VALUES (?, ?, ?, {placeholders})",
        (rol, sess["usuario"], datetime.now().isoformat(), *values),
    )
    # No commit aquí: mantenemos INSERT + lastval + UPDATE en la misma transacción
    new_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]

    # Generar consecutivo campo A
    consecutivo_generado = None
    ciudad_c = valid.get("C", "").strip().upper()
    if ciudad_c:
        campo_a_enviado = (valid.get("A") or "").strip()
        codigo_ciudad   = None
        anio            = datetime.now().year

        if campo_a_enviado and campo_a_enviado.endswith("-"):
            prefijo_sin_guion = campo_a_enviado.rstrip("-")
            anio_str = str(anio)
            if prefijo_sin_guion.endswith(anio_str):
                codigo_ciudad = prefijo_sin_guion[: -len(anio_str)]

        if not codigo_ciudad:
            row_cc = db.execute(
                "SELECT codigo FROM ciudad_codigos WHERE UPPER(ciudad) = ? AND activo = 1 ORDER BY codigo LIMIT 1",
                (ciudad_c,),
            ).fetchone()
            if row_cc:
                codigo_ciudad = row_cc["codigo"]

        if codigo_ciudad:
            patron       = f"{codigo_ciudad}{anio}-%"
            patron_glosa = f"{codigo_ciudad}{anio}-%-%"   # excluir glosas derivadas (p.ej. C2026-0003-1)
            col_a        = F._col("A")
            # Excluir la fila recién insertada (que aún tiene el prefijo incompleto)
            # y las glosas derivadas (tienen un segundo guión), para calcular el
            # siguiente número basado sólo en consecutivos base ya confirmados.
            max_row = db.execute(
                f"SELECT {col_a} FROM registros"
                f" WHERE {col_a} LIKE ? AND {col_a} NOT LIKE ? AND id != ?"
                f" ORDER BY {col_a} DESC LIMIT 1",
                (patron, patron_glosa, new_id),
            ).fetchone()
            siguiente = 1
            if max_row and max_row[0]:
                try:
                    siguiente = int(max_row[0].split("-")[-1]) + 1
                except (ValueError, IndexError):
                    siguiente = 1
            consecutivo_generado = f"{codigo_ciudad}{anio}-{siguiente:04d}"
            db.execute(f"UPDATE registros SET {col_a} = ? WHERE id = ?", (consecutivo_generado, new_id))  # nosemgrep
            logger.info("[CONSECUTIVO] id=%s ciudad_c=%s codigo_ciudad=%s consecutivo=%s",
                        new_id, ciudad_c, codigo_ciudad, consecutivo_generado)

    if consecutivo_generado is None:
        logger.warning("[CONSECUTIVO] No generado — id=%s ciudad_c=%r campo_a=%r",
                       new_id, ciudad_c, valid.get("A"))

    # Notificaciones
    creator = sess["usuario"]
    creator_row = db.execute(
        "SELECT nombre_completo, superior_inmediato, regional FROM usuarios WHERE usuario = ?",
        (creator,)
    ).fetchone()
    nit_val    = valid.get("E", "")
    nombre_val = valid.get("I", "")
    ref        = nombre_val or (f"NIT {nit_val}" if nit_val else f"Registro #{new_id}")
    ciudad_responsable = valid.get("C", "").strip()  # campo C (CIUDAD_RESPONSABLE) controla responsabilidad
    creator_nombre     = creator_row["nombre_completo"] if creator_row else creator
    already_notified: set = set()

    if creator_row:
        lider = creator_row["superior_inmediato"]
        if lider and lider != creator:
            sup_info = db.execute(
                """SELECT perm_contralor, perm_lider, perm_coordinador, regional
                   FROM usuarios WHERE usuario = ? AND activo = 1""",
                (lider,),
            ).fetchone()
            skip_n1 = False
            if sup_info:
                if sup_info["perm_contralor"]:
                    skip_n1 = True
                elif ciudad_responsable and (sup_info["perm_lider"] or sup_info["perm_coordinador"]):
                    if (sup_info["regional"] or "").strip().upper() == ciudad_responsable.upper():
                        skip_n1 = True
            if not skip_n1:
                crear_notificacion(db, lider, "nuevo_registro_equipo",
                    f"{creator_nombre} creó un nuevo registro: {ref} (ID: {new_id})", new_id)
                already_notified.add(lider)
        elif not lider:
            creator_regional = (creator_row["regional"] or "").strip()
            if creator_regional:
                contralores = db.execute(
                    """SELECT usuario FROM usuarios
                       WHERE activo = 1 AND perm_contralor = 1
                         AND UPPER(regional) = UPPER(?) AND usuario != ?""",
                    (creator_regional, creator),
                ).fetchall()
                for ct in contralores:
                    if ct["usuario"] not in already_notified:
                        crear_notificacion(db, ct["usuario"], "nuevo_registro_equipo",
                            f"{creator_nombre} creó un nuevo registro: {ref} (ID: {new_id})", new_id)
                        already_notified.add(ct["usuario"])

    if "AG" in valid:
        resp_row = db.execute(
            "SELECT usuario FROM usuarios WHERE nombre_completo = ? AND activo = 1",
            (valid["AG"],)
        ).fetchone()
        # No notificar si N requiere aprobación — se enviará al aprobar
        _n_val_notif = (valid.get("N") or "").strip()
        if resp_row and resp_row["usuario"] != creator and not _n_requiere_aprobacion(_n_val_notif):
            crear_notificacion(db, resp_row["usuario"], "asignacion_responsable",
                f"Fuiste asignado como Responsable de Conciliación en el registro {ref} (ID: {new_id})",
                new_id)

    if ciudad_responsable:
        lideres_coords = db.execute(
            """SELECT usuario FROM usuarios
               WHERE activo = 1 AND (perm_lider = 1 OR perm_coordinador = 1)
                 AND perm_contralor = 0 AND UPPER(regional) = UPPER(?) AND usuario != ?""",
            (ciudad_responsable, creator),
        ).fetchall()
        for lc in lideres_coords:
            if lc["usuario"] not in already_notified:
                crear_notificacion(db, lc["usuario"], "nuevo_registro_ciudad",
                    f"Nuevo registro en {ciudad_responsable}: {ref} (ID: {new_id}), creado por {creator_nombre}.",
                    new_id)
                already_notified.add(lc["usuario"])

    # ── Política de aprobación: N con más de 14 días requiere aprobación del líder ──
    _n_val_create = (valid.get("N") or "").strip()
    _comentario_solicitud_n = (body.get("comentario_solicitud_n") or "").strip()
    if _n_requiere_aprobacion(_n_val_create):
        db.execute(
            "UPDATE registros SET estado_aprobacion_n=?, comentario_solicitud_n=?, origen_pendiente_n=? WHERE id=?",
            ("pendiente", _comentario_solicitud_n, "create", new_id)
        )
        db.execute(
            "INSERT INTO aprobacion_n_log (registro_id, accion, usuario, comentario, fecha) VALUES (?,?,?,?,?)",
            (new_id, "solicitud", sess["usuario"], _comentario_solicitud_n, datetime.now().isoformat())
        )
        db.commit()
        _notificar_lider_aprobacion_n(
            db, new_id, consecutivo_generado or f"#{new_id}",
            creator, creator_nombre, _comentario_solicitud_n,
            regional_b=valid.get("C", "").strip()
        )

    db.commit()
    return {"mensaje": "Registro guardado exitosamente", "id": new_id, "consecutivo": consecutivo_generado}


@router.get("/api/registro/{id}")
def get_registro(id: int, db=Depends(get_db), sess: dict = Depends(require_login)):
    row = db.execute("SELECT * FROM registros WHERE id = ?", (id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    if not sess.get("is_admin"):
        where, params = get_visibility_filter(db, sess)
        if where is not None:
            match = db.execute(  # nosemgrep
                f"SELECT id FROM registros WHERE id = ? AND {where}", (id, *params)
            ).fetchone()
            if not match:
                raise HTTPException(status_code=403, detail="Acceso denegado. No puede ver este registro.")

    campos: dict = {}
    for cod in F.ALL_FIELD_CODES:
        try:
            val = row[F._col(cod)]
        except (IndexError, KeyError):
            val = None
        if val is not None:
            campos[cod] = val

    # Campos de validación (pueden no existir en DBs más antiguas)
    try: validado = bool(row["validado"])
    except (KeyError, IndexError): validado = False
    try: fecha_validacion = row["fecha_validacion"]
    except (KeyError, IndexError): fecha_validacion = None
    try: validado_por_usr = row["validado_por"]
    except (KeyError, IndexError): validado_por_usr = None

    validado_por_nombre = None
    if validado_por_usr:
        vp = db.execute(
            "SELECT nombre_completo FROM usuarios WHERE usuario = ? AND activo = 1",
            (validado_por_usr,)
        ).fetchone()
        validado_por_nombre = vp["nombre_completo"] if vp else validado_por_usr

    def _get_int_col(col_name):
        try:
            return int(row[col_name] or 0)
        except (KeyError, IndexError, TypeError, ValueError):
            return 0

    return {
        "id":                   row["id"],
        "rol":                  row["rol"],
        "usuario":              row["usuario"],
        "fecha_creacion":       row["fecha_creacion"],
        "campos":               campos,
        "can_edit":             can_edit_registro(row, sess, db),
        "ciudad_resp":          _ciudad_del_registro(row),
        "validado":             validado,
        "fecha_validacion":     fecha_validacion,
        "validado_por":         validado_por_nombre or validado_por_usr,
        "reapertura_lider_ac":  _get_int_col("reapertura_lider_ac"),
        "reapertura_lider_bd":  _get_int_col("reapertura_lider_bd"),
        "reapertura_lider_ce":  _get_int_col("reapertura_lider_ce"),
        "estado_aprobacion_n":               _safe_str(row, "estado_aprobacion_n"),
        "comentario_solicitud_n":            _safe_str(row, "comentario_solicitud_n"),
        "comentario_rechazo_n":              _safe_str(row, "comentario_rechazo_n"),
        "comentario_aprobacion_contralor_n": _safe_str(row, "comentario_aprobacion_contralor_n"),
        "origen_pendiente_n":               _safe_str(row, "origen_pendiente_n"),
        "proceso_finalizado":               _get_int_col("proceso_finalizado"),
    }


@router.post("/api/registro/{id}/finalizar")
def finalizar_registro(id: int, db=Depends(get_db), sess: dict = Depends(require_login)):
    """Marca un registro como proceso finalizado.
    Permitido para: CONTRALOR, ADMIN, y LIDER con acceso extendido activo.
    """
    row = db.execute("SELECT * FROM registros WHERE id = ?", (id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    is_admin_ctrl = sess.get("is_admin") or "CONTRALOR" in sess.get("permisos", [])
    _lider_ext_fin = (
        "LIDER" in sess.get("permisos", [])
        and "CONTRALOR" not in sess.get("permisos", [])
        and not sess.get("is_admin", False)
        and _lider_tiene_acceso_contralor(db, row)
    )
    if not is_admin_ctrl and not _lider_ext_fin:
        raise HTTPException(
            status_code=403,
            detail="Solo el Contralor, Administrador o Líder con acceso extendido puede finalizar registros."
        )

    db.execute("UPDATE registros SET proceso_finalizado = 1 WHERE id = ?", (id,))
    db.commit()

    # Notificación especial a todos los CONTRALOR cuando el LIDER finaliza
    if _lider_ext_fin:
        _consec_f_row = db.execute(  # nosemgrep
            f"SELECT {F._col('A')} FROM registros WHERE id = ?", (id,)
        ).fetchone()
        _consec_f = (_consec_f_row[0] if _consec_f_row else None) or f"#{id}"
        _lider_f_row = db.execute(
            "SELECT nombre_completo FROM usuarios WHERE usuario = ? AND activo = 1",
            (sess["usuario"],)
        ).fetchone()
        _lider_f_nombre = _lider_f_row["nombre_completo"] if _lider_f_row else sess["usuario"]
        _msg_f = (
            f"[ACCESO EXTENDIDO LIDER - PROCESO FINALIZADO] El Líder {_lider_f_nombre} "
            f"finalizó el proceso del registro {_consec_f} (ID: {id}) "
            f"usando acceso extendido de Contralor."
        )
        for _ctrl_f in db.execute(
            "SELECT usuario FROM usuarios WHERE activo = 1 AND perm_contralor = 1"
        ).fetchall():
            crear_notificacion(db, _ctrl_f["usuario"], "lider_acceso_extendido", _msg_f, id)
        db.commit()

    return {"ok": True, "message": "Registro finalizado correctamente."}


@router.post("/api/registro/{id}/reabrir")
def reabrir_registro(id: int, body: dict = Body(...), db=Depends(get_db),
                     sess: dict = Depends(require_login)):
    """Reabre un registro cerrado: establece AC/BD/CE a 'EN TRAMITE' y limpia CF/CG.
    Solo LIDER (máx. 1 vez) y CONTRALOR/ADMIN (sin límite).
    """
    _permisos = sess.get("permisos", [])
    _es_lider       = "LIDER"     in _permisos and not sess.get("is_admin") and "CONTRALOR" not in _permisos
    _es_contralor   = "CONTRALOR" in _permisos or sess.get("is_admin")

    if not _es_lider and not _es_contralor:
        raise HTTPException(status_code=403, detail="Solo LIDER o CONTRALOR pueden reabrir registros.")

    motivo = (body.get("motivo") or "").strip()
    if not motivo:
        raise HTTPException(status_code=400, detail="El motivo de reapertura es obligatorio.")

    row = db.execute("SELECT * FROM registros WHERE id = ?", (id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")

    # Verificar que el registro realmente está en cierre
    _AC_CIERRE = {"CERRADO POR CANCELACION DE MESA","CERRADO POR CANCELACION DE MESAS","CERRADO SIN FINALIZACIÓN","IPS NO ASISTE A MESAS"}
    _BD_CIERRE = {"CERRADO SIN FINALIZACION"}
    _CE_CIERRE = {"CERRADO POR CANCELACION DE MESAS","CERRADO SIN FINALIZACIÓN"}
    def _gv(col):
        try: return (row[col] or "").strip()
        except (KeyError, IndexError): return ""
    _ac_val = _gv(F._col("AC"))
    _bd_val = _gv(F._col("BD"))
    _ce_val = _gv(F._col("CE"))
    if _ac_val not in _AC_CIERRE and _bd_val not in _BD_CIERRE and _ce_val not in _CE_CIERRE:
        raise HTTPException(status_code=400, detail="El registro no está en estado cerrado.")

    # LIDER: verificar límite de 1 reapertura
    if _es_lider:
        def _get_rc(col):
            try: return int(row[col] or 0)
            except (KeyError, IndexError, TypeError, ValueError): return 0
        if max(_get_rc("reapertura_lider_ac"), _get_rc("reapertura_lider_bd"), _get_rc("reapertura_lider_ce")) >= 1:
            raise HTTPException(status_code=400, detail="Ya utilizó su única reapertura disponible para este registro.")

    # Ejecutar reapertura: AC/BD/CE → EN TRAMITE, CF/CG → NULL
    _ac_col = F._col("AC"); _bd_col = F._col("BD"); _ce_col = F._col("CE")
    _cf_col = F._col("CF"); _cg_col = F._col("CG")
    db.execute(  # nosemgrep
        f"UPDATE registros SET {_ac_col}=?, {_bd_col}=?, {_ce_col}=?, {_cf_col}=NULL, {_cg_col}=NULL WHERE id=?",
        ("EN TRAMITE", "EN TRAMITE", "EN TRAMITE", id)
    )
    db.commit()

    # Incrementar contador LIDER
    if _es_lider:
        db.execute(
            "UPDATE registros SET "
            "reapertura_lider_ac = COALESCE(reapertura_lider_ac,0)+1, "
            "reapertura_lider_bd = COALESCE(reapertura_lider_bd,0)+1, "
            "reapertura_lider_ce = COALESCE(reapertura_lider_ce,0)+1 "
            "WHERE id = ?", (id,)
        )
        db.commit()

    # Auditoría
    _valid_reap = {"AC": "EN TRAMITE", "BD": "EN TRAMITE", "CE": "EN TRAMITE", "CF": None, "CG": None}
    _registrar_audit(db, id, "reapertura", row, _valid_reap, True, sess, motivo=motivo)
    db.commit()

    # Notificar a todos los CONTRALOR activos
    _reap_user_row = db.execute(
        "SELECT nombre_completo FROM usuarios WHERE usuario = ? AND activo = 1",
        (sess.get("usuario", ""),)
    ).fetchone()
    _reap_nombre = (_reap_user_row["nombre_completo"] if _reap_user_row else sess.get("usuario", "?"))
    _consec_row = db.execute(f"SELECT {F._col('A')} FROM registros WHERE id = ?", (id,)).fetchone()  # nosemgrep
    _consec = (_consec_row[0] if _consec_row else None) or f"#{id}"
    _msg = (
        f"[REAPERTURA] El registro {_consec} (ID: {id}) fue reabierto por {_reap_nombre}.\n"
        f"AC, BD y CE se establecieron a EN TRAMITE. CF y CG fueron limpiados.\n"
        f"Motivo: {motivo}"
    )
    for _ctrl in db.execute(
        "SELECT usuario FROM usuarios WHERE activo = 1 AND perm_contralor = 1"
    ).fetchall():
        crear_notificacion(db, _ctrl["usuario"], "reapertura_registro", _msg, id)
    db.commit()

    return {"mensaje": "Registro reabierto exitosamente."}


# ── Aprobación de Fecha N ────────────────────────────────────────────────────

@router.post("/api/registro/{id}/aprobar-n")
def aprobar_fecha_n(id: int, body: dict = Body(...), db=Depends(get_db),
                    sess: dict = Depends(require_login)):
    """Líder aprueba la solicitud pendiente de Fecha de Solicitud [N]."""
    _permisos = sess.get("permisos", [])
    if "LIDER" not in _permisos and "CONTRALOR" not in _permisos and not sess.get("is_admin"):
        raise HTTPException(status_code=403, detail="Solo el Líder puede aprobar solicitudes de Fecha de Solicitud.")

    comentario = (body.get("comentario") or "").strip()

    row = db.execute("SELECT * FROM registros WHERE id = ?", (id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")

    if _safe_str(row, "estado_aprobacion_n") != "pendiente":
        raise HTTPException(status_code=400, detail="El registro no está en estado pendiente de aprobación.")

    db.execute("UPDATE registros SET estado_aprobacion_n='aprobado' WHERE id=?", (id,))
    db.execute(
        "INSERT INTO aprobacion_n_log (registro_id, accion, usuario, comentario, fecha) VALUES (?,?,?,?,?)",
        (id, "aprobacion_lider", sess["usuario"], comentario, datetime.now().isoformat())
    )
    db.commit()

    _consec_row = db.execute(f"SELECT {F._col('A')} FROM registros WHERE id=?", (id,)).fetchone()  # nosemgrep
    _consec = (_consec_row[0] if _consec_row else None) or f"#{id}"
    _apr_row = db.execute("SELECT nombre_completo FROM usuarios WHERE usuario=? AND activo=1", (sess["usuario"],)).fetchone()
    _apr_nombre = _apr_row["nombre_completo"] if _apr_row else sess["usuario"]
    _msg = (
        f"Tu solicitud de Fecha de Solicitud [N] para el registro {_consec} (ID: {id}) "
        f"fue APROBADA por {_apr_nombre}."
    )
    if comentario:
        _msg += f"\nComentario: {comentario}"
    crear_notificacion(db, row["usuario"], "aprobacion_fecha_n", _msg, id)

    # Notificación diferida de asignación: avisar al AG ahora que fue aprobado
    _ag_nombre_apr = _safe_str(row, F._col("AG"))
    if _ag_nombre_apr:
        _ag_user_row = db.execute(
            "SELECT usuario FROM usuarios WHERE nombre_completo=? AND activo=1",
            (_ag_nombre_apr,)
        ).fetchone()
        if _ag_user_row and _ag_user_row["usuario"] != row["usuario"]:
            _nit_apr  = _safe_str(row, F._col("E"))
            _nom_apr  = _safe_str(row, F._col("I"))
            _con_apr  = _safe_str(row, F._col("A")) or f"#{id}"
            _ref_apr  = _nom_apr or (f"NIT {_nit_apr}" if _nit_apr else _con_apr)
            crear_notificacion(
                db, _ag_user_row["usuario"], "asignacion_responsable",
                f"Fuiste asignado como Responsable de Conciliación en el registro {_ref_apr} (ID: {id})",
                id
            )

    db.commit()

    return {"mensaje": "Solicitud aprobada exitosamente."}


@router.post("/api/registro/{id}/rechazar-n")
def rechazar_fecha_n(id: int, body: dict = Body(...), db=Depends(get_db),
                     sess: dict = Depends(require_login)):
    """Líder rechaza la solicitud pendiente de Fecha de Solicitud [N]."""
    _permisos = sess.get("permisos", [])
    if "LIDER" not in _permisos and "CONTRALOR" not in _permisos and not sess.get("is_admin"):
        raise HTTPException(status_code=403, detail="Solo el Líder puede rechazar solicitudes de Fecha de Solicitud.")

    comentario = (body.get("comentario") or "").strip()
    if not comentario:
        raise HTTPException(status_code=400, detail="El comentario de rechazo es obligatorio.")

    row = db.execute("SELECT * FROM registros WHERE id = ?", (id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")

    if _safe_str(row, "estado_aprobacion_n") != "pendiente":
        raise HTTPException(status_code=400, detail="El registro no está en estado pendiente de aprobación.")

    db.execute(
        "UPDATE registros SET estado_aprobacion_n='rechazado', comentario_rechazo_n=? WHERE id=?",
        (comentario, id)
    )
    db.execute(
        "INSERT INTO aprobacion_n_log (registro_id, accion, usuario, comentario, fecha) VALUES (?,?,?,?,?)",
        (id, "rechazo_lider", sess["usuario"], comentario, datetime.now().isoformat())
    )
    db.commit()

    _consec_row = db.execute(f"SELECT {F._col('A')} FROM registros WHERE id=?", (id,)).fetchone()  # nosemgrep
    _consec = (_consec_row[0] if _consec_row else None) or f"#{id}"
    _rej_row = db.execute("SELECT nombre_completo FROM usuarios WHERE usuario=? AND activo=1", (sess["usuario"],)).fetchone()
    _rej_nombre = _rej_row["nombre_completo"] if _rej_row else sess["usuario"]
    _msg = (
        f"Tu solicitud de Fecha de Solicitud [N] para el registro {_consec} (ID: {id}) "
        f"fue RECHAZADA por {_rej_nombre}.\nMotivo: {comentario}"
    )
    crear_notificacion(db, row["usuario"], "rechazo_fecha_n", _msg, id)
    db.commit()

    return {"mensaje": "Solicitud rechazada."}


@router.post("/api/registro/{id}/cancelar-n")
def cancelar_fecha_n(id: int, db=Depends(get_db), sess: dict = Depends(require_login)):
    """Gestor cancela su propia solicitud pendiente de Fecha de Solicitud [N]."""
    row = db.execute("SELECT * FROM registros WHERE id = ?", (id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")

    if row["usuario"] != sess["usuario"] and not sess.get("is_admin"):
        raise HTTPException(status_code=403, detail="Solo el creador del registro puede cancelar la solicitud.")

    if _safe_str(row, "estado_aprobacion_n") != "pendiente":
        raise HTTPException(status_code=400, detail="El registro no está en estado pendiente.")

    _origen = _safe_str(row, "origen_pendiente_n")

    if _origen == "create":
        # Registro nuevo pendiente: marcar como cancelado
        db.execute("UPDATE registros SET estado_aprobacion_n='cancelado' WHERE id=?", (id,))
    else:
        # Registro existente: revertir N al valor anterior
        _n_anterior = _safe_str(row, "n_valor_anterior")
        _n_col = F._col("N")
        if _n_anterior:
            db.execute(
                f"UPDATE registros SET {_n_col}=?, estado_aprobacion_n=NULL, "
                "n_valor_anterior=NULL, origen_pendiente_n=NULL, comentario_solicitud_n=NULL WHERE id=?",
                (_n_anterior, id)
            )
        else:
            db.execute(
                f"UPDATE registros SET {_n_col}=NULL, estado_aprobacion_n=NULL, "
                "n_valor_anterior=NULL, origen_pendiente_n=NULL, comentario_solicitud_n=NULL WHERE id=?",
                (id,)
            )

    db.execute(
        "INSERT INTO aprobacion_n_log (registro_id, accion, usuario, comentario, fecha) VALUES (?,?,?,?,?)",
        (id, "cancelacion_gestor", sess["usuario"], "", datetime.now().isoformat())
    )
    db.commit()
    return {"mensaje": "Solicitud cancelada."}


@router.post("/api/registro/{id}/reactivar-n")
def reactivar_fecha_n(id: int, body: dict = Body(...), db=Depends(get_db),
                      sess: dict = Depends(require_login)):
    """Contralor/Admin re-aprueba un registro rechazado por Fecha de Solicitud [N]."""
    if "CONTRALOR" not in sess.get("permisos", []) and not sess.get("is_admin"):
        raise HTTPException(status_code=403, detail="Solo el Contralor puede re-aprobar registros rechazados.")

    comentario = (body.get("comentario") or "").strip()
    if not comentario:
        raise HTTPException(status_code=400, detail="El comentario de re-aprobación es obligatorio.")

    row = db.execute("SELECT * FROM registros WHERE id = ?", (id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")

    if _safe_str(row, "estado_aprobacion_n") != "rechazado":
        raise HTTPException(status_code=400, detail="El registro no está en estado rechazado.")

    db.execute(
        "UPDATE registros SET estado_aprobacion_n='aprobado', comentario_aprobacion_contralor_n=? WHERE id=?",
        (comentario, id)
    )
    db.execute(
        "INSERT INTO aprobacion_n_log (registro_id, accion, usuario, comentario, fecha) VALUES (?,?,?,?,?)",
        (id, "aprobacion_contralor", sess["usuario"], comentario, datetime.now().isoformat())
    )
    db.commit()

    _consec_row = db.execute(f"SELECT {F._col('A')}, {F._col('AG')} FROM registros WHERE id=?", (id,)).fetchone()  # nosemgrep
    _consec    = (_consec_row[0] if _consec_row else None) or f"#{id}"
    _ag_nombre = (_consec_row[1] or "").strip() if _consec_row else ""
    _ctrl_row  = db.execute("SELECT nombre_completo FROM usuarios WHERE usuario=? AND activo=1", (sess["usuario"],)).fetchone()
    _ctrl_nombre = _ctrl_row["nombre_completo"] if _ctrl_row else sess["usuario"]
    _msg = (
        f"El registro {_consec} (ID: {id}) fue RE-APROBADO por el Contralor {_ctrl_nombre}.\n"
        f"Comentario: {comentario}"
    )

    # Notificar al responsable (AG)
    if _ag_nombre:
        _resp_row = db.execute(
            "SELECT usuario FROM usuarios WHERE nombre_completo=? AND activo=1", (_ag_nombre,)
        ).fetchone()
        if _resp_row:
            crear_notificacion(db, _resp_row["usuario"], "reactivacion_fecha_n", _msg, id)

    # Notificar al líder del creador
    _creator_row = db.execute(
        "SELECT superior_inmediato FROM usuarios WHERE usuario=? AND activo=1", (row["usuario"],)
    ).fetchone()
    if _creator_row and _creator_row["superior_inmediato"]:
        _lider = (_creator_row["superior_inmediato"] or "").strip()
        if _lider:
            crear_notificacion(db, _lider, "reactivacion_fecha_n", _msg, id)

    db.commit()
    return {"mensaje": "Registro re-aprobado exitosamente."}


@router.get("/api/registro/{id}/historial-n")
def historial_fecha_n(id: int, db=Depends(get_db), sess: dict = Depends(require_login)):
    """Retorna el historial completo de acciones de aprobación N para un registro."""
    rows = db.execute(
        "SELECT accion, usuario, comentario, fecha FROM aprobacion_n_log "
        "WHERE registro_id=? ORDER BY fecha ASC",
        (id,)
    ).fetchall()
    return [
        {
            "accion":     _safe_str(r, "accion"),
            "usuario":    _safe_str(r, "usuario"),
            "comentario": _safe_str(r, "comentario"),
            "fecha":      _safe_str(r, "fecha"),
        }
        for r in rows
    ]


@router.post("/api/registro/{id}/validar")
def validar_registro(id: int, db=Depends(get_db), sess: dict = Depends(require_login)):
    """Marca el registro como validado. Solo puede hacerlo el gestor asignado (AG)."""
    row = db.execute("SELECT * FROM registros WHERE id = ?", (id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    try: ya_validado = bool(row["validado"])
    except (KeyError, IndexError): ya_validado = False
    if ya_validado:
        raise HTTPException(status_code=400, detail="El registro ya fue validado.")

    usuario = sess["usuario"]
    me_row  = db.execute(
        "SELECT nombre_completo FROM usuarios WHERE usuario = ? AND activo = 1", (usuario,)
    ).fetchone()
    nombre_completo = (me_row["nombre_completo"] or "").strip() if me_row else None

    ag_col = F._col("AG")
    try: ag_val = (row[ag_col] or "").strip()
    except (KeyError, IndexError): ag_val = ""

    # Puede validar: el gestor asignado (AG = su nombre) O el LIDER O el ADMIN
    _is_lider_or_admin = ("LIDER" in (sess.get("permisos") or [])) or sess.get("is_admin")
    _es_responsable    = nombre_completo and ag_val.lower() == nombre_completo.lower()
    if not _es_responsable and not _is_lider_or_admin:
        raise HTTPException(
            status_code=403,
            detail="Solo el gestor asignado (Responsable de Conciliación) o el Líder pueden validar el registro."
        )

    fecha = datetime.now().isoformat()
    db.execute(
        "UPDATE registros SET validado = 1, fecha_validacion = ?, validado_por = ? WHERE id = ?",
        (fecha, usuario, id)
    )
    db.commit()
    return {
        "mensaje":          "Registro validado exitosamente",
        "fecha_validacion": fecha,
        "validado_por":     nombre_completo or usuario,
    }


def _ciudad_del_registro(row):
    try:
        return row[F._col("C")] or None
    except (IndexError, KeyError):
        return None


@router.put("/api/registro/{id}")
def actualizar_registro(id: int, body: dict = Body(...), db=Depends(get_db),
                        sess: dict = Depends(require_login)):
    campos             = body.get("campos", {})
    motivo_devolucion  = (body.get("motivo_devolucion") or "").strip()
    motivo_cierre      = (body.get("motivo_cierre") or "").strip()
    if not campos:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    row = db.execute("SELECT * FROM registros WHERE id = ?", (id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    # ── Acceso extendido LIDER→CONTRALOR: LIDER puro (no CONTRALOR, no ADMIN)
    # cuando BY=ENVIADA y campo_moneda ≤ umbral configurado por el admin.
    _lider_acceso_extendido = (
        "LIDER" in sess.get("permisos", [])
        and "CONTRALOR" not in sess.get("permisos", [])
        and not sess.get("is_admin", False)
        and _lider_tiene_acceso_contralor(db, row)
    )

    if not sess.get("is_admin"):
        where, params = get_visibility_filter(db, sess)
        if where is not None:
            match = db.execute(  # nosemgrep
                f"SELECT id FROM registros WHERE id = ? AND {where}", (id, *params)
            ).fetchone()
            if not match:
                raise HTTPException(status_code=403, detail="Acceso denegado. No puede ver este registro.")
        if not can_edit_registro(row, sess, db):
            _estado_n_upd = _safe_str(row, "estado_aprobacion_n")
            if _estado_n_upd == "pendiente":
                msg = "El registro está pendiente de aprobación de Fecha de Solicitud [N]. No se puede modificar."
            elif _estado_n_upd == "rechazado":
                msg = "El registro fue rechazado por Fecha de Solicitud [N]. Solo el Contralor puede modificarlo."
            elif _estado_n_upd == "cancelado":
                msg = "El registro fue cancelado. No se puede modificar."
            else:
                msg = "No tiene permiso para editar este registro."
            raise HTTPException(status_code=403, detail=msg)

    # Cuando el LIDER tiene acceso extendido, puede editar campos de CONTRALOR.
    _lider_roles = (
        ["GESTOR 1", "GESTOR 2", "LIDER", "CONTRALOR"] if _lider_acceso_extendido
        else ["GESTOR 1", "GESTOR 2", "LIDER"]
    )
    _HIERARCHY_EXPAND = {
        "CONTRALOR": ["GESTOR 1", "GESTOR 2", "LIDER", "CONTRALOR"],
        "LIDER":     _lider_roles,
        "GESTOR 2":  ["GESTOR 1", "GESTOR 2"],
        "GESTOR 1":  ["GESTOR 1"],
    }
    if sess.get("is_admin"):
        allowed_roles = list(F.ROLES_FIELDS.keys())
    else:
        expanded: set = set()
        for r in sess.get("permisos", []):
            expanded.update(_HIERARCHY_EXPAND.get(r, [r]))
        allowed_roles = list(expanded)

    allowed_codes: set = set()
    for r in allowed_roles:
        for f in F.ROLES_FIELDS.get(r, []):
            allowed_codes.add(f["codigo"])

    valid = {
        cod: val for cod, val in campos.items()
        if cod in F.ALL_FIELD_CODES_SET and cod in allowed_codes and val not in (None, "")
    }
    valid.pop("DT", None)

    # ── Protecciones por estado de validación ──────────────────────────────────
    _is_lider_ctrl = (
        sess.get("is_admin")
        or "LIDER"     in sess.get("permisos", [])
        or "CONTRALOR" in sess.get("permisos", [])
    )
    try:    _reg_validado = bool(row["validado"])
    except (KeyError, IndexError): _reg_validado = False

    # Si validado y no es líder/contralor/admin → bloquear todos los campos de GESTOR 1
    if _reg_validado and not _is_lider_ctrl:
        _g1_codes = {f["codigo"] for f in F.ROLES_FIELDS.get("GESTOR 1", [])}
        for _c in list(_g1_codes):
            valid.pop(_c, None)

    # Campo AG (Responsable): el gestor asignado nunca puede cambiarlo;
    # el creador solo puede hacerlo antes de validar; luego solo líder/contralor.
    if "AG" in valid and not _is_lider_ctrl:
        _ag_db = F._col("AG")
        try:    _ag_actual = (row[_ag_db] or "").strip()
        except (KeyError, IndexError): _ag_actual = ""
        _me2 = db.execute(
            "SELECT nombre_completo FROM usuarios WHERE usuario = ? AND activo = 1",
            (sess["usuario"],)
        ).fetchone()
        _mi_nombre = _me2["nombre_completo"] if _me2 else None
        # Bloquear si soy el gestor asignado O si el registro ya está validado
        if (_mi_nombre and _ag_actual == _mi_nombre) or _reg_validado:
            valid.pop("AG", None)

    if not valid:
        raise HTTPException(status_code=400, detail="No hay campos permitidos para actualizar.")

    def _changed_from_db(code):
        """True only if code is in the payload AND its value differs from the DB row."""
        if code not in valid:
            return False
        col = F._col(code)
        try:
            db_val = str(row[col] or "").strip()
        except (KeyError, IndexError):
            db_val = ""
        return str(valid.get(code) or "").strip() != db_val

    if "AB" in valid and _changed_from_db("AB"):
        ab_raw = str(valid["AB"])
        if ab_raw != ab_raw.strip() or " " in ab_raw:
            raise HTTPException(status_code=400, detail="NÚMERO ACTA CONCILIACIÓN CARTERA: no se permiten espacios en blanco.")
        if not _ACTA_RE.match(ab_raw):
            raise HTTPException(status_code=400, detail="NÚMERO ACTA CONCILIACIÓN CARTERA: formato inválido.")
    if "AK" in valid and _changed_from_db("AK"):
        ak_raw = str(valid["AK"])
        if ak_raw != ak_raw.strip() or " " in ak_raw:
            raise HTTPException(status_code=400, detail="N° ACTA CONCILIACIÓN FINIQUITO: no se permiten espacios en blanco.")
        if not _ACTA_RE.match(ak_raw):
            raise HTTPException(status_code=400, detail="N° ACTA CONCILIACIÓN FINIQUITO: formato inválido.")

    # ── Validación de duplicidad: AB y AK deben ser únicos (excluye el registro actual) ──
    if "AB" in valid:
        if db.execute(f"SELECT id FROM registros WHERE {F._col('AB')} = ? AND id != ?", (str(valid["AB"]).strip(), id)).fetchone():  # nosemgrep
            raise HTTPException(status_code=409, detail="NÚMERO ACTA CONCILIACIÓN CARTERA [AB]: ya existe un registro con este valor.")
    if "AK" in valid:
        if db.execute(f"SELECT id FROM registros WHERE {F._col('AK')} = ? AND id != ?", (str(valid["AK"]).strip(), id)).fetchone():  # nosemgrep
            raise HTTPException(status_code=409, detail="N° ACTA CONCILIACIÓN FINIQUITO [AK]: ya existe un registro con este valor.")

    # ── Validación: BY solo se puede colocar si hay valores en AK y AL ──
    if "BY" in valid and valid["BY"]:
        if _changed_from_db("BY") or _changed_from_db("AK") or _changed_from_db("AL"):
            ak_val = valid.get("AK") or (row[F._col("AK")] if row else None)
            al_val = valid.get("AL") or (row[F._col("AL")] if row else None)
            if not ak_val or not al_val:
                raise HTTPException(status_code=400, detail="OBSERVACIÓN CONCILIACIÓN [BY] solo se puede colocar si hay valores en N° ACTA CONCILIACIÓN FINIQUITO [AK] y FECHA ACTA CONCILIACIÓN FINIQUITO [AL].")

        # Validación: Si AM está vacío, BY debe contener "IPS"
        am_val = valid.get("AM") or (row[F._col("AM")] if row else None)
        by_val = str(valid["BY"]).upper()

        if _changed_from_db("BY") or _changed_from_db("AM"):
            if not am_val:
                if "IPS" not in by_val:
                    raise HTTPException(status_code=400, detail="Si SALDO A REMANENTE [AM] está vacío, OBSERVACIÓN CONCILIACIÓN [BY] debe contener la palabra 'IPS'.")
            else:
                # Validación: Si AM tiene valor, BY NO puede contener "IPS"
                if "IPS" in by_val:
                    raise HTTPException(status_code=400, detail="Si SALDO A REMANENTE [AM] tiene valor, OBSERVACIÓN CONCILIACIÓN [BY] NO puede contener la palabra 'IPS'.")

    # ── Reglas de estado BY: ENVIADA A CONTROLAR MEDICO NACIONAL ──────────────
    _BY_ENVIADA  = "ENVIADA A CONTROLAR MEDICO NACIONAL"
    _BY_DEVUELTO = "DEVUELTO COMO CONTRARLO PARA REVISION"

    _by_col_db = F._col("BY")
    try:    _by_actual = (row[_by_col_db] or "").strip()
    except (KeyError, IndexError): _by_actual = ""

    _is_contralor_by = "CONTRALOR" in sess.get("permisos", []) or sess.get("is_admin", False)

    # Regla 2: si BY ya está ENVIADA, solo CONTRALOR/admin puede hacer cualquier modificación
    # Excepción: LIDER con acceso extendido (campo_moneda ≤ umbral configurado) también puede.
    if _by_actual == _BY_ENVIADA and not _is_contralor_by and not _lider_acceso_extendido:
        raise HTTPException(
            status_code=403,
            detail="El registro está en estado 'ENVIADA A CONTROLAR MEDICO NACIONAL'. Solo el Contralor puede realizar modificaciones."
        )

    # Regla 1: si se intenta establecer BY = ENVIADA, solo GESTOR 2 asignado o su LIDER directo
    if "BY" in valid and str(valid["BY"]).strip() == _BY_ENVIADA and _by_actual != _BY_ENVIADA:
        _me_by = db.execute(
            "SELECT nombre_completo, superior_inmediato FROM usuarios WHERE usuario = ? AND activo = 1",
            (sess["usuario"],)
        ).fetchone()
        _mi_nombre_by = ((_me_by["nombre_completo"] if _me_by else None) or "").strip()
        _ag_col_by = F._col("AG")
        try:    _ag_val_by = (row[_ag_col_by] or "").strip()
        except (KeyError, IndexError): _ag_val_by = ""

        _puede_enviar = False
        _permisos_by  = sess.get("permisos", [])
        if _mi_nombre_by and _ag_val_by:
            if "GESTOR 2" in _permisos_by and _mi_nombre_by.lower() == _ag_val_by.lower():
                _puede_enviar = True
            elif "LIDER" in _permisos_by:
                _ag_usr_by = db.execute(
                    "SELECT superior_inmediato FROM usuarios WHERE nombre_completo = ? AND activo = 1",
                    (_ag_val_by,)
                ).fetchone()
                if _ag_usr_by and (_ag_usr_by["superior_inmediato"] or "") == sess["usuario"]:
                    _puede_enviar = True

        if not _puede_enviar:
            raise HTTPException(
                status_code=403,
                detail="Solo el GESTOR 2 asignado o su LIDER directo puede marcar el estado 'ENVIADA A CONTROLAR MEDICO NACIONAL'."
            )

    # Regla 3: CONTRALOR (o LIDER con acceso extendido) cambiando BY desde ENVIADA
    # solo puede ir a DEVUELTO.
    if _by_actual == _BY_ENVIADA and "BY" in valid and (_is_contralor_by or _lider_acceso_extendido):
        _nuevo_by_val = str(valid["BY"]).strip()
        if _nuevo_by_val and _nuevo_by_val != _BY_DEVUELTO and _nuevo_by_val != _BY_ENVIADA:
            raise HTTPException(
                status_code=400,
                detail=f"Cuando BY está en '{_BY_ENVIADA}', solo puede cambiarlo a '{_BY_DEVUELTO}'."
            )

    # ── Validación: Fechas no pueden ser futuras ──
    today_str = datetime.now().strftime("%Y-%m-%d")
    campos_fecha_max_hoy = [
        "K", "L", "N",           # Fechas existentes
        "CC", "CD",              # Fechas de soportes
        "CK", "CL", "CM", "CN", "CO", "CP", "CQ", "CR",  # Fechas de pago reales cuotas 1-8
        "DC", "DH", "DW",        # Fechas de devolución e informe
        "EF", "EG", "EH", "EI",  # Fechas de pago reales cuotas 9-12
        "ET", "EU", "EV", "EW", "EX", "EY", "EZ",  # Fechas de pago reales cuotas 13-19
        "FA", "FB", "FD", "FF",  # Fechas de pago reales cuotas 20-23
        "FH",                    # Fecha de pago real cuota 24
    ]
    nombres_fecha = {
        "K": "PERIODO RECLAMADO DESDE", "L": "PERIODO RECLAMADO HASTA", "N": "FECHA SOLICITUD CONCILIACIÓN IPS",
        "CC": "FECHA DE RECIBIDO SOPORTES", "CD": "FECHA FIRMA GIRO CHEQUE",
        "CK": "FECHA DE PAGO ACTA DE FINIQUITO", "CL": "FECHA DE PAGO 2DA CUOTA",
        "CM": "FECHA PAGO 3RA CUOTA", "CN": "FECHA PAGO 4TA CUOTA", "CO": "FECHA PAGO 5TA CUOTA",
        "CP": "FECHA PAGO 6TA CUOTA", "CQ": "FECHA PAGO 7MA CUOTA", "CR": "FECHA PAGO 8VA CUOTA",
        "DC": "FECHA DEVOLUCIÓN", "DH": "FECHA DEVOLUCIÓN 2", "DW": "FECHA INFORME PROYECCIÓN",
        "EF": "FECHA PAGO REAL 9NA CUOTA", "EG": "FECHA PAGO REAL 10MA CUOTA",
        "EH": "FECHA PAGO REAL 11VA CUOTA", "EI": "FECHA PAGO REAL 12VA CUOTA",
        "ET": "FECHA PAGO REAL 13RA CUOTA", "EU": "FECHA PAGO REAL 14TA CUOTA",
        "EV": "FECHA PAGO REAL 15TA CUOTA", "EW": "FECHA PAGO REAL 16TA CUOTA",
        "EX": "FECHA PAGO REAL 17MA CUOTA", "EY": "FECHA PAGO REAL 18VA CUOTA",
        "EZ": "FECHA PAGO REAL 19NA CUOTA", "FA": "FECHA PAGO REAL 20MA CUOTA",
        "FB": "FECHA PAGO REAL 21RA CUOTA", "FD": "FECHA PAGO REAL 22DA CUOTA",
        "FF": "FECHA PAGO REAL 23RA CUOTA", "FH": "FECHA PAGO REAL 24TA CUOTA",
    }
    for cod in campos_fecha_max_hoy:
        if cod in valid and valid[cod]:
            try:
                fecha_val = str(valid[cod]).strip()
                # Solo validar si el valor cambió respecto al guardado en BD
                col_db = F._col(cod)
                try:    _val_guardado = str(row[col_db] or "").strip()
                except (KeyError, IndexError): _val_guardado = ""
                if fecha_val == _val_guardado:
                    continue  # Campo no modificado: no re-validar fecha
                if fecha_val and fecha_val > today_str:
                    raise HTTPException(status_code=400, detail=f"{nombres_fecha.get(cod, cod)} [{cod}] no puede ser mayor al día de hoy.")
            except HTTPException:
                raise
            except Exception as e:
                # Ignorar errores de comparación (ej: valores no-fecha)
                logger.warning(f"Error validando fecha {cod}: {e}")

    # Validación: PRUEBAS COVID en J solo permitido cuando C = BOGOTA
    if "J" in valid and (valid.get("J") or "").strip() == "PRUEBAS COVID":
        if _changed_from_db("J") or _changed_from_db("C"):
            _c_col = F._col("C")
            _c_nuevo = (valid.get("C") or "").strip().upper()
            if not _c_nuevo:
                try:
                    _c_nuevo = (row[_c_col] or "").strip().upper()
                except (KeyError, IndexError):
                    _c_nuevo = ""
            if _c_nuevo != "BOGOTA":
                raise HTTPException(
                    status_code=400,
                    detail="La opción 'PRUEBAS COVID' en CONCEPTO [J] solo está disponible para la ciudad BOGOTA."
                )

    # Validación: orden estricto entre pares de fechas
    # Para UPDATE: si el campo no viene en valid, se usa el valor ya guardado en el registro
    _fecha_orden_pares_update = [("N", "O"), ("O", "P"), ("P", "Q"), ("AM", "BJ"), ("N", "CG")]
    _fecha_orden_nombres_nopq = {
        "N":  "FECHA SOLICITUD CONCILIACIÓN IPS",
        "O":  "FECHA DE ENVÍO ANALISIS CARTERA A IPS",
        "P":  "FECHA DEL ACTA DE CARTERA",
        "Q":  "FECHA FIRMA DE ACTA DE CONCILIACION DE CARTERA",
        "AL": "FECHA DE ELABORACIÓN ACTA DE FINIQUITO",
        "AM": "FECHA FIRMA DE ACTA DE CONCILIACION FINIQUITO",
        "BJ": "FECHA TENTATIVA 1RA CUOTA",
        "CG": "MES CIERRE",
    }
    for _cod_menor, _cod_mayor in _fecha_orden_pares_update:
        if not (_changed_from_db(_cod_menor) or _changed_from_db(_cod_mayor)):
            continue
        try:
            _v_menor = str(valid.get(_cod_menor) or (row[F._col(_cod_menor)] if row else "") or "").strip()
            _v_mayor = str(valid.get(_cod_mayor) or (row[F._col(_cod_mayor)] if row else "") or "").strip()
        except (KeyError, IndexError):
            continue
        if _v_menor and _v_mayor and _v_mayor <= _v_menor:
            raise HTTPException(
                status_code=400,
                detail=f"{_fecha_orden_nombres_nopq[_cod_mayor]} [{_cod_mayor}] debe ser mayor a {_fecha_orden_nombres_nopq[_cod_menor]} [{_cod_menor}]."
            )
    # AM >= AL (mismo día permitido), con fallback a BD si el campo no viene en el payload
    try:
        _al_u = str(valid.get("AL") or (row[F._col("AL")] if row else "") or "").strip()
        _am_u = str(valid.get("AM") or (row[F._col("AM")] if row else "") or "").strip()
    except (KeyError, IndexError):
        _al_u, _am_u = "", ""
    if _al_u and _am_u and _am_u < _al_u:
        if _changed_from_db("AL") or _changed_from_db("AM"):
            raise HTTPException(
                status_code=400,
                detail=f"{_fecha_orden_nombres_nopq['AM']} [AM] debe ser mayor o igual a {_fecha_orden_nombres_nopq['AL']} [AL]."
            )

    # Campos a limpiar (cierre AC/BD): se agregan a valid como NULL justo antes del UPDATE,
    # ya que el filtro `val not in (None, "")` los excluiría si pasaran por las validaciones.
    _limpiar_campos = body.get("limpiar_campos", [])
    for _cod_limpiar in _limpiar_campos:
        if _cod_limpiar in F.ALL_FIELD_CODES_SET and _cod_limpiar in allowed_codes:
            valid[_cod_limpiar] = None
    valid.pop("DT", None)  # DT siempre protegido

    # ── Política de aprobación: N con más de 14 días requiere aprobación del líder ──
    _n_nuevo_upd = (valid.get("N") or "").strip()
    _n_actual_upd = _safe_str(row, F._col("N"))
    _comentario_solicitud_n_upd = (body.get("comentario_solicitud_n") or "").strip()
    _n_pasa_a_pendiente = False

    if _n_nuevo_upd and _n_nuevo_upd != _n_actual_upd and _n_requiere_aprobacion(_n_nuevo_upd):
        _n_pasa_a_pendiente = True

    sets   = ", ".join(f"{F._col(cod)} = ?" for cod in valid)
    values = list(valid.values())
    db.execute(f"UPDATE registros SET {sets} WHERE id = ?", (*values, id))  # nosemgrep
    db.commit()

    if _n_pasa_a_pendiente:
        db.execute(
            "UPDATE registros SET estado_aprobacion_n=?, comentario_solicitud_n=?, "
            "origen_pendiente_n=?, n_valor_anterior=? WHERE id=?",
            ("pendiente", _comentario_solicitud_n_upd, "update", _n_actual_upd, id)
        )
        db.execute(
            "INSERT INTO aprobacion_n_log (registro_id, accion, usuario, comentario, fecha) VALUES (?,?,?,?,?)",
            (id, "solicitud", sess["usuario"], _comentario_solicitud_n_upd, datetime.now().isoformat())
        )
        db.commit()
        _upd_creator_row = db.execute(
            "SELECT nombre_completo FROM usuarios WHERE usuario = ? AND activo = 1",
            (row["usuario"],)
        ).fetchone()
        _upd_creator_nombre = _upd_creator_row["nombre_completo"] if _upd_creator_row else row["usuario"]
        _consec_upd_row = db.execute(f"SELECT {F._col('A')} FROM registros WHERE id = ?", (id,)).fetchone()  # nosemgrep
        _consec_upd = (_consec_upd_row[0] if _consec_upd_row else None) or f"#{id}"
        _notificar_lider_aprobacion_n(
            db, id, _consec_upd,
            row["usuario"], _upd_creator_nombre, _comentario_solicitud_n_upd,
            regional_b=str(row[F._col("C")] or "").strip()
        )

    _es_autorizado = can_edit_registro(row, sess, db)
    # Marca especial en audit_log cuando LIDER usa acceso extendido para editar campos CONTRALOR
    _sess_audit = sess
    if _lider_acceso_extendido:
        _contralor_codes_audit = {f["codigo"] for f in F.ROLES_FIELDS.get("CONTRALOR", [])}
        if any(cod in _contralor_codes_audit for cod in valid):
            _sess_audit = {
                **sess,
                "permisos": list(sess.get("permisos", [])) + ["ACCESO EXTENDIDO LIDER"],
            }
    _registrar_audit(db, id, "modificacion", row, valid, _es_autorizado, _sess_audit, motivo=motivo_cierre)
    db.commit()

    # Notificación de devolución: BY cambió de ENVIADA → DEVUELTO
    if "BY" in valid and str(valid.get("BY", "")).strip() == _BY_DEVUELTO and _by_actual == _BY_ENVIADA:
        _ag_col_dev = F._col("AG")
        try:    _ag_nombre_dev = (row[_ag_col_dev] or "").strip()
        except (KeyError, IndexError): _ag_nombre_dev = ""

        _consec_dev_row = db.execute(f"SELECT {F._col('A')} FROM registros WHERE id = ?", (id,)).fetchone()  # nosemgrep
        _consec_dev = (_consec_dev_row[0] if _consec_dev_row else None) or f"#{id}"
        _msg_dev = f"El Contralor devolvió el registro {_consec_dev} (ID: {id}) para revisión."
        if motivo_devolucion:
            _msg_dev += f" Motivo: {motivo_devolucion}"

        if _ag_nombre_dev:
            _g2_dev_row = db.execute(
                "SELECT usuario, superior_inmediato FROM usuarios WHERE nombre_completo = ? AND activo = 1",
                (_ag_nombre_dev,)
            ).fetchone()
            if _g2_dev_row:
                crear_notificacion(db, _g2_dev_row["usuario"], "devolucion_contralor", _msg_dev, id)
                _lider_dev = (_g2_dev_row["superior_inmediato"] or "").strip()
                if _lider_dev and _lider_dev != _g2_dev_row["usuario"]:
                    crear_notificacion(db, _lider_dev, "devolucion_contralor", _msg_dev, id)
        db.commit()

    # Notificación a CONTRALOR: LIDER con acceso extendido editó campos de CONTRALOR
    if _lider_acceso_extendido:
        _contralor_codes_notif = {f["codigo"] for f in F.ROLES_FIELDS.get("CONTRALOR", [])}
        if any(cod in _contralor_codes_notif for cod in valid):
            _consec_lae_row = db.execute(  # nosemgrep
                f"SELECT {F._col('A')} FROM registros WHERE id = ?", (id,)
            ).fetchone()
            _consec_lae = (_consec_lae_row[0] if _consec_lae_row else None) or f"#{id}"
            _lider_lae_row = db.execute(
                "SELECT nombre_completo FROM usuarios WHERE usuario = ? AND activo = 1",
                (sess["usuario"],)
            ).fetchone()
            _lider_lae_nombre = _lider_lae_row["nombre_completo"] if _lider_lae_row else sess["usuario"]
            _msg_lae = (
                f"[ACCESO EXTENDIDO LIDER] El Líder {_lider_lae_nombre} editó campos de Contralor "
                f"en el registro {_consec_lae} (ID: {id})."
            )
            for _ctrl_lae in db.execute(
                "SELECT usuario FROM usuarios WHERE activo = 1 AND perm_contralor = 1"
            ).fetchall():
                crear_notificacion(db, _ctrl_lae["usuario"], "lider_acceso_extendido", _msg_lae, id)
            db.commit()

    # Notificación de cambio de responsable
    if "AG" in valid:
        old_ag_val = (row[F._col("AG")] or "").strip() if row else ""
        new_ag_val = (valid["AG"] or "").strip()
        if new_ag_val and new_ag_val != old_ag_val:
            reg = db.execute(  # nosemgrep
                f"SELECT {F._col('E')}, {F._col('I')}, {F._col('A')} FROM registros WHERE id = ?", (id,)
            ).fetchone()
            nit_val    = reg[0] if reg else ""
            nombre_val = reg[1] if reg else ""
            consec_val = reg[2] if reg else f"#{id}"
            ref = nombre_val or (f"NIT {nit_val}" if nit_val else consec_val)
            resp_row = db.execute(
                "SELECT usuario FROM usuarios WHERE nombre_completo = ? AND activo = 1", (new_ag_val,)
            ).fetchone()
            # No notificar si N acaba de pasar a pendiente — se enviará al aprobar
            if resp_row and resp_row["usuario"] != sess["usuario"] and not _n_pasa_a_pendiente:
                crear_notificacion(db, resp_row["usuario"], "asignacion_responsable",
                    f"Fuiste asignado como Responsable de Conciliación: {ref} (ID: {id})", id)
            db.commit()

    # Notificación de cambio en campo AF (OBSERVACIONES ACTUALES)
    if "AF" in valid:
        _af_col = F._col("AF")
        try:
            _af_anterior = (row[_af_col] or "").strip()
        except (KeyError, IndexError):
            _af_anterior = ""
        _af_nuevo = (valid["AF"] or "").strip()
        if _af_nuevo != _af_anterior:
            _ag_col_af = F._col("AG")
            if "AG" in valid:
                _ag_nombre_af = (valid["AG"] or "").strip()
            else:
                try:
                    _ag_nombre_af = (row[_ag_col_af] or "").strip()
                except (KeyError, IndexError):
                    _ag_nombre_af = ""
            if _ag_nombre_af:
                _resp_af_row = db.execute(
                    "SELECT usuario FROM usuarios WHERE nombre_completo = ? AND activo = 1",
                    (_ag_nombre_af,)
                ).fetchone()
                if _resp_af_row:
                    _consec_af_row = db.execute(  # nosemgrep
                        f"SELECT {F._col('A')} FROM registros WHERE id = ?", (id,)
                    ).fetchone()
                    _consec_af_val = (_consec_af_row[0] if _consec_af_row else None) or f"#{id}"
                    if _af_anterior:
                        _msg_af = (
                            f"El campo OBSERVACIONES ACTUALES [AF] del registro {_consec_af_val} (ID: {id}) fue modificado.\n"
                            f"Valor anterior: {_af_anterior}\n"
                            f"Valor nuevo: {_af_nuevo}"
                        )
                    else:
                        _msg_af = (
                            f"Se agregaron OBSERVACIONES ACTUALES [AF] en el registro {_consec_af_val} (ID: {id}).\n"
                            f"Valor: {_af_nuevo}"
                        )
                    crear_notificacion(db, _resp_af_row["usuario"], "cambio_observaciones_af", _msg_af, id)
                    db.commit()

    # Nombre completo del usuario que ejecuta el cierre (para notificaciones a contralor)
    _cierre_user_row = db.execute(
        "SELECT nombre_completo FROM usuarios WHERE usuario = ? AND activo = 1",
        (sess.get("usuario", ""),)
    ).fetchone()
    _cierre_nombre_completo = (_cierre_user_row["nombre_completo"] if _cierre_user_row else sess.get("usuario", "?"))

    # Notificación de cierre de registro (AC cambia a valor de cierre)
    _AC_CIERRE_VALS_NOTIF = {
        "CERRADO POR CANCELACION DE MESA",
        "CERRADO POR CANCELACION DE MESAS",
        "CERRADO SIN FINALIZACIÓN",
        "IPS NO ASISTE A MESAS",
    }
    if "AC" in valid:
        _ac_col = F._col("AC")
        try:
            _ac_anterior = (row[_ac_col] or "").strip()
        except (KeyError, IndexError):
            _ac_anterior = ""
        _ac_nuevo = (valid["AC"] or "").strip()
        if _ac_nuevo in _AC_CIERRE_VALS_NOTIF and _ac_anterior not in _AC_CIERRE_VALS_NOTIF:
            _consec_cierre_row = db.execute(  # nosemgrep
                f"SELECT {F._col('A')} FROM registros WHERE id = ?", (id,)
            ).fetchone()
            _consec_cierre = (_consec_cierre_row[0] if _consec_cierre_row else None) or f"#{id}"
            _msg_cierre = (
                f"El registro {_consec_cierre} (ID: {id}) fue cerrado "
                f"con estado: {_ac_nuevo}."
            )
            _creador_cierre = row["usuario"]
            _creador_row_c = db.execute(
                "SELECT superior_inmediato FROM usuarios WHERE usuario = ? AND activo = 1",
                (_creador_cierre,)
            ).fetchone()
            if _creador_row_c and _creador_row_c["superior_inmediato"]:
                _lider_cierre = (_creador_row_c["superior_inmediato"] or "").strip()
                if _lider_cierre:
                    crear_notificacion(db, _lider_cierre, "cierre_registro", _msg_cierre, id)
                    db.commit()
            # Notificar a todos los CONTRALOR activos
            _msg_ctrl_ac = (
                f"[CIERRE AC] El registro {_consec_cierre} (ID: {id}) fue cerrado "
                f"con estado: {_ac_nuevo}.\n"
                f"Cerrado por: {_cierre_nombre_completo}."
            )
            if motivo_cierre:
                _msg_ctrl_ac += f"\nMotivo: {motivo_cierre}"
            for _ctrl in db.execute(
                "SELECT usuario FROM usuarios WHERE activo = 1 AND perm_contralor = 1"
            ).fetchall():
                crear_notificacion(db, _ctrl["usuario"], "cierre_registro", _msg_ctrl_ac, id)
            db.commit()

    # Notificación de cierre de registro por BD (BD cambia a "CERRADO SIN FINALIZACION")
    if "BD" in valid:
        _bd_col = F._col("BD")
        try:
            _bd_anterior = (row[_bd_col] or "").strip()
        except (KeyError, IndexError):
            _bd_anterior = ""
        _bd_nuevo = (valid["BD"] or "").strip()
        if _bd_nuevo == "CERRADO SIN FINALIZACION" and _bd_anterior != "CERRADO SIN FINALIZACION":
            _consec_bd_row = db.execute(  # nosemgrep
                f"SELECT {F._col('A')} FROM registros WHERE id = ?", (id,)
            ).fetchone()
            _consec_bd = (_consec_bd_row[0] if _consec_bd_row else None) or f"#{id}"
            _msg_bd = (
                f"El registro {_consec_bd} (ID: {id}) fue cerrado en ESTADO FINIQUITO [BD]: "
                f"CERRADO SIN FINALIZACION."
            )
            _creador_bd = row["usuario"]
            _creador_row_bd = db.execute(
                "SELECT superior_inmediato FROM usuarios WHERE usuario = ? AND activo = 1",
                (_creador_bd,)
            ).fetchone()
            if _creador_row_bd and _creador_row_bd["superior_inmediato"]:
                _lider_bd = (_creador_row_bd["superior_inmediato"] or "").strip()
                if _lider_bd:
                    crear_notificacion(db, _lider_bd, "cierre_registro_bd", _msg_bd, id)
                    db.commit()
            # Notificar a todos los CONTRALOR activos
            _msg_ctrl_bd = (
                f"[CIERRE BD] El registro {_consec_bd} (ID: {id}) fue cerrado en ESTADO FINIQUITO [BD]: "
                f"CERRADO SIN FINALIZACION.\n"
                f"Cerrado por: {_cierre_nombre_completo}."
            )
            if motivo_cierre:
                _msg_ctrl_bd += f"\nMotivo: {motivo_cierre}"
            for _ctrl in db.execute(
                "SELECT usuario FROM usuarios WHERE activo = 1 AND perm_contralor = 1"
            ).fetchall():
                crear_notificacion(db, _ctrl["usuario"], "cierre_registro_bd", _msg_ctrl_bd, id)
            db.commit()

    # Notificación de cierre de registro por CE (CE cambia a valor de cierre)
    _CE_CIERRE_NOTIF = {"CERRADO POR CANCELACION DE MESAS", "CERRADO SIN FINALIZACIÓN"}
    if "CE" in valid:
        _ce_col = F._col("CE")
        try:
            _ce_anterior = (row[_ce_col] or "").strip()
        except (KeyError, IndexError):
            _ce_anterior = ""
        _ce_nuevo = (valid["CE"] or "").strip()
        if _ce_nuevo in _CE_CIERRE_NOTIF and _ce_anterior not in _CE_CIERRE_NOTIF:
            _consec_ce_row = db.execute(  # nosemgrep
                f"SELECT {F._col('A')} FROM registros WHERE id = ?", (id,)
            ).fetchone()
            _consec_ce = (_consec_ce_row[0] if _consec_ce_row else None) or f"#{id}"
            _msg_ce = (
                f"El registro {_consec_ce} (ID: {id}) fue cerrado en ESTADO PROCESO CONCILIACIÓN [CE]: "
                f"{_ce_nuevo}."
            )
            _creador_ce = row["usuario"]
            _creador_row_ce = db.execute(
                "SELECT superior_inmediato FROM usuarios WHERE usuario = ? AND activo = 1",
                (_creador_ce,)
            ).fetchone()
            if _creador_row_ce and _creador_row_ce["superior_inmediato"]:
                _lider_ce = (_creador_row_ce["superior_inmediato"] or "").strip()
                if _lider_ce:
                    crear_notificacion(db, _lider_ce, "cierre_registro_ce", _msg_ce, id)
                    db.commit()
            # Notificar a todos los CONTRALOR activos
            _msg_ctrl_ce = (
                f"[CIERRE CE] El registro {_consec_ce} (ID: {id}) fue cerrado en ESTADO PROCESO CONCILIACIÓN [CE]: "
                f"{_ce_nuevo}.\n"
                f"Cerrado por: {_cierre_nombre_completo}."
            )
            if motivo_cierre:
                _msg_ctrl_ce += f"\nMotivo: {motivo_cierre}"
            for _ctrl in db.execute(
                "SELECT usuario FROM usuarios WHERE activo = 1 AND perm_contralor = 1"
            ).fetchall():
                crear_notificacion(db, _ctrl["usuario"], "cierre_registro_ce", _msg_ctrl_ce, id)
            db.commit()

    return {"mensaje": "Registro actualizado exitosamente"}


@router.delete("/api/registro/{id}")
def eliminar_registro(id: int, db=Depends(get_db), sess: dict = Depends(require_login)):
    permisos = sess.get("permisos", [])
    if "GESTOR 1" not in permisos:
        raise HTTPException(status_code=403, detail="Solo usuarios con permiso GESTOR 1 pueden eliminar registros")

    row = db.execute("SELECT * FROM registros WHERE id = ?", (id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    restricted_codes: set = set()
    for role in ["GESTOR 2", "LIDER", "CONTRALOR"]:
        for f in F.ROLES_FIELDS.get(role, []):
            restricted_codes.add(f["codigo"])

    for cod in restricted_codes:
        try:
            val = row[F._col(cod)]
            if val is not None and str(val).strip() != "":
                raise HTTPException(status_code=400,
                    detail="No se puede eliminar: el registro ya tiene datos de GESTOR 2/LÍDER o CONTRALOR")
        except (IndexError, KeyError):
            pass

    db.execute("DELETE FROM registros WHERE id = ?", (id,))
    db.commit()
    _registrar_audit(db, id, "eliminacion", row, {}, True, sess)
    db.commit()
    return {"mensaje": "Registro eliminado exitosamente"}


@router.get("/api/mis-gestores")
def mis_gestores(db=Depends(get_db), sess: dict = Depends(require_login)):
    rows = db.execute(
        """SELECT usuario, nombre_completo FROM usuarios
           WHERE superior_inmediato = ? AND activo = 1 ORDER BY nombre_completo""",
        (sess["usuario"],)
    ).fetchall()
    return [{"usuario": r["usuario"], "nombre": r["nombre_completo"]} for r in rows]


@router.post("/api/registro/{id}/partir")
def partir_registro(id: int, body: dict = Body(...), db=Depends(get_db), sess: dict = Depends(require_login)):
    """Divide un registro creando nuevas glosas por compañía [D]. El original NO se elimina."""
    permisos = sess.get("permisos", [])
    es_admin = sess.get("is_admin", False)
    puede_partir = es_admin or any(rol in permisos for rol in ["GESTOR 1", "GESTOR 2", "LIDER", "CONTRALOR"])
    if not puede_partir:
        raise HTTPException(status_code=403, detail="No tiene permiso para segmentar conciliaciones.")

    import re

    partes = body.get("partes", [])

    if not partes or not isinstance(partes, list):
        raise HTTPException(status_code=400, detail="Se requiere 'partes' como lista con al menos 1 elemento.")

    if len(partes) > 3:
        raise HTTPException(status_code=400, detail="Se pueden crear como máximo 3 conciliaciones derivadas por operación.")

    # Leer registro original completo
    try:
        full_result = db.execute("SELECT * FROM registros WHERE id = ?", (id,))
        full_regs = full_result.fetchall()
    except Exception as e:
        logger.error(f"Error al consultar registro: {e}")
        raise HTTPException(status_code=500, detail=f"Error al consultar registro: {str(e)}")

    if not full_regs:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    row = full_regs[0]

    # Metadatos del original para heredar en los nuevos registros
    try:
        reg_rol     = row["rol"]
        reg_usuario = row["usuario"]
        reg_fecha   = row["fecha_creacion"]
    except (KeyError, TypeError):
        reg_rol     = row[1]
        reg_usuario = row[2]
        reg_fecha   = row[3]

    # Obtener consecutivo original (campo A)
    col_a = F._col("A")
    try:
        consecutivo_orig = row[col_a]
    except (KeyError, IndexError, TypeError):
        consecutivo_orig = None

    if not consecutivo_orig:
        raise HTTPException(status_code=400, detail="El registro no tiene consecutivo asignado (campo A vacío).")

    # Validar que el original no sea ya una glosa derivada (C21012026-0001-1)
    if re.search(r'-\d+$', str(consecutivo_orig)):
        # El original legítimo solo tiene un bloque numérico al final (C21012026-0001).
        # Una glosa derivada termina en -1, -2, -3 … precedido del consecutivo base.
        # Patrón de glosa base: letra(s) + dígitos + '-' + dígitos (exactamente UN guión separador)
        if re.fullmatch(r'[A-Z]+\d+-\d+', str(consecutivo_orig)):
            pass  # es original válido
        else:
            raise HTTPException(status_code=400, detail="Esta conciliación ya es derivada y no puede segmentarse nuevamente.")

    # Determinar el siguiente sufijo numérico buscando derivadas existentes en BD
    col_a_db = F._col("A")
    like_pattern = f"{consecutivo_orig}-%"
    try:
        existing = db.execute(  # nosemgrep
            f"SELECT {col_a_db} FROM registros WHERE {col_a_db} LIKE ?",
            (like_pattern,)
        ).fetchall()
    except Exception as e:
        logger.error(f"Error buscando glosas derivadas: {e}")
        raise HTTPException(status_code=500, detail="Error al buscar glosas derivadas existentes.")

    max_sufijo = 0
    for ex_row in existing:
        try:
            val_a = ex_row[0] if not hasattr(ex_row, 'keys') else ex_row[col_a_db]
        except (IndexError, KeyError):
            continue
        m = re.search(r'-(\d+)$', str(val_a or ""))
        if m:
            n = int(m.group(1))
            if n > max_sufijo:
                max_sufijo = n

    # Leer y validar M original
    col_m = F._col("M")
    try:
        _m_orig_raw = str(row[col_m] or "0").replace(",", "").strip()
        _m_original = int(float(_m_orig_raw)) if _m_orig_raw else 0
    except (KeyError, IndexError, TypeError, ValueError):
        _m_original = 0

    # Calcular suma de los M de las derivadas
    _suma_m_derivadas = 0
    for _p in partes:
        try:
            _suma_m_derivadas += int(float(str(_p.get("M") or "0").replace(",", "").strip()))
        except (ValueError, TypeError):
            pass

    if _m_original > 0 and _suma_m_derivadas >= _m_original:
        raise HTTPException(
            status_code=400,
            detail=f"La suma de los valores M ($ {_suma_m_derivadas:,}) debe ser menor al M del original ($ {_m_original:,}). El original debe quedar con un valor mayor a 0."
        )

    nuevos_ids = []

    try:
        for i, parte in enumerate(partes, 1):
            d_valor = (parte.get("D") or "").strip()
            m_valor = (parte.get("M") or "").strip()

            if not d_valor:
                raise HTTPException(status_code=400, detail=f"Parte {i}: el campo D (COMPAÑÍA) es obligatorio.")
            if not m_valor:
                raise HTTPException(status_code=400, detail=f"Parte {i}: el campo M es obligatorio.")

            sufijo = max_sufijo + i
            nuevo_consecutivo = f"{consecutivo_orig}-{sufijo}"

            # Copiar TODOS los campos del original (incluyendo AUTOMATICA como C, H, I)
            # Solo A se sobreescribe con el nuevo consecutivo; DT se descarta al final.
            campos_nueva_glosa = {}
            for cod in F.ALL_FIELD_CODES:
                col = F._col(cod)
                try:
                    val = row[col]
                    if val not in (None, ""):
                        campos_nueva_glosa[cod] = val
                except (IndexError, KeyError, TypeError):
                    pass

            # Sobrescribir campos específicos de la derivada
            campos_nueva_glosa["A"] = nuevo_consecutivo
            campos_nueva_glosa["D"] = d_valor
            campos_nueva_glosa["M"] = m_valor

            # Filtrar solo campos reconocidos
            campos_validos = {
                cod: val for cod, val in campos_nueva_glosa.items()
                if cod in F.ALL_FIELD_CODES_SET and val not in (None, "")
            }

            # DT nunca se copia ni se genera en partición (consecutivo único RUR)
            campos_validos.pop("DT", None)

            # Construir INSERT
            cols_str     = ", ".join(F._col(cod) for cod in campos_validos)
            placeholders = ", ".join("?" for _ in campos_validos)
            values       = list(campos_validos.values())

            db.execute(  # nosemgrep
                f"INSERT INTO registros (rol, usuario, fecha_creacion, {cols_str}) VALUES (?, ?, ?, {placeholders})",
                (reg_rol, reg_usuario, reg_fecha, *values)
            )

            new_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
            nuevos_ids.append(new_id)

            _registrar_audit(db, new_id, "creacion_por_particion", {}, campos_validos, False, sess)

        # Actualizar M del original = M original - suma de derivadas
        _nuevo_m_original = _m_original - _suma_m_derivadas
        db.execute(f"UPDATE registros SET {col_m} = ? WHERE id = ?", (str(_nuevo_m_original), id))  # nosemgrep

        # El registro original NO se elimina
        db.commit()

        return {
            "mensaje": f"Se crearon {len(nuevos_ids)} conciliación(es) derivada(s) correctamente.",
            "ids": nuevos_ids,
            "consecutivo_original": consecutivo_orig
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error en partir_registro: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al segmentar la conciliación: {str(e)}")
