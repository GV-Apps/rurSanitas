"""
test_campos_roles.py — Tests para /api/roles, /api/campo-reglas,
/api/campos/{rol} y /api/campos-secciones/{rol}.
"""
import os

ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")


class TestApiRoles:
    def test_roles_admin(self, ac):
        resp = ac.get("/api/roles")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_roles_sin_sesion(self, client):
        client.post("/api/logout")
        try:
            assert client.get("/api/roles").status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


class TestCampoReglas:
    def test_campo_reglas_ok(self, ac):
        resp = ac.get("/api/campo-reglas")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_campo_reglas_estructura(self, ac):
        resp = ac.get("/api/campo-reglas")
        assert resp.status_code == 200
        data = resp.json()
        if data:
            first = data[0]
            assert "codigo" in first
            assert "nombre" in first

    def test_campo_reglas_sin_sesion(self, client):
        client.post("/api/logout")
        try:
            assert client.get("/api/campo-reglas").status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


class TestCamposPorRol:
    def test_campos_gestor1(self, ac):
        resp = ac.get("/api/campos/GESTOR%201")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_campos_gestor2(self, ac):
        resp = ac.get("/api/campos/GESTOR%202")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_campos_lider(self, ac):
        resp = ac.get("/api/campos/LIDER")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # LIDER combina GESTOR 2 + LIDER sin duplicados
        assert len(data) > 0

    def test_campos_contralor(self, ac):
        resp = ac.get("/api/campos/CONTRALOR")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_campos_estructura_campo(self, ac):
        resp = ac.get("/api/campos/GESTOR%201")
        data = resp.json()
        if data:
            campo = data[0]
            assert "codigo" in campo
            assert "nombre" in campo

    def test_campos_rol_desconocido(self, ac):
        resp = ac.get("/api/campos/ROL_INEXISTENTE")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_campos_sin_sesion(self, client):
        client.post("/api/logout")
        try:
            assert client.get("/api/campos/GESTOR%201").status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


class TestCamposSecciones:
    def test_secciones_admin(self, ac):
        resp = ac.get("/api/campos-secciones/ADMIN")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # Admin ve todas las secciones inferiores
        assert len(data) > 0

    def test_secciones_estructura(self, ac):
        resp = ac.get("/api/campos-secciones/ADMIN")
        data = resp.json()
        if data:
            sec = data[0]
            assert "rol" in sec
            assert "fields" in sec
            assert isinstance(sec["fields"], list)

    def test_secciones_contralor(self, ac):
        # Admin como sesión, pero el endpoint no usa el parámetro rol del URL
        resp = ac.get("/api/campos-secciones/CONTRALOR")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_secciones_lider(self, ac):
        resp = ac.get("/api/campos-secciones/LIDER")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_secciones_gestor1(self, ac):
        resp = ac.get("/api/campos-secciones/GESTOR%201")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_secciones_sin_sesion(self, client):
        client.post("/api/logout")
        try:
            assert client.get("/api/campos-secciones/ADMIN").status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
