"""
core/fields.py — Estado global de campos, mapeos de columnas y helpers de DB.

Este módulo concentra todo lo que en la versión Flask vivía como globales
de módulo en app.py:  CODE_TO_COLNAME, ROLES_FIELDS, _col(), etc.

Debe ser importado temprano (en main.py lifespan) para que los globales
queden inicializados antes de recibir peticiones.
"""
import sqlite3
import pandas as pd

from app.config import DB_PATH, DATABASE_URL


# ---------------------------------------------------------------------------
# Helpers internos para leer campos desde PostgreSQL o SQLite
# ---------------------------------------------------------------------------
def _is_pg() -> bool:
    return bool(DATABASE_URL and DATABASE_URL.startswith(("postgresql", "postgres")))


def _pg_fetch(sql: str) -> list:
    """Ejecuta un SELECT en PostgreSQL y retorna lista de dicts."""
    import psycopg2
    url = DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    conn = psycopg2.connect(url)
    try:
        cur = conn.cursor()
        cur.execute(sql)
        if cur.description:
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]
        return []
    except Exception:
        return []
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Jerarquía de roles
# ---------------------------------------------------------------------------
ROLE_LOWER_ROLES: dict = {
    "GESTOR 1":  [],
    "GESTOR 2":  ["GESTOR 1"],
    "LIDER":     ["GESTOR 1"],
    "CONTRALOR": ["GESTOR 1", "GESTOR 2", "LIDER"],
    "ADMIN":     ["GESTOR 1", "GESTOR 2", "LIDER", "CONTRALOR"],
}

