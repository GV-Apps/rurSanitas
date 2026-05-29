"""
test_festivos_cargar.py — Tests para POST /api/admin/festivos/cargar.

El endpoint acepta un Excel con una columna FECHA (o usa la primera columna)
y soporta formatos DD/MM/AAAA, AAAA-MM-DD y objetos datetime de pandas.
"""
import io
import pytest
import openpyxl


_XLSX_CT = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _make_festivos_xlsx(fechas: list, col_header: str = "FECHA") -> bytes:
    """Crea un xlsx válido con una columna de fechas."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append([col_header])
    for f in fechas:
        ws.append([f])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


class TestFestivosCargar:
    def test_extension_invalida_retorna_400(self, ac):
        resp = ac.post(
            "/api/admin/festivos/cargar",
            files={"archivo": ("festivos.txt", b"not excel", "text/plain")},
        )
        assert resp.status_code == 400

    def test_cargar_formato_iso_ok(self, ac):
        """Fechas en formato YYYY-MM-DD son aceptadas."""
        xlsx = _make_festivos_xlsx(["2099-06-15", "2099-07-20"])
        resp = ac.post(
            "/api/admin/festivos/cargar",
            files={"archivo": ("festivos.xlsx", xlsx, _XLSX_CT)},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "insertados" in data
        assert data["insertados"] >= 0

    def test_cargar_formato_dia_mes_anio_ok(self, ac):
        """Fechas en formato DD/MM/YYYY son aceptadas."""
        xlsx = _make_festivos_xlsx(["15/06/2098", "20/07/2098"])
        resp = ac.post(
            "/api/admin/festivos/cargar",
            files={"archivo": ("festivos.xlsx", xlsx, _XLSX_CT)},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "insertados" in data

    def test_cargar_fechas_duplicadas_reporta_duplicados(self, ac):
        """Fechas ya existentes aparecen en la lista de duplicados."""
        fecha = "2099-06-15"
        xlsx = _make_festivos_xlsx([fecha])
        resp = ac.post(
            "/api/admin/festivos/cargar",
            files={"archivo": ("festivos.xlsx", xlsx, _XLSX_CT)},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert fecha in data.get("duplicados", []) or data.get("insertados", 0) == 0

    def test_cargar_formato_invalido_reporta_errores(self, ac):
        """Fechas con formato no reconocido van a la lista de errores."""
        xlsx = _make_festivos_xlsx(["no-es-fecha", "tampoco"])
        resp = ac.post(
            "/api/admin/festivos/cargar",
            files={"archivo": ("festivos.xlsx", xlsx, _XLSX_CT)},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data.get("errores", [])) > 0

    def test_cargar_sin_columna_fecha_usa_primera_columna(self, ac):
        """Si no hay columna FECHA, usa la primera columna disponible."""
        xlsx = _make_festivos_xlsx(["2099-08-10"], col_header="OTRA_COL")
        resp = ac.post(
            "/api/admin/festivos/cargar",
            files={"archivo": ("festivos.xlsx", xlsx, _XLSX_CT)},
        )
        assert resp.status_code == 200

    def test_cargar_requiere_admin(self, client):
        import os
        client.post("/api/logout")
        xlsx = _make_festivos_xlsx(["2099-01-01"])
        resp = client.post(
            "/api/admin/festivos/cargar",
            files={"archivo": ("festivos.xlsx", xlsx, _XLSX_CT)},
        )
        assert resp.status_code in (401, 403)
        ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})

    def test_cargar_filas_vacias_son_ignoradas(self, ac):
        """Filas con fecha None/vacía se ignoran sin error."""
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["FECHA"])
        ws.append([None])
        ws.append(["2099-09-01"])
        buf = io.BytesIO()
        wb.save(buf)
        resp = ac.post(
            "/api/admin/festivos/cargar",
            files={"archivo": ("festivos.xlsx", buf.getvalue(), _XLSX_CT)},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "insertados" in data
