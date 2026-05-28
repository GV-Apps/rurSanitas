#!/usr/bin/env python3
"""
importar_historicos.py
======================
Importa datos históricos de registros RUR desde un archivo Excel a la base
de datos (SQLite de desarrollo o PostgreSQL de producción).

Usa CODE_TO_COLNAME de app/core/fields.py para traducir código de campo →
nombre real de columna en la DB (p.ej. "AG" → "RESPONSABLE_CONCILIACION").

Uso:
    python importar_historicos.py [ruta_excel]
"""

import csv
import getpass
import random
import re
import sqlite3
import sys
from datetime import date, datetime
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("ERROR: pandas no está instalado.\n  pip install pandas openpyxl")
    sys.exit(1)

try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

# Agregar raíz del proyecto al path para importar desde app/
sys.path.insert(0, str(Path(__file__).parent))
from app.core.fields import CODE_TO_COLNAME

# ── Configuración ──────────────────────────────────────────────────────────────

EXCEL_PATH  = Path(r"D:\Downloads\Data_RUR_registros.xlsx")
SQLITE_PATH = Path(__file__).parent / "app" / "formularios.db"
TODAY       = date.today().isoformat()

ROL_IMPORT     = "GESTOR1"
USUARIO_IMPORT = "importacion"

# ── Mapeo posicional Excel → código de campo ───────────────────────────────────
#
# El Excel tiene 140 columnas que siguen el orden secuencial de códigos en
# CODE_TO_COLNAME (A, B, C … DW) con tres grupos de columnas en posiciones
# distintas al sistema actual:
#
#   Col  27        → FX   (GLOSA PERTINENCIA; en el Excel ocupa la vieja posición AB)
#   Cols 77 – 84  → DX…EE (cuotas tentativa 9-12; en el Excel cols BZ-CG)
#   Cols 105 – 108 → EF…EI (fechas reales pago 9-12; en el Excel cols DB-DE)
#
# Fuera de esas excepciones, el resto de columnas sigue el orden de
# CODE_TO_COLNAME en secuencia.

def _build_position_map() -> dict[int, str]:
    """
    Genera {índice_columna_excel → código_campo} para las 140 columnas del Excel.
    Los códigos que no están en CODE_TO_COLNAME (FX, DX-EE, EF-EI) siguen siendo
    válidos: _col(cod) = CODE_TO_COLNAME.get(cod, cod), devuelve el código mismo.
    """
    EXCEPTIONS: dict[int, str] = {
        27:  "FX",
        77:  "DX", 78:  "DY", 79:  "DZ", 80:  "EA",
        81:  "EB", 82:  "EC", 83:  "ED", 84:  "EE",
        105: "EF", 106: "EG", 107: "EH", 108: "EI",
    }
    seq_codes = list(CODE_TO_COLNAME.keys())   # A, B, C … DW (127 códigos)
    pos_map: dict[int, str] = {}
    seq_idx = 0

    for col in range(140):
        if col in EXCEPTIONS:
            pos_map[col] = EXCEPTIONS[col]
        else:
            if seq_idx < len(seq_codes):
                pos_map[col] = seq_codes[seq_idx]
                seq_idx += 1

    return pos_map


POSITION_MAP = _build_position_map()


def _col(code: str) -> str:
    """Traduce código de campo → nombre real de columna en la DB."""
    return CODE_TO_COLNAME.get(code, code)


# ── Normalización de valores ───────────────────────────────────────────────────

_NA_MAP: dict[str, str | None] = {
    "no aplica":   "N/A",
    "no aplica.":  "N/A",
    "n.a.":        "N/A",
    "n.a":         "N/A",
    "n/a":         "N/A",
    "na":          "N/A",
    "-":           None,
    "–":           None,
    "—":           None,
    "n/d":         None,
    "s/i":         None,
    "s/d":         None,
}


def _parse_date(s: str) -> str | None:
    s = s.split(" ")[0].split("T")[0]
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return s


def _parse_moneda(s: str) -> str | None:
    cleaned = re.sub(r"[^\d.,\-]", "", s).strip()
    if not cleaned:
        return None
    if re.match(r"^\d{1,3}(\.\d{3})*,\d+$", cleaned):
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif re.match(r"^\d{1,3}(,\d{3})*\.\d+$", cleaned):
        cleaned = cleaned.replace(",", "")
    elif re.match(r"^\d{1,3}(\.\d{3})+$", cleaned):
        cleaned = cleaned.replace(".", "")
    else:
        cleaned = cleaned.replace(",", "")
    try:
        float(cleaned)
        return cleaned
    except ValueError:
        return s