# ---------------------------------------------------------------------------
# Mapping code → DB column name
# ---------------------------------------------------------------------------
CODE_TO_COLNAME: dict = {
    'A': 'CONSECUTIVO_DE_RADICACION_DE_LA_CONCILIACION',
    'B': 'REGIONAL_IPS',
    'C': 'CIUDAD_RESPONSABLE_DE_LA_CONCILIACION',
    'D': 'COMPANIA',
    'E': 'NIT_PRESTADOR',
    'F': 'DESCRIPCION_CIUDADMUNICIPIO_PRESTADOR',
    'G': 'IPS_CON_SEDES',
    'H': 'TIPO_PER',
    'I': 'NOMBRE_SUCURSAL',
    'J': 'CONCEPTO_CARTERA_CIRCULAR_30_ENTES_DE_CONTROL',
    'K': 'PERIODO_RECLAMADO_DESDE',
    'L': 'PERIODO_RECLAMADO_HASTA',
    'M': 'VR_CARTERA_CONCILIADA',
    'N': 'FECHA_SOLICITUD_CONCILIACION_IPS',
    'O': 'FECHA_DE_ENVIO_ANALISIS_CARTERA_A_IPS',
    'P': 'FECHA_DEL_ACTA_DE_CARTERA',
    'Q': 'FECHA_FIRMA_DE_ACTA_DE_CONCILIACION_DE_CARTERA',
    'R': 'CARTERA_CONCILIADA_HASTA',
    'S': 'FACTURAS_PAGADA_POR_LA_EPS_DEPURADA_POR_IPS',
    'T': 'FACTURAS_PRESUP_MAX_EPS_IPS',
    'U': 'FACTURAS_CARTERA_CORRIENTE',
    'V': 'FACTURAS_COVID',
    'W': 'FACTURAS_PRESUPUESTO_MAX',
    'X': 'FACTURAS_SIN_RADICAR',
    'Y': 'FACTURAS_DEVUELTAS',
    'Z': 'FACTURAS_RESOLUCION_1885',
    'AA': 'FACTURAS_NO_COVID',
    'AB': 'NUMERO_ACTA_CONCILIACION_CARTERA',
    'AC': 'ESTADO_CONCILIACION_CARTERA',
    'AD': 'VALOR_TOTAL_DESAGREGADO_CARTERA',
    'AE': 'VALIDACION_VR_DESAGREGADO_VS_CONCILIADA',
    'AF': 'OBSERVACIONES_DE_LA_GESTION',
    'AG': 'RESPONSABLE_CONCILIACION',
    'AH': 'PERIODO_CONCILIADO_DE_GLOSAS_DESDE',
    'AI': 'PERIODO_CONCILIADO_DE_GLOSAS_HASTA',
    'AJ': 'VR_GLOSA_CONCILIADA',
    'AK': 'N_ACTA_CONCILIACION_FINIQUITO',
    'AL': 'FECHA_DE_ELABORACION_ACTA_DE_FINIQUITO',
    'AM': 'FECHA_FIRMA_DE_ACTA_DE_CONCILIACION_FINIQUITO',
    'AN': 'VALOR_TARIFAS',
    'AO': 'VALOR_ACEPTADO_TARIFAS',
    'AP': 'VALOR_FACTURACION',
    'AQ': 'VALOR_ACEPTADO_FACTURACION',
    'AR': 'VALOR_AUTORIZACIONES',
    'AS': 'VALOR_ACEPTADO_AUTORIZACIONES',
    'AT': 'VALOR_SOPORTES',
    'AU': 'VALOR_ACEPTADO_SOPORTES',
    'AV': 'VALOR_PERTINENCIACALIDAD',
    'AW': 'VALOR_ACEPTADO_PERTINENCIACALIDAD',
    'AX': 'VALOR_COBERTURA',
    'AY': 'VALOR_ACEPTADO_COBERTURA',
    'AZ': 'VALOR_AJUSTES_OSI',
    'BA': 'VALOR_ACEPTADO_AJUSTES_OSI',
    'BB': 'VALOR_MEDICAMENTOS',
    'BC': 'VALOR_ACEPTADO_MEDICAMENTOS',
    'BD': 'ESTADO_FINIQUITO',
    'BE': 'TIPO_CONCILIACION_GLOSA',
    'BF': 'VALOR_ASUMIDO_EPS',
    'BG': 'VALOR_ASUMIDO_IPS',
    'BH': 'ASUMIDO_EPS',
    'BI': 'VR_PAGO',
    'BJ': 'FECHA_TENTANTIVA',
    'BK': 'VR_PAGO_2DA_CUOTA',
    'BL': 'FECHA_TENTATIVA_PAGO_2DA_CUOTA',
    'BM': 'VR_PAGO_3RA_CUOTA',
    'BN': 'FECHA_TENTATIVA_PAGO_3RA_CUOTA',
    'BO': 'VR_PAGO_4TA_CUOTA',
    'BP': 'FECHA_TENTATIVA_DE_PAGO_4TA_CUOTA',
    'BQ': 'VR_PAGO_5TA_CUOTA',
    'BR': 'FECHA_TENTATIVA_DE_PAGO_5TA_CUOTA',
    'BS': 'VR_PAGO_6TA_CUOTA',
    'BT': 'FECHA_TENTATIVA_DE_PAGO_6TA_CUOTA',
    'BU': 'VR_PAGO_7MA_CUOTA',
    'BV': 'FECHA_TENTATIVA_DE_PAGO_7MA_CUOTA',
    'BW': 'VR_PAGO_8VA_CUOTA',
    'BX': 'FECHA_TENTATIVA_DE_PAGO_8VA_CUOTA',
    'BY': 'ESTADO_ACTA_CONCILIACION',
    'BZ': 'TERMINO_PAGO_INICIAL_1RA_CUOTA',
    'CA': 'VR_TOTAL_PAGAR_CUOTAS',
    'CB': 'CONFIRMACION_VR_A_PAGAR_CONTROL',
    'CC': 'FECHA_RECIBIDO_SOPORTES_CENTRAL',
    'CD': 'FECHA_FIRMA_GIRO_CHEQUE_CONTRALORIA',
    'CE': 'ESTADO_PROCESO_CONCILIACION',
    'CF': 'CAUSA_CIERRE_NO_RESPUESTA',
    'CG': 'MES_CIERRE_NO_RTA_PRESTADOR',
    'CH': 'CONCILIA_GLOSA_ANTES_CARTERA',
    'CI': 'PAGO_A_CUOTAS',
    'CJ': 'NO_CUOTAS',
    'CK': 'FECHA_DE_PAGO_ACTA_DE_FINIQUITO',
    'CL': 'FECHA_DE_PAGO_2DA_CUOTA',
    'CM': 'FECHA_PAGO_3RA_CUOTA',
    'CN': 'FECHA_PAGO_4TA_CUOTA',
    'CO': 'FECHA_PAGO_5TA_CUOTA',
    'CP': 'FECHA_PAGO_6TA_CUOTA',
    'CQ': 'FECHA_PAGO_7MA_CUOTA',
    'CR': 'FECHA_PAGO_8VA_CUOTA',
    'CS': 'ANEXOS_TECNICOS1_Y_2_R_6066',
    'CT': 'DIAS_HASTA_FECHA_ELABORACION_ACTA',
    'CU': 'DIAS_HASTA_FECHA_SUSCRIBE_ACTA',
    'CV': 'DIAS_HASTA_FECHA_SUSCRIBE_ACTA_COVID',
    'CW': 'CIUDAD',
    'CX': 'DEPARTAMENTO',
    'CY': 'TIPO_PRESTADOR',
    'CZ': 'TIPO_ATENCION_PRESTADOR',
    'DA': 'NATURALEZA_JURIDICA_IPS',
    'DB': 'DEVOLUCION_PROCESO_CONCILIACION',
    'DC': 'FECHA_DEVOLUCIONFECHA_RETROALIMENTACION_NOVEDAD',
    'DD': 'TIPO_DEVOLUCIONRETROALIMENTACION',
    'DE': 'RESPONSABLE_DEVOLUCIONRETROALIMENTACION',
    'DF': 'CASO_PARA_MATRIZ_DE_RIESGO',
    'DG': 'DEVOLUCION_PROCESO_CONCILIACION2',
    'DH': 'FECHA_DEVOLUCIONFECHA_RETROALIMENTACION_NOVEDAD2',
    'DI': 'TIPO_DEVOLUCIONRETROALIMENTACION2',
    'DJ': 'RESPONSABLE_DEVOLUCIONRETROALIMENTACION_2',
    'DK': 'CASO_PARA_MATRIZ_DE_RIESGO_2',
    'DL': 'IPS_CON_PLAN_PREMIUM',
    'DM': 'FACTURAS_GLOSA_RATIFICADA',
    'DN': 'VALIDACION_VRS_1',
    'DO': 'VALIDACION_VR_2',
    'DP': 'CONCILIACION_ENTRADA',
    'DQ': 'CONCILIACION_SALIDA_WF',
    'DR': 'ESTADO_PROCESO_ACTUALIZACION_RUR',
    'DS': 'PRIORIDAD_PAGO',
    'DT': 'CONSECUTIVO_UNICO_RUR',
    'DU': 'CASO_PAGO_ESPECIALOBS_URG_CHM',
    'DV': 'CONCEPTO_CASO_PAGO_ESPECIAL',
    'DW': 'FECHA_INFORME_PORYECCION_PAGO_VP_05032026',
    'DX': 'VR_PAGO_9NA_CUOTA',
    'DY': 'FECHA_TENTATIVA_DE_PAGO_9NA_CUOTA',
    'DZ': 'VR_PAGO_10MA_CUOTA',
    'EA': 'FECHA_TENTATIVA_DE_PAGO_10MA_CUOTA',
    'EB': 'VR_PAGO_11VA_CUOTA',
    'EC': 'FECHA_TENTATIVA_DE_PAGO_11VA_CUOTA',
    'ED': 'VR_PAGO_12VA_CUOTA',
    'EE': 'FECHA_TENTATIVA_DE_PAGO_12VA_CUOTA',
    'EF': 'FECHA_PAGO_9NA_CUOTA',
    'EG': 'FECHA_PAGO_10MA_CUOTA',
    'EH': 'FECHA_PAGO_11VA_CUOTA',
    'EI': 'FECHA_PAGO_12VA_CUOTA',
}
COLNAME_TO_CODE: dict = {v: k for k, v in CODE_TO_COLNAME.items()}

