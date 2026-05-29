"""
test_audit_festivos_export.py — Tests para auditoría, festivos y exportación.
"""
import os
import pytest

ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")


@pytest.fixture(scope="module")
def admin(client):
    client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
    yield client


# ── Auditoría (audit_log) ─────────────────────────────────────────────────────

class TestAuditLog:
    def test_listar_audit_ok(self, ac):
        resp = ac.get("/api/admin/audit")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data

    def test_listar_audit_paginacion(self, ac):
        resp = ac.get("/api/admin/audit?page=1")
        assert resp.status_code == 200

    def test_listar_audit_filtro_usuario(self, ac):
        resp = ac.get("/api/admin/audit?usuario=admin")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data

    def test_listar_audit_filtro_accion(self, ac):
        resp = ac.get("/api/admin/audit?accion=creacion")
        assert resp.status_code == 200

    def test_listar_audit_filtro_tipo_autorizado(self, ac):
        resp = ac.get("/api/admin/audit?tipo=autorizado")
        assert resp.status_code == 200

    def test_listar_audit_filtro_tipo_tercero(self, ac):
        resp = ac.get("/api/admin/audit?tipo=tercero")
        assert resp.status_code == 200

    def test_listar_audit_filtro_consecutivo(self, ac):
        resp = ac.get("/api/admin/audit?consecutivo=BOG")
        assert resp.status_code == 200

    def test_export_audit_ok(self, ac):
        resp = ac.get("/api/admin/audit/export")
        assert resp.status_code == 200
        assert "spreadsheetml" in resp.headers.get("content-type", "")

    def test_export_audit_con_filtros(self, ac):
        resp = ac.get("/api/admin/audit/export?usuario=admin&tipo=autorizado")
        assert resp.status_code == 200

    def test_audit_sin_sesion(self, client):
        client.post("/api/logout")
        resp = client.get("/api/admin/audit")
        assert resp.status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Festivos ──────────────────────────────────────────────────────────────────

class TestFestivos:
    def test_formato_excel_ok(self, ac):
        resp = ac.get("/api/admin/festivos/formato")
        assert resp.status_code == 200
        assert "spreadsheetml" in resp.headers.get("content-type", "")

    def test_listar_festivos_ok(self, admin):
        resp = admin.get("/api/festivos")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_crear_festivo_ok(self, ac):
        resp = ac.post("/api/admin/festivos", json={"fecha": "2027-01-01"})
        assert resp.status_code in (201, 409)

    def test_crear_festivo_formato_invalido(self, ac):
        resp = ac.post("/api/admin/festivos", json={"fecha": "01/01/2027"})
        assert resp.status_code == 400

    def test_crear_festivo_sin_fecha(self, ac):
        resp = ac.post("/api/admin/festivos", json={})
        assert resp.status_code == 400

    def test_crear_festivo_duplicado(self, ac):
        ac.post("/api/admin/festivos", json={"fecha": "2027-03-19"})
        resp = ac.post("/api/admin/festivos", json={"fecha": "2027-03-19"})
        assert resp.status_code == 409

    def test_actualizar_festivo_ok(self, ac):
        r = ac.post("/api/admin/festivos", json={"fecha": "2027-04-01"})
        if r.status_code == 409:
            festivos = ac.get("/api/festivos").json()
            fid = next((f["id"] for f in festivos if f["fecha"] == "2027-04-01"), None)
        else:
            fid = r.json()["id"]
        if fid:
            resp = ac.put(f"/api/admin/festivos/{fid}", json={"fecha": "2027-04-02"})
            assert resp.status_code == 200

    def test_actualizar_festivo_no_existe(self, ac):
        resp = ac.put("/api/admin/festivos/9999999", json={"fecha": "2027-06-01"})
        assert resp.status_code == 404

    def test_actualizar_festivo_formato_invalido(self, ac):
        festivos = ac.get("/api/festivos").json()
        if not festivos:
            pytest.skip("No hay festivos")
        fid = festivos[0]["id"]
        resp = ac.put(f"/api/admin/festivos/{fid}", json={"fecha": "01-01-2027"})
        assert resp.status_code == 400

    def test_eliminar_festivo_ok(self, ac):
        r = ac.post("/api/admin/festivos", json={"fecha": "2027-09-20"})
        if r.status_code == 409:
            festivos = ac.get("/api/festivos").json()
            fid = next((f["id"] for f in festivos if f["fecha"] == "2027-09-20"), None)
        else:
            fid = r.json()["id"]
        if fid:
            resp = ac.delete(f"/api/admin/festivos/{fid}")
            assert resp.status_code == 200

    def test_eliminar_festivo_no_existe(self, ac):
        resp = ac.delete("/api/admin/festivos/9999999")
        assert resp.status_code == 404

    def test_festivos_sin_sesion(self, client):
        client.post("/api/logout")
        resp = client.get("/api/festivos")
        assert resp.status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Exportar registros ────────────────────────────────────────────────────────

class TestExportarRegistros:
    def test_exportar_con_ids(self, admin):
        r = admin.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "900998877"}},
        )
        assert r.status_code == 200
        rid = r.json()["id"]
        resp = admin.get(f"/api/registros/exportar/GESTOR%201?ids={rid}")
        assert resp.status_code == 200
        assert "spreadsheetml" in resp.headers.get("content-type", "")

    def test_exportar_rol_ok(self, admin):
        resp = admin.get("/api/registros/exportar/GESTOR%201")
        assert resp.status_code in (200, 404)
        if resp.status_code == 200:
            assert "spreadsheetml" in resp.headers.get("content-type", "")

    def test_exportar_rol_contralor(self, admin):
        resp = admin.get("/api/registros/exportar/CONTRALOR")
        assert resp.status_code in (200, 404)

    def test_exportar_sin_sesion(self, client):
        client.post("/api/logout")
        try:
            resp = client.get("/api/registros/exportar/GESTOR%201")
            assert resp.status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