def normalize_value(val, tipo_dato: str = "Texto") -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() == "nan":
        return None
    low = s.lower()
    if low in _NA_MAP:
        # Para campos numéricos N/A y similares deben ser NULL, no texto
        if tipo_dato in ("Entero", "Moneda"):
            return None
        return _NA_MAP[low]
    if tipo_dato == "Fecha":
        return _parse_date(s)
    if tipo_dato == "Moneda":
        return _parse_moneda(s)
    if tipo_dato == "Entero":
        cleaned = re.sub(r"[^\d\-]", "", s)
        return cleaned if cleaned else None
    return s


# ── Conexión a bases de datos ─────────────────────────────────────────────────

def connect_sqlite() -> sqlite3.Connection:
    if not SQLITE_PATH.exists():
        print(f"  ERROR: No se encontró SQLite en: {SQLITE_PATH}")
        sys.exit(1)
    conn = sqlite3.connect(str(SQLITE_PATH))
    conn.row_factory = sqlite3.Row
    print(f"  ✓ Conectado a SQLite: {SQLITE_PATH}")
    return conn


def connect_postgres():
    if not HAS_PSYCOPG2:
        print("  ERROR: psycopg2 no está instalado.\n    pip install psycopg2-binary")
        sys.exit(1)
    print()
    print("── Conexión PostgreSQL ──────────────────────────────────────────────")
    host     = input("  Host          : ").strip()
    port     = input("  Puerto [5432] : ").strip() or "5432"
    dbname   = input("  Base de datos : ").strip()
    user     = input("  Usuario       : ").strip()
    password = getpass.getpass("  Contraseña    : ")
    try:
        conn = psycopg2.connect(host=host, port=port, dbname=dbname,
                                user=user, password=password)
        print("  ✓ Conectado a PostgreSQL")
        return conn
    except Exception as e:
        print(f"  ERROR al conectar: {e}")
        sys.exit(1)


# ── Helpers de base de datos ──────────────────────────────────────────────────

def get_campo_types(conn, is_pg: bool) -> dict[str, str]:
    """Retorna {código_campo → tipo_dato}."""
    sql = "SELECT codigo, tipo_dato FROM campos"
    if is_pg:
        cur = conn.cursor()
        cur.execute(sql)
        return {r[0]: r[1] or "Texto" for r in cur.fetchall()}
    rows = conn.execute(sql).fetchall()
    return {r["codigo"]: r["tipo_dato"] or "Texto" for r in rows}


def get_db_columns(conn, is_pg: bool) -> set[str]:
    """Retorna el conjunto de nombres de columna que existen en la tabla registros."""
    if is_pg:
        cur = conn.cursor()
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'registros'"
        )
        # PostgreSQL almacena en minúsculas; normalizamos a mayúsculas para comparar
        return {r[0].upper() for r in cur.fetchall()}
    rows = conn.execute("PRAGMA table_info(registros)").fetchall()
    return {r[1].upper() for r in rows}


def reset_sequence_pg(conn):
    cur = conn.cursor()
    cur.execute(
        "SELECT setval(pg_get_serial_sequence('registros', 'id'), "
        "COALESCE((SELECT MAX(id) FROM registros), 1))"
    )


# ── Construcción de registros ─────────────────────────────────────────────────

def build_records(
    df: pd.DataFrame,
    tipo_map: dict[str, str],
) -> list[dict]:
    """
    Para cada fila del Excel:
      1. Obtiene el código de campo desde POSITION_MAP (por índice de columna).
      2. Traduce el código al nombre de columna DB usando _col() → CODE_TO_COLNAME.
      3. Normaliza el valor según el tipo de dato del campo.
    """
    col_values_list = list(df.columns)
    n_cols = len(col_values_list)
    records = []

    for _, row in df.iterrows():
        vals = list(row)
        if all(str(v).strip() in ("", "nan") for v in vals):
            continue

        record: dict = {
            "rol":              ROL_IMPORT,
            "usuario":          USUARIO_IMPORT,
            "fecha_creacion":   TODAY,
            "validado":         1,
            "fecha_validacion": TODAY,
            "validado_por":     USUARIO_IMPORT,
        }

        for col_idx, codigo in POSITION_MAP.items():
            if col_idx >= n_cols:
                continue
            raw     = vals[col_idx]
            tipo    = tipo_map.get(codigo, "Texto")
            val     = normalize_value(raw, tipo)
            db_col  = _col(codigo)          # código → nombre real de columna DB
            record[db_col] = val

        records.append(record)

    return records