# ---------------------------------------------------------------------------
# Tipo SQLite por tipo_dato del formulario
# ---------------------------------------------------------------------------
_TIPO_DATO_SQL_MAP: dict = {
    "Texto":       "TEXT",
    "Moneda":      "NUMERIC",
    "Entero":      "INTEGER",
    "Fecha":       "DATE",
    "Porcentaje":  "NUMERIC",
    "Binario":     "TEXT",
    "Lista texto": "TEXT",
    "Texto lista": "TEXT",
}


def _campo_sql_type(tipo_dato: str) -> str:
    return _TIPO_DATO_SQL_MAP.get(tipo_dato or "Texto", "TEXT")


# ---------------------------------------------------------------------------
# Globales cargados desde la DB (se refrescan con _refresh_globals)
# ---------------------------------------------------------------------------
ROLES_FIELDS: dict = {}
ROLE_NAMES: list = []
ALL_FIELD_CODES: list = []
CODE_TO_NOMBRE: dict = {}
NOMBRE_TO_CODE: dict = {}
ALL_FIELD_CODES_SET: set = set()


def _col(cod: str) -> str:
    """Retorna el nombre de columna DB para un código de campo."""
    return CODE_TO_COLNAME.get(cod, cod)


def _table_has_column(db, table: str, column: str) -> bool:
    info = db.execute(f"PRAGMA table_info({table})").fetchall()  # nosemgrep
    return any(row[1] == column for row in info)


