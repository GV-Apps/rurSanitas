"""
test_sso_access.py — Tests para endpoints SSO y login con local_auth deshabilitado.

Cubre:
- GET  /api/auth/microsoft/config
- POST /api/auth/microsoft/request-access
- GET  /api/admin/sso-access-requests
- PUT  /api/admin/sso-access-requests/{id}/vista
- DELETE /api/admin/sso-access-requests/{id}
- Login con local_auth_enabled=0 → 403
"""
import os
import pytest

ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")


class TestMicrosoftConfig:
    def test_config_informa_disponibilidad(self, client):
        """El endpoint siempre responde e indica si SSO está configurado."""
        resp = client.get("/api/auth/microsoft/config")
        assert resp.status_code == 200
        data = resp.json()
        assert "microsoft_available" in data
        assert isinstance(data["microsoft_available"], bool)

    def test_config_accesible_sin_autenticacion(self, client):
        client.post("/api/logout")
        resp = client.get("/api/auth/microsoft/config")
        assert resp.status_code == 200


class TestRequestAccess:
    def test_solicitud_ok_retorna_201(self, client):
        resp = client.post(
            "/api/auth/microsoft/request-access",
            json={"email": "acceso_sso_1@test.com", "nombre": "Acceso SSO 1", "comentario": "Solicito"},
        )
        assert resp.status_code == 201
        assert "mensaje" in resp.json()

    def test_solicitud_sin_comentario_ok(self, client):
        resp = client.post(
            "/api/auth/microsoft/request-access",
            json={"email": "acceso_sso_2@test.com", "nombre": "Acceso SSO 2"},
        )
        assert resp.status_code == 201

    def test_solicitud_duplicada_retorna_200(self, client):
        email = "acceso_sso_dup@test.com"
        client.post("/api/auth/microsoft/request-access", json={"email": email})
        resp = client.post("/api/auth/microsoft/request-access", json={"email": email})
        assert resp.status_code == 200
        assert "pendiente" in resp.json().get("mensaje", "").lower()

    def test_sin_email_retorna_400(self, client):
        resp = client.post(
            "/api/auth/microsoft/request-access",
            json={"nombre": "Sin Email"},
        )
        assert resp.status_code == 400

    def test_email_vacio_retorna_400(self, client):
        resp = client.post(
            "/api/auth/microsoft/request-access",
            json={"email": ""},
        )
        assert resp.status_code == 400


class TestSSOAccessAdmin:
    def test_listar_retorna_lista(self, ac):
        resp = ac.get("/api/admin/sso-access-requests")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_listar_filtra_por_estado_pendiente(self, ac):
        resp = ac.get("/api/admin/sso-access-requests?estado=pendiente")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert all(r.get("estado") == "pendiente" for r in data)

    def test_listar_filtra_por_estado_visto(self, ac):
        resp = ac.get("/api/admin/sso-access-requests?estado=visto")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_listar_requiere_admin(self, client):
        client.post("/api/logout")
        resp = client.get("/api/admin/sso-access-requests")
        assert resp.status_code in (401, 403)

    def test_marcar_vista(self, ac, client):
        client.post(
            "/api/auth/microsoft/request-access",
            json={"email": "vista_sso@test.com", "nombre": "Vista SSO"},
        )
        solicitudes = ac.get("/api/admin/sso-access-requests?estado=pendiente").json()
        req = next((s for s in solicitudes if s.get("email") == "vista_sso@test.com"), None)
        if req is None:
            pytest.skip("Solicitud no encontrada")
        resp = ac.put(f"/api/admin/sso-access-requests/{req['id']}/vista")
        assert resp.status_code == 200
        assert resp.json().get("ok") is True

    def test_marcar_vista_requiere_admin(self, client):
        client.post("/api/logout")
        resp = client.put("/api/admin/sso-access-requests/1/vista")
        assert resp.status_code in (401, 403)

    def test_eliminar_solicitud(self, ac, client):
        client.post(
            "/api/auth/microsoft/request-access",
            json={"email": "eliminar_sso_2@test.com", "nombre": "Eliminar SSO 2"},
        )
        solicitudes = ac.get("/api/admin/sso-access-requests").json()
        req = next((s for s in solicitudes if s.get("email") == "eliminar_sso_2@test.com"), None)
        if req is None:
            pytest.skip("Solicitud no encontrada")
        resp = ac.delete(f"/api/admin/sso-access-requests/{req['id']}")
        assert resp.status_code == 200
        assert resp.json().get("ok") is True

    def test_eliminar_requiere_admin(self, client):
        client.post("/api/logout")
        resp = client.delete("/api/admin/sso-access-requests/1")
        assert resp.status_code in (401, 403)


class TestLocalAuthDisabled:
    def test_login_con_local_auth_deshabilitado_retorna_403(self, ac, client):
        """Usuario con local_auth_enabled=0 no puede autenticarse con contraseña."""
        ac.post("/api/admin/usuarios", json={
            "usuario": "sso_only_user_1",
            "nombre_completo": "SSO Only User",
            "password": "SSOOnly1234",
            "local_auth_enabled": False,
        })
        client.post("/api/logout")
        resp = client.post("/api/login", json={
            "usuario": "sso_only_user_1",
            "password": "SSOOnly1234",
        })
        assert resp.status_code == 403
        # Restaurar sesión admin para tests subsiguientes
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})

    def test_usuario_con_local_auth_habilitado_puede_login(self, ac, client):
        """Usuario con local_auth_enabled=1 puede autenticarse con contraseña normalmente."""
        ac.post("/api/admin/usuarios", json={
            "usuario": "local_auth_user_1",
            "nombre_completo": "Local Auth User",
            "password": "LocalAuth1234",
            "local_auth_enabled": True,
        })
        client.post("/api/logout")
        resp = client.post("/api/login", json={
            "usuario": "local_auth_user_1",
            "password": "LocalAuth1234",
        })
        assert resp.status_code == 200
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
