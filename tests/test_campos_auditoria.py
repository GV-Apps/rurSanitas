"""
test_campos_auditoria.py — Tests para administración de campos del formulario
y auditoría de registros.
"""
import os
import pytest

ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")


@pytest.fixture(scope="module")
def admin(client):
    client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
    yield client


# ── Administración de campos ──────────────────────────────────────────────────

class TestCamposAdmin:
    def test_listar_campos_ok(self, ac):
        resp = ac.get("/api/admin/campos")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) > 0

    def test_crear_campo_ok(self, ac):
        resp = ac.post(
            "/api/admin/campos",
            json={
                "codigo": "ZZ",
                "nombre": "Campo Test ZZ",
                "tipo_dato": "Texto",
                "rol": "GESTOR 1",
            },
        )
        assert resp.status_code in (201, 409)

    def test_crear_campo_codigo_invalido(self, ac):
        resp = ac.post(
            "/api/admin/campos",
            json={
                "codigo": "campo invalido!!",
                "nombre": "Campo Invalido",
                "tipo_dato": "Texto",
                "rol": "GESTOR 1",
            },
        )
        assert resp.status_code == 400

    def test_crear_campo_sin_codigo(self, ac):
        resp = ac.post(
            "/api/admin/campos",
            json={"nombre": "Sin Codigo", "tipo_dato": "Texto", "rol": "GESTOR 1"},
        )
        assert resp.status_code == 400

    def test_crear_campo_sin_nombre(self, ac):
        resp = ac.post(
            "/api/admin/campos",
            json={"codigo": "ZY", "tipo_dato": "Texto", "rol": "GESTOR 1"},
        )
        assert resp.status_code == 400

    def test_crear_campo_sin_rol(self, ac):
        resp = ac.post(
            "/api/admin/campos",
            json={"codigo": "ZX", "nombre": "Sin Rol", "tipo_dato": "Texto"},
        )
        assert resp.status_code == 400

    def test_crear_campo_rol_invalido(self, ac):
        resp = ac.post(
            "/api/admin/campos",
            json={"codigo": "ZW", "nombre": "Rol Inval", "tipo_dato": "Texto", "rol": "ROL_INVALIDO"},
        )
        assert resp.status_code == 400

    def test_actualizar_campo_ok(self, ac):
        campos = ac.get("/api/admin/campos").json()
        cid = campos[0]["id"]
        nombre_orig = campos[0]["nombre"]
        rol_orig = campos[0]["rol"] or "GESTOR 1"
        resp = ac.put(
            f"/api/admin/campos/{cid}",
            json={"nombre": nombre_orig, "rol": rol_orig},
        )
        assert resp.status_code == 200

    def test_actualizar_campo_no_existe(self, ac):
        resp = ac.put(
            "/api/admin/campos/9999999",
            json={"nombre": "No existe", "rol": "GESTOR 1"},
        )
        assert resp.status_code == 404

    def test_actualizar_campo_sin_nombre(self, ac):
        campos = ac.get("/api/admin/campos").json()
        cid = campos[0]["id"]
        resp = ac.put(f"/api/admin/campos/{cid}", json={"nombre": "", "rol": "GESTOR 1"})
        assert resp.status_code == 400

    def test_reordenar_campos(self, ac):
        campos = ac.get("/api/admin/campos").json()
        ids = [c["id"] for c in campos[:3]]
        resp = ac.post("/api/admin/campos/reorder", json={"ids": ids})
        assert resp.status_code == 200

    def test_reordenar_vacio(self, ac):
        resp = ac.post("/api/admin/campos/reorder", json={"ids": []})
        assert resp.status_code == 400

    def test_eliminar_campo_ok(self, ac):
        r = ac.post(
            "/api/admin/campos",
            json={"codigo": "YZ", "nombre": "Campo Para Eliminar", "tipo_dato": "Texto", "rol": "GESTOR 1"},
        )
        if r.status_code == 201:
            cid = r.json()["id"]
            resp = ac.delete(f"/api/admin/campos/{cid}")
            assert resp.status_code == 200
            assert "eliminado" in resp.json()["mensaje"].lower()

    def test_eliminar_campo_no_existe(self, ac):
        resp = ac.delete("/api/admin/campos/9999999")
        assert resp.status_code == 404

    def test_campos_sin_sesion(self, client):
        client.post("/api/logout")
        resp = client.get("/api/admin/campos")
        assert resp.status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Auditoría de registros ────────────────────────────────────────────────────

class TestAuditoriaRegistros:
    @pytest.fixture(scope="class")
    def registro_sin_ag(self, client):
        """Crea un registro sin campo AG (responsable)."""
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
        r = client.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "900123001"}},
        )
        assert r.status_code == 200
        return r.json()["id"]

    def test_crear_auditoria_sin_responsable(self, ac, registro_sin_ag):
        resp = ac.post(
            f"/api/auditoria/registro/{registro_sin_ag}",
            json={"comentario": "Auditoría de prueba"},
        )
        assert resp.status_code == 400

    def test_crear_auditoria_registro_no_existe(self, ac):
        resp = ac.post(
            "/api/auditoria/registro/9999999",
            json={"comentario": "Auditoría de prueba"},
        )
        assert resp.status_code == 404

    def test_crear_auditoria_sin_comentario(self, ac, registro_sin_ag):
        resp = ac.post(
            f"/api/auditoria/registro/{registro_sin_ag}",
            json={"comentario": ""},
        )
        assert resp.status_code == 400

    def test_listar_auditorias_admin(self, ac):
        resp = ac.get("/api/auditoria/activas")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_mis_auditorias_pendientes(self, ac):
        resp = ac.get("/api/auditoria/mis-pendientes")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_historial_auditoria_registro(self, ac, registro_sin_ag):
        resp = ac.get(f"/api/auditoria/registro/{registro_sin_ag}/historial")
        assert resp.status_code in (200, 403)

    def test_historial_registro_no_existe(self, ac):
        resp = ac.get("/api/auditoria/registro/9999999/historial")
        assert resp.status_code in (200, 403, 404)

    def test_auditoria_sin_sesion(self, client):
        client.post("/api/logout")
        try:
            resp = client.get("/api/auditoria/activas")
            assert resp.status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