def clean(val):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    return val


# ---------------------------------------------------------------------------
# Carga de campos desde la DB
# ---------------------------------------------------------------------------
def load_fields() -> dict:
    """Retorna dict rol → lista de field-dicts desde la tabla `campos`."""
    try:
        if _is_pg():
            rows = _pg_fetch("SELECT * FROM campos ORDER BY orden")
        else:
            db = sqlite3.connect(DB_PATH)
            db.row_factory = sqlite3.Row
            rows = [dict(row) for row in db.execute("SELECT * FROM campos ORDER BY orden").fetchall()]
            db.close()
    except Exception:
        return {}
    roles: dict = {}
    row_keys = rows[0].keys() if rows else []
    for row in rows:
        field = {
            "codigo":           row["codigo"],
            "nombre":           row["nombre"],
            "modo":             row["modo"] or "MANUAL",
            "origen":           row["origen"],
            "tipo_dato":        row["tipo_dato"] or "Texto",
            "opciones":         [] if (row["origen"] or "").upper() == "LISTA" else None,
            "comentario":       row["comentario"],
            "formula":          row["formula"],
            "requerido_crear":     row["requerido_crear"]     if "requerido_crear"     in row_keys else 0,
            "requerido_g2_lider":  row["requerido_g2_lider"]  if "requerido_g2_lider"  in row_keys else 0,
            "requerido_contralor": row["requerido_contralor"] if "requerido_contralor" in row_keys else 0,
            "dependencias":        row["dependencias"]         if "dependencias"        in row_keys else None,
        }
        for r in [x.strip() for x in (row["rol"] or "").split(",")]:
            if r:
                roles.setdefault(r, []).append(field)
    return roles


def load_all_field_codes():
    """Retorna (codes, by_code, nombre_to_code) desde la tabla `campos`."""
    try:
        if _is_pg():
            rows = _pg_fetch("SELECT codigo, nombre FROM campos ORDER BY orden")
        else:
            db = sqlite3.connect(DB_PATH)
            db.row_factory = sqlite3.Row
            rows = [dict(row) for row in db.execute("SELECT codigo, nombre FROM campos ORDER BY orden").fetchall()]
            db.close()
    except Exception:
        return [], {}, {}
    codes, by_code, nombre_to_code = [], {}, {}
    for row in rows:
        cod   = str(row["codigo"])
        nombre = str(row["nombre"])
        if cod not in by_code:
            codes.append(cod)
            by_code[cod] = nombre
            nombre_to_code[nombre.strip().lower()] = cod
    return codes, by_code, nombre_to_code


def _refresh_globals():
    """Recarga los globales desde la DB. Llamar tras cualquier cambio a 'campos'."""
    global ROLES_FIELDS, ROLE_NAMES, ALL_FIELD_CODES, CODE_TO_NOMBRE
    global NOMBRE_TO_CODE, ALL_FIELD_CODES_SET
    ROLES_FIELDS = load_fields()
    ROLE_NAMES   = sorted(ROLES_FIELDS.keys())
    ALL_FIELD_CODES, CODE_TO_NOMBRE, NOMBRE_TO_CODE = load_all_field_codes()
    ALL_FIELD_CODES_SET = set(ALL_FIELD_CODES)


