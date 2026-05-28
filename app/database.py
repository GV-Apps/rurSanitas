"""
database.py — Dependencia FastAPI para obtener conexión a la base de datos.

Desarrollo  → SQLite  (DB_PATH/formularios.db)
Producción  → PostgreSQL vía psycopg2 (DATABASE_URL=postgresql://...)

Uso en rutas:
    from app.database import get_db
    def mi_ruta(db = Depends(get_db)):
        rows = db.execute("SELECT ...").fetchall()
"""
import sqlite3
from typing import Generator

from app.config import DATABASE_URL, DB_PATH


# ---------------------------------------------------------------------------
# Adaptador de Row para PostgreSQL (imita sqlite3.Row con acceso por nombre)
# ---------------------------------------------------------------------------
class _PgRow(dict):
    """Wrapper de dict que permite acceso por índice numérico y por nombre.
    La búsqueda por string es case-insensitive: PostgreSQL almacena columnas
    en minúsculas pero el código usa F._col() que devuelve MAYÚSCULAS.
    """
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        try:
            return super().__getitem__(key)
        except KeyError:
            if isinstance(key, str):
                return super().__getitem__(key.lower())
            raise

    def keys(self):  # noqa: D102
        return super().keys()


class _PgConnection:
    """Wrapper de psycopg2 connection que imita la API sqlite3 (execute, row_factory)."""

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql: str, params=()):
        # Convertir placeholders ? → %s para PostgreSQL
        pg_sql = sql.replace("?", "%s")
        # Convertir función SQLite → equivalente PostgreSQL
        pg_sql = pg_sql.replace("last_insert_rowid()", "lastval()")
        cur = self._conn.cursor()
        cur.execute(pg_sql, params)
        return _PgCursor(cur)

    def executemany(self, sql: str, param_list):
        pg_sql = sql.replace("?", "%s")
        cur = self._conn.cursor()
        cur.executemany(pg_sql, param_list)
        return cur

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()

    # Para compatibilidad con PRAGMA (SQLite-only)
    def _is_pg(self):
        return True


class _PgCursor:
    """Cursor wrapper que retorna _PgRow en fetchone/fetchall."""

    def __init__(self, cur):
        self._cur = cur
        self._description = cur.description

    def fetchone(self):
        row = self._cur.fetchone()
        if row is None:
            return None
        if self._description:
            return _PgRow(zip([d[0] for d in self._description], row))
        return row

    def fetchall(self):
        rows = self._cur.fetchall()
        if not rows:
            return []
        if self._description:
            cols = [d[0] for d in self._description]
            return [_PgRow(zip(cols, r)) for r in rows]
        return rows

    def __iter__(self):
        for row in self._cur:
            if self._description:
                cols = [d[0] for d in self._description]
                yield _PgRow(zip(cols, row))
            else:
                yield row

    # Permite usar el cursor como resultado de execute (compatibilidad sqlite3)
    def __getitem__(self, idx):
        return self.fetchall()[idx]


# ---------------------------------------------------------------------------
# Dependencia principal
# ---------------------------------------------------------------------------
def get_db() -> Generator:
    """
    Retorna una conexión a SQLite o PostgreSQL según DATABASE_URL.
    Diseñada para usarse como Depends() en FastAPI.
    """
    if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
        try:
            import psycopg2
        except ImportError as e:
            raise RuntimeError(
                "psycopg2 no está instalado. Ejecuta: pip install psycopg2-binary"
            ) from e

        raw_conn = psycopg2.connect(DATABASE_URL)
        conn = _PgConnection(raw_conn)
        try:
            yield conn
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