# ── Vista previa ─────────────────────────────────────────────────────────────

# Campos clave a mostrar en terminal (nombres de columna DB)
_PREVIEW_COLS = [_col(c) for c in ["A", "B", "E", "I", "AG", "CE", "BY", "FX"]]


def show_preview(records: list[dict], n: int = 100) -> Path:
    sample = random.sample(records, min(n, len(records)))

    key_cols = [c for c in _PREVIEW_COLS
                if any(r.get(c) not in (None, "") for r in sample)]

    W   = 20
    sep = "─" * (W * len(key_cols) + 3 * (len(key_cols) - 1))
    print(f"\n{sep}")
    print(f"  VISTA PREVIA — {len(sample)} aleatorios  (terminal: primeros 20)")
    print(sep)
    print("  ".join(c[:W].ljust(W) for c in key_cols))
    print("  ".join("─" * W for _ in key_cols))
    for r in sample[:20]:
        print("  ".join(str(r.get(c) or "")[:W].ljust(W) for c in key_cols))
    if len(sample) > 20:
        print(f"  ... y {len(sample) - 20} registros más en el CSV")

    preview_path = Path("preview_importacion.csv")
    all_keys = sorted({k for r in sample for k in r})
    with open(preview_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=all_keys)
        writer.writeheader()
        for r in sample:
            writer.writerow({k: (r.get(k) or "") for k in all_keys})

    print(f"\n  Vista previa completa → {preview_path.resolve()}")
    return preview_path


# ── Inserción ─────────────────────────────────────────────────────────────────

BATCH_COMMIT = 100


