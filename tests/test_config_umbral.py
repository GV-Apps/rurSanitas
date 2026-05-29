"""
test_config_umbral.py — Tests para /api/config-umbral-lider (usuario y admin).
Cubre: get config vacía, get/put config umbral, validaciones, auth.
"""
import os
import pytest

ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")


def _get_moneda_campo(ac):
    """Retorna el código de un campo Moneda si existe, o None."""
    resp = ac.get("/api/admin/config-umbral-lider/campos-moneda")
    assert resp.status_code == 200
    campos = resp.json()
    return campos[0]["codigo"] if campos else None


def _get_no_moneda_campo(ac):
    """Retorna el código de un campo que NO sea Moneda (primer campo disponible)."""
    resp = ac.get("/api/admin/campos")
    assert resp.status_code == 200
    for campo in resp.json():
        if campo.get("tipo_dato") != "Moneda":
            return campo["codigo"]
    return None


class TestGetConfigUmbral:
    def test_get_config_vacia(self, ac):
        # Desactivar primero para asegurarse de que no hay config activa
        ac.put("/api/admin/config-umbral-lider", json={"activo": False})
        resp = ac.get("/api/config-umbral-lider")
        assert resp.status_code == 200
        data = resp.json()
        assert data["activo"] is False
        assert data["campo_codigo"] is None
        assert data["umbral"] is None

    def test_get_config_sin_sesion(self, client):
        client.post("/api/logout")
        try:
            assert client.get("/api/config-umbral-lider").status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


class TestGetCamposMoneda:
    def test_get_campos_moneda_ok(self, ac):
        resp = ac.get("/api/admin/config-umbral-lider/campos-moneda")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        for campo in data:
            assert "codigo" in campo
            assert "nombre" in campo

    def test_get_campos_moneda_sin_sesion(self, client):
        client.post("/api/logout")
        try:
            assert client.get("/api/admin/config-umbral-lider/campos-moneda").status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


class TestPutConfigUmbral:
    def test_put_desactivar(self, ac):
        resp = ac.put("/api/admin/config-umbral-lider", json={"activo": False})
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["activo"] is False

    def test_put_campo_vacio(self, ac):
        resp = ac.put(
            "/api/admin/config-umbral-lider",
            json={"campo_codigo": "", "umbral": 1000, "activo": True},
        )
        assert resp.status_code == 200
        assert resp.json()["activo"] is False

    def test_put_campo_no_existe(self, ac):
        resp = ac.put(
            "/api/admin/config-umbral-lider",
            json={"campo_codigo": "ZZZZZZ", "umbral": 1000, "activo": True},
        )
        assert resp.status_code == 400
        assert "no existe" in resp.json()["detail"].lower()

    def test_put_campo_no_moneda(self, ac):
        campo = _get_no_moneda_campo(ac)
        if not campo:
            pytest.skip("No hay campos de tipo no-Moneda disponibles")
        resp = ac.put(
            "/api/admin/config-umbral-lider",
            json={"campo_codigo": campo, "umbral": 1000, "activo": True},
        )
        assert resp.status_code == 400
        assert "moneda" in resp.json()["detail"].lower()

    def test_put_umbral_invalido_string(self, ac):
        campo = _get_moneda_campo(ac)
        if not campo:
            pytest.skip("No hay campos de tipo Moneda disponibles")
        resp = ac.put(
            "/api/admin/config-umbral-lider",
            json={"campo_codigo": campo, "umbral": "no_numero", "activo": True},
        )
        assert resp.status_code == 400
        assert "número" in resp.json()["detail"].lower()

    def test_put_umbral_negativo(self, ac):
        campo = _get_moneda_campo(ac)
        if not campo:
            pytest.skip("No hay campos de tipo Moneda disponibles")
        resp = ac.put(
            "/api/admin/config-umbral-lider",
            json={"campo_codigo": campo, "umbral": -500, "activo": True},
        )
        assert resp.status_code == 400
        assert "negativo" in resp.json()["detail"].lower()

    def test_put_config_ok(self, ac):
        campo = _get_moneda_campo(ac)
        if not campo:
            pytest.skip("No hay campos de tipo Moneda disponibles")
        resp = ac.put(
            "/api/admin/config-umbral-lider",
            json={"campo_codigo": campo, "umbral": 50000.0, "activo": True},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["activo"] is True
        assert data["campo_codigo"] == campo
        assert data["umbral"] == 50000.0

    def test_put_config_get_refleja_cambio(self, ac):
        campo = _get_moneda_campo(ac)
        if not campo:
            pytest.skip("No hay campos de tipo Moneda disponibles")
        ac.put(
            "/api/admin/config-umbral-lider",
            json={"campo_codigo": campo, "umbral": 75000, "activo": True},
        )
        resp = ac.get("/api/config-umbral-lider")
        assert resp.status_code == 200
        data = resp.json()
        assert data["activo"] is True
        assert data["campo_codigo"] == campo
        assert data["umbral"] == 75000.0

    def test_put_upsert_segunda_vez(self, ac):
        campo = _get_moneda_campo(ac)
        if not campo:
            pytest.skip("No hay campos de tipo Moneda disponibles")
        # Primera configuración
        ac.put(
            "/api/admin/config-umbral-lider",
            json={"campo_codigo": campo, "umbral": 10000, "activo": True},
        )
        # Segunda configuración (actualiza la misma fila)
        resp = ac.put(
            "/api/admin/config-umbral-lider",
            json={"campo_codigo": campo, "umbral": 20000, "activo": True},
        )
        assert resp.status_code == 200
        assert resp.json()["umbral"] == 20000.0

    def test_put_sin_sesion(self, client):
        client.post("/api/logout")
        try:
            resp = client.put(
                "/api/admin/config-umbral-lider",
                json={"campo_codigo": "M", "umbral": 1000, "activo": True},
            )
            assert resp.status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
