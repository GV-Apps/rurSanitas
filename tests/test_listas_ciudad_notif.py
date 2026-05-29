"""
test_listas_ciudad_notif.py — Tests para listas de opciones, códigos de ciudad
y notificaciones de usuario.
"""
import os
import pytest

ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")


@pytest.fixture(scope="module")
def admin(client):
    client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
    yield client


# ── Listas de opciones ────────────────────────────────────────────────────────

class TestListas:
    def test_listar_listas_ok(self, ac):
        resp = ac.get("/api/admin/listas")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_listar_listas_sin_sesion(self, client):
        client.post("/api/logout")
        resp = client.get("/api/admin/listas")
        assert resp.status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})

    def test_listar_opciones_codigo_existente(self, ac):
        listas = ac.get("/api/admin/listas").json()
        if not listas:
            pytest.skip("No hay listas configuradas")
        codigo = listas[0]["codigo"]
        resp = ac.get(f"/api/admin/listas/{codigo}")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_listar_opciones_codigo_inexistente(self, ac):
        resp = ac.get("/api/admin/listas/CODIGO_INEXISTENTE_XYZ")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_agregar_opcion_campo_no_existe(self, ac):
        resp = ac.post(
            "/api/admin/listas/CAMPO_FAKE_XYZ/agregar",
            json={"valor": "VALOR TEST"},
        )
        assert resp.status_code == 404

    def test_agregar_opcion_valor_vacio(self, ac):
        listas = ac.get("/api/admin/listas").json()
        if not listas:
            pytest.skip("No hay listas configuradas")
        codigo = listas[0]["codigo"]
        resp = ac.post(f"/api/admin/listas/{codigo}/agregar", json={"valor": ""})
        assert resp.status_code == 400

    def test_agregar_y_eliminar_opcion(self, ac):
        listas = ac.get("/api/admin/listas").json()
        if not listas:
            pytest.skip("No hay listas configuradas")
        codigo = listas[0]["codigo"]
        r_add = ac.post(
            f"/api/admin/listas/{codigo}/agregar",
            json={"valor": "VALOR_TEST_TEMP_999"},
        )
        if r_add.status_code == 409:
            opciones = ac.get(f"/api/admin/listas/{codigo}").json()
            opcion_id = next((o["id"] for o in opciones if o["valor"] == "VALOR_TEST_TEMP_999"), None)
        else:
            assert r_add.status_code == 200
            opciones = ac.get(f"/api/admin/listas/{codigo}").json()
            opcion_id = next((o["id"] for o in opciones if o["valor"] == "VALOR_TEST_TEMP_999"), None)

        if opcion_id:
            r_del = ac.delete(f"/api/admin/listas/opcion/{opcion_id}")
            assert r_del.status_code == 200

    def test_toggle_opcion(self, ac):
        listas = ac.get("/api/admin/listas").json()
        if not listas:
            pytest.skip("No hay listas configuradas")
        codigo = listas[0]["codigo"]
        ac.post(
            f"/api/admin/listas/{codigo}/agregar",
            json={"valor": "VALOR_TOGGLE_TEST_888"},
        )
        opciones = ac.get(f"/api/admin/listas/{codigo}").json()
        opcion = next((o for o in opciones if o["valor"] == "VALOR_TOGGLE_TEST_888"), None)
        if not opcion:
            pytest.skip("No se pudo crear la opción para toggle")
        resp = ac.put(f"/api/admin/listas/opcion/{opcion['id']}/toggle")
        assert resp.status_code == 200
        assert "activo" in resp.json()

    def test_eliminar_opcion_no_existe(self, ac):
        resp = ac.delete("/api/admin/listas/opcion/9999999")
        assert resp.status_code == 404

    def test_toggle_opcion_no_existe(self, ac):
        resp = ac.put("/api/admin/listas/opcion/9999999/toggle")
        assert resp.status_code == 404


# ── Códigos de ciudad ─────────────────────────────────────────────────────────

class TestCiudadCodigos:
    def test_listar_ok(self, admin):
        resp = admin.get("/api/ciudad-codigos")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_por_ciudad_ok(self, admin):
        resp = admin.get("/api/ciudad-codigos/por-ciudad?ciudad=BOGOTA")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_por_ciudad_vacia(self, admin):
        resp = admin.get("/api/ciudad-codigos/por-ciudad?ciudad=")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_crear_ok(self, ac):
        resp = ac.post(
            "/api/ciudad-codigos",
            json={"ciudad": "CIUDAD TEST", "codigo": "CT"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert data["ciudad"] == "CIUDAD TEST"
        assert data["codigo"] == "CT"

    def test_crear_sin_ciudad(self, ac):
        resp = ac.post("/api/ciudad-codigos", json={"codigo": "XX"})
        assert resp.status_code == 400

    def test_crear_sin_codigo(self, ac):
        resp = ac.post("/api/ciudad-codigos", json={"ciudad": "SIN CODIGO"})
        assert resp.status_code == 400

    def test_actualizar_ok(self, ac):
        r = ac.post("/api/ciudad-codigos", json={"ciudad": "CIUDAD UPDT", "codigo": "CU"})
        cid = r.json()["id"]
        resp = ac.put(
            f"/api/ciudad-codigos/{cid}",
            json={"ciudad": "CIUDAD UPDT MOD", "codigo": "CM", "activo": 1},
        )
        assert resp.status_code == 200

    def test_eliminar_ok(self, ac):
        r = ac.post("/api/ciudad-codigos", json={"ciudad": "CIUDAD DEL", "codigo": "CD"})
        cid = r.json()["id"]
        resp = ac.delete(f"/api/ciudad-codigos/{cid}")
        assert resp.status_code == 200

    def test_sin_sesion(self, client):
        client.post("/api/logout")
        resp = client.get("/api/ciudad-codigos")
        assert resp.status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Notificaciones ────────────────────────────────────────────────────────────

class TestNotificaciones:
    def test_listar_ok(self, admin):
        resp = admin.get("/api/notificaciones")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_historial_todas(self, admin):
        resp = admin.get("/api/notificaciones/historial?filtro=todas")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_historial_leidas(self, admin):
        resp = admin.get("/api/notificaciones/historial?filtro=leidas")
        assert resp.status_code == 200

    def test_historial_no_leidas(self, admin):
        resp = admin.get("/api/notificaciones/historial?filtro=no_leidas")
        assert resp.status_code == 200

    def test_count_no_leidas(self, admin):
        resp = admin.get("/api/notificaciones/no-leidas")
        assert resp.status_code == 200
        assert "count" in resp.json()

    def test_marcar_todas_leidas(self, admin):
        resp = admin.put("/api/notificaciones/leer-todas")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_marcar_leida_no_existe(self, admin):
        resp = admin.put("/api/notificaciones/9999999/leer")
        assert resp.status_code == 200

    def test_eliminar_no_existe(self, admin):
        resp = admin.delete("/api/notificaciones/9999999")
        assert resp.status_code == 200

    def test_sin_sesion(self, client):
        client.post("/api/logout")
        resp = client.get("/api/notificaciones")
        assert resp.status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