def insert_records(
    records: list[dict],
    conn,
    is_pg: bool,
    db_columns: set[str],   # nombres en MAYÚSCULAS para comparar
) -> tuple[int, int, list[dict]]:
    ph       = "%s" if is_pg else "?"
    inserted = failed = 0
    cur      = conn.cursor() if is_pg else None
    errores: list[dict] = []

    total = len(records)
    for i, record in enumerate(records, 1):
        # Filtrar sólo columnas que existen en la DB (comparación en mayúsculas)
        filtered = {k: v for k, v in record.items() if k.upper() in db_columns}
        if not filtered:
            failed += 1
            motivo = "Ninguna clave coincide con columnas DB"
            errores.append({**record, "MOTIVO_ERROR": motivo})
            continue

        cols    = list(filtered)
        vals    = [filtered[c] for c in cols]
        # En PostgreSQL las columnas están en minúsculas
        col_sql = ", ".join(f'"{c.lower() if is_pg else c}"' for c in cols)
        val_sql = ", ".join([ph] * len(cols))
        sql     = f'INSERT INTO registros ({col_sql}) VALUES ({val_sql})'

        try:
            if is_pg:
                cur.execute("SAVEPOINT sp")
                cur.execute(sql, vals)
            else:
                conn.execute(sql, vals)
            inserted += 1
        except Exception as e:
            if is_pg:
                cur.execute("ROLLBACK TO SAVEPOINT sp")
            failed += 1
            errores.append({**record, "MOTIVO_ERROR": str(e)})

        if i % BATCH_COMMIT == 0:
            conn.commit()
            print(f"  Progreso: {i}/{total} ({inserted} OK, {failed} errores)")

    conn.commit()
    print(f"  Progreso: {total}/{total} ({inserted} OK, {failed} errores)")
    return inserted, failed, errores


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    excel_path = Path(sys.argv[1]) if len(sys.argv) > 1 else EXCEL_PATH

    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║         IMPORTADOR DE DATOS HISTÓRICOS — RUR                    ║")
    print("╚══════════════════════════════════════════════════════════════════╝")

    # 1. Elegir destino
    print("\n  ¿A qué base de datos desea importar?")
    print("  [1] Desarrollo — SQLite local")
    print("  [2] Producción — PostgreSQL")
    choice = input("\n  Elección [1/2]: ").strip()
    is_pg  = choice == "2"

    conn = connect_postgres() if is_pg else connect_sqlite()

    # 2. Leer Excel
    print(f"\n  Leyendo: {excel_path}")
    if not excel_path.exists():
        print(f"  ERROR: Archivo no encontrado: {excel_path}")
        conn.close()
        sys.exit(1)
    try:
        df = pd.read_excel(excel_path, dtype=str, keep_default_na=False)
    except Exception as e:
        print(f"  ERROR al leer el Excel: {e}")
        conn.close()
        sys.exit(1)
    print(f"  ✓ {len(df)} filas × {len(df.columns)} columnas")

    # 3. Cargar tipos de campo y columnas del destino
    tipo_map   = get_campo_types(conn, is_pg)
    db_columns = get_db_columns(conn, is_pg)   # en MAYÚSCULAS
    print(f"  ✓ {len(db_columns)} columnas en tabla registros")

    # 4. Mostrar mapa de columnas (primeras y últimas)
    mapped = [(i, cod, _col(cod)) for i, cod in POSITION_MAP.items()]
    print(f"\n── Mapeo posicional ({len(mapped)} columnas) ────────────────────────────")
    print(f"  {'Col':>4}  {'Código':6}  Columna DB")
    print(f"  {'─'*4}  {'─'*6}  {'─'*35}")
    muestra = mapped[:5] + [None] + mapped[-3:]
    for m in muestra:
        if m is None:
            print("  ...")
        else:
            i, cod, db = m
            print(f"  {i:>4}  {cod:6}  {db}")

    # 5. Construir registros
    records = build_records(df, tipo_map)
    print(f"\n  ✓ {len(records)} registros preparados "
          f"({len(df) - len(records)} filas vacías descartadas)")

    # 6. Verificar que las claves del primer registro coincidan con la DB
    if records:
        sample_keys = {k.upper() for k in records[0]}
        matched = sample_keys & db_columns
        not_found = sample_keys - db_columns - {"ROL", "USUARIO", "FECHA_CREACION",
                                                 "VALIDADO", "FECHA_VALIDACION", "VALIDADO_POR"}
        print(f"  ✓ {len(matched)} columnas del registro coinciden con la DB")
        if not_found:
            print(f"  ⚠ {len(not_found)} columnas del registro NO encontradas en DB "
                  f"(serán ignoradas): {', '.join(sorted(not_found)[:5])}...")

    # 7. Vista previa
    show_preview(records, n=100)

    # 8. Resumen y confirmación
    print(f"\n── Resumen de importación ───────────────────────────────────────────")
    print(f"  Destino     : {'PostgreSQL  (Producción)' if is_pg else 'SQLite  (Desarrollo)'}")
    print(f"  Registros   : {len(records)}")
    print(f"  Usuario     : {USUARIO_IMPORT}")
    print(f"  Rol         : {ROL_IMPORT}")
    print(f"  Fecha crea. : {TODAY}")
    print(f"  Validado    : Sí  (validado=1)")
    print(f"────────────────────────────────────────────────────────────────────")

    confirm = input("\n  Escriba SI para confirmar la importación: ").strip().upper()
    if confirm != "SI":
        print("  Importación cancelada.")
        conn.close()
        return

    # 9. Insertar
    print(f"\n  Insertando {len(records)} registros...")
    inserted, failed, errores = insert_records(records, conn, is_pg, db_columns)

    if is_pg and inserted > 0:
        try:
            reset_sequence_pg(conn)
            conn.commit()
        except Exception:
            pass

    print(f"\n── Resultado ────────────────────────────────────────────────────────")
    print(f"  ✓ Insertados : {inserted}")
    if failed:
        print(f"  ✗ Fallidos   : {failed}")

    # 10. Reporte de errores en Excel
    if errores:
        report_path = Path("reporte_errores_importacion.xlsx")
        df_err = pd.DataFrame(errores)
        # MOTIVO_ERROR al final
        other_cols = [c for c in df_err.columns if c != "MOTIVO_ERROR"]
        df_err[other_cols + ["MOTIVO_ERROR"]].to_excel(report_path, index=False)
        print(f"  ⚠ Reporte de errores → {report_path.resolve()}")

    print(f"────────────────────────────────────────────────────────────────────")
    conn.close()


if __name__ == "__main__":
    main()
