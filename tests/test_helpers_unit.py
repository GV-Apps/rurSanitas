"""
test_helpers_unit.py — Tests unitarios para helpers puros de app/core/helpers.py
y app/routers/registros.py.

Cubre: _store_report(db=None), _dv_str, _nit_norm, _int_perm, _n_requiere_aprobacion,
get_visibility_filter (admin/CONTRALOR), can_edit_registro, _registrar_audit (no diff).
"""
import math
import sqlite3
from datetime import date, timedelta, datetime

import pytest

from app.core.helpers import (
    _store_report,
    _dv_str,
    _nit_norm,
    _int_perm,
    _reports,
)
from app.routers.registros import _n_requiere_aprobacion


# ---------------------------------------------------------------------------
# _store_report — fallback a memoria cuando db=None
# ---------------------------------------------------------------------------
class TestStoreReportMemoria:
    def test_db_none_retorna_token(self):
        token = _store_report(b"excel_bytes", db=None)
        assert isinstance(token, str) and len(token) > 10

    def test_db_none_almacena_en_reports(self):
        token = _store_report(b"data_test", db=None)
        assert token in _reports
        _ts, data = _reports[token]
        assert data == b"data_test"

    def test_db_none_vacio_bytes(self):
        token = _store_report(b"", db=None)
        assert isinstance(token, str)

    def test_dos_llamadas_generan_tokens_distintos(self):
        t1 = _store_report(b"a", db=None)
        t2 = _store_report(b"b", db=None)
        assert t1 != t2


# ---------------------------------------------------------------------------
# _dv_str — normalización de dígito de verificación
# ---------------------------------------------------------------------------
class TestDvStr:
    def test_none_retorna_none(self):
        assert _dv_str(None) is None

    def test_nan_retorna_none(self):
        assert _dv_str(float("nan")) is None

    def test_entero_retorna_string(self):
        assert _dv_str(7) == "7"

    def test_float_redondea(self):
        assert _dv_str(3.9) == "3"

    def test_string_numerico(self):
        assert _dv_str("5") == "5"

    def test_string_no_numerico_retorna_tal_cual(self):
        assert _dv_str("ABC") == "ABC"

    def test_string_vacio_retorna_none(self):
        assert _dv_str("") is None

    def test_string_solo_espacios_retorna_none(self):
        assert _dv_str("   ") is None


# ---------------------------------------------------------------------------
# _nit_norm — normalización de NIT
# ---------------------------------------------------------------------------
class TestNitNorm:
    def test_none_retorna_none(self):
        assert _nit_norm(None) is None

    def test_entero_retorna_string(self):
        assert _nit_norm(800100200) == "800100200"

    def test_float_retorna_string_entero(self):
        assert _nit_norm(800100200.0) == "800100200"

    def test_string_numerico(self):
        assert _nit_norm("900123456") == "900123456"

    def test_string_con_guion(self):
        result = _nit_norm("900-123-456")
        assert isinstance(result, str) and len(result) > 0

    def test_string_vacio_retorna_none(self):
        assert _nit_norm("") is None


# ---------------------------------------------------------------------------
# _int_perm — conversión de permisos a 0/1
# ---------------------------------------------------------------------------
class TestIntPerm:
    def test_none_retorna_0(self):
        assert _int_perm(None) == 0

    def test_nan_retorna_0(self):
        assert _int_perm(float("nan")) == 0

    def test_string_no_numerico_retorna_0(self):
        assert _int_perm("xyz") == 0

    def test_valor_1_retorna_1(self):
        assert _int_perm(1) == 1

    def test_valor_mayor_1_retorna_1(self):
        assert _int_perm(99) == 1

    def test_valor_0_retorna_0(self):
        assert _int_perm(0) == 0

    def test_string_numerico_1(self):
        assert _int_perm("1") == 1


# ---------------------------------------------------------------------------
# _n_requiere_aprobacion — lógica de fecha N
# ---------------------------------------------------------------------------
class TestNRequiereAprobacion:
    def test_vacio_retorna_false(self):
        assert _n_requiere_aprobacion("") is False

    def test_none_retorna_false(self):
        assert _n_requiere_aprobacion(None) is False

    def test_formato_invalido_retorna_false(self):
        assert _n_requiere_aprobacion("no-es-fecha") is False

    def test_fecha_reciente_retorna_false(self):
        hoy = date.today().isoformat()
        assert _n_requiere_aprobacion(hoy) is False

    def test_fecha_antigua_retorna_true(self):
        antigua = (date.today() - timedelta(days=20)).isoformat()
        assert _n_requiere_aprobacion(antigua) is True

    def test_exactamente_14_dias_retorna_false(self):
        exacta = (date.today() - timedelta(days=14)).isoformat()
        assert _n_requiere_aprobacion(exacta) is False

    def test_15_dias_retorna_true(self):
        quince = (date.today() - timedelta(days=15)).isoformat()
        assert _n_requiere_aprobacion(quince) is True
