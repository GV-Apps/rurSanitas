"""
test_usuarios.py — Tests para gestión de usuarios (admin).
Cubre: crear usuario, validación de contraseña, editar, listar.
"""
import os
import pytest

ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")


class TestCrearUsuario:
    def test_crear_usuario_ok(self, ac):
        resp = ac.post(
            "/api/admin/usuarios",
            json={
                "usuario": "test_user_ok",
                "nombre_completo": "Usuario De Test",
                "password": "TestPass123",
                "perm_gestor_1": True,
                "regional": "BOGOTA",
            },
        )
        assert resp.status_code in (200, 409)

    def test_crear_usuario_password_corta(self, ac):
        resp = ac.post(
            "/api/admin/usuarios",
            json={
                "usuario": "test_short_pass",
                "nombre_completo": "Short Pass Test",
                "password": "Ab1",
            },
        )
        assert resp.status_code == 400
        assert "8" in resp.json()["detail"]

    def test_crear_usuario_sin_digito(self, ac):
        resp = ac.post(
            "/api/admin/usuarios",
            json={
                "usuario": "test_no_digit",
                "nombre_completo": "No Digit Test",
                "password": "SinDigitoAqui",
            },
        )
        assert resp.status_code == 400

    def test_crear_usuario_duplicado(self, ac):
        ac.post(
            "/api/admin/usuarios",
            json={
                "usuario": "duplicate_user",
                "nombre_completo": "Duplicate User",
                "password": "DupPass123",
            },
        )
        resp = ac.post(
            "/api/admin/usuarios",
            json={
                "usuario": "duplicate_user",
                "nombre_completo": "Duplicate User 2",
                "password": "DupPass456",
            },
        )
        assert resp.status_code == 409

    def test_crear_usuario_campos_requeridos(self, ac):
        resp = ac.post(
            "/api/admin/usuarios",
            json={"usuario": "", "nombre_completo": "", "password": ""},
        )
        assert resp.status_code == 400

    def test_sin_sesion_admin_retorna_401_o_403(self, client):
        # Cerrar sesión primero
        client.post("/api/logout")
        resp = client.post(
            "/api/admin/usuarios",
            json={
                "usuario": "unauthorized_user",
                "nombre_completo": "Unauth",
                "password": "UnAuth1234",
            },
        )
        assert resp.status_code in (401, 403)


class TestListarUsuarios:
    def test_listar_usuarios_admin(self, ac):
        resp = ac.get("/api/admin/usuarios")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(u["usuario"] == "admin" for u in data)

    def test_listar_sin_sesion(self, client):
        client.post("/api/logout")
        resp = client.get("/api/admin/usuarios")
        assert resp.status_code in (401, 403)