# ---------------------------------------------------------------------------
# Migración de tabla registros (igual que Flask original)
# ---------------------------------------------------------------------------
def _migrate_registros(db):
    print("[MIGRATION] Migrando tabla registros a columnas con nombres descriptivos...")
    db.row_factory = sqlite3.Row
    existing_cols = [r[1] for r in db.execute("PRAGMA table_info(registros)").fetchall()]
    has_datos_col = "datos" in existing_cols

    if has_datos_col:
        old_rows = db.execute(
            "SELECT id, rol, usuario, datos, fecha_creacion FROM registros"
        ).fetchall()
    else:
        old_rows = db.execute("SELECT * FROM registros").fetchall()

    _tipo_rows = db.execute("SELECT codigo, tipo_dato FROM campos ORDER BY orden").fetchall()
    _tipo_map  = {r["codigo"]: r["tipo_dato"] for r in _tipo_rows}

    # Columnas de metadatos que no son campos de formulario pero deben preservarse
    _PROTECTED_EXTRA = [
        ("validado",            "INTEGER DEFAULT 0"),
        ("fecha_validacion",    "TEXT"),
        ("validado_por",        "TEXT"),
        ("reapertura_lider_ac", "INTEGER DEFAULT 0"),
        ("reapertura_lider_bd", "INTEGER DEFAULT 0"),
        ("reapertura_lider_ce", "INTEGER DEFAULT 0"),
    ]
    # Solo incluir las que ya existen en la tabla origen
    protected_present = [(name, typ) for name, typ in _PROTECTED_EXTRA if name in existing_cols]

    db.execute("DROP TABLE IF EXISTS registros_new")
    col_defs = "\n".join(
        f'    {_col(cod)} {_campo_sql_type(_tipo_map.get(cod, "Texto"))},'
        for cod in ALL_FIELD_CODES
    )
    col_defs = col_defs.rstrip(",")
    extra_defs = "".join(f",\n    {name} {typ}" for name, typ in protected_present)
    db.execute(f"""  # nosemgrep
        CREATE TABLE registros_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rol TEXT NOT NULL,
            usuario TEXT NOT NULL,
            fecha_creacion TEXT NOT NULL,
{col_defs}{extra_defs}
        )
    """)

    migrated = 0
    for row in old_rows:
        col_values: dict = {}
        if has_datos_col:
            import json
            try:
                datos = json.loads(row["datos"])
            except Exception:
                datos = {}
            for nombre, valor in datos.items():
                key = nombre.strip().lower()
                cod = NOMBRE_TO_CODE.get(key)
                if not cod:
                    for n, c in NOMBRE_TO_CODE.items():
                        if key in n or n in key:
                            cod = c
                            break
                if cod:
                    col_values[_col(cod)] = valor
        else:
            for cod in ALL_FIELD_CODES:
                col_name = _col(cod)
                try:
                    val = row[col_name]
                except (IndexError, KeyError):
                    try:
                        val = row[cod]
                    except (IndexError, KeyError):
                        val = None
                if val is not None:
                    col_values[col_name] = val

        # Copiar columnas protegidas preservando sus valores
        for name, _ in protected_present:
            try:
                val = row[name]
            except (IndexError, KeyError):
                val = None
            if val is not None:
                col_values[name] = val

        if col_values:
            cols = ", ".join(col_values.keys())
            placeholders = ", ".join("?" for _ in col_values)
            db.execute(
                f"INSERT INTO registros_new (id, rol, usuario, fecha_creacion, {cols}) "
                f"VALUES (?, ?, ?, ?, {placeholders})",
                (row["id"], row["rol"], row["usuario"], row["fecha_creacion"],
                 *col_values.values()),
            )
        else:
            db.execute(
                "INSERT INTO registros_new (id, rol, usuario, fecha_creacion) VALUES (?, ?, ?, ?)",
                (row["id"], row["rol"], row["usuario"], row["fecha_creacion"]),
            )
        migrated += 1

    db.execute("DROP TABLE registros")
    db.execute("ALTER TABLE registros_new RENAME TO registros")
    db.commit()
    print(f"[MIGRATION] Completada: {migrated} registro(s) migrado(s).")
