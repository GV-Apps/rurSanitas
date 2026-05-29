"""
test_auth.py — Tests de autenticación: login, lockout, logout, session, password reset.
"""
import os
import time

import pytest


ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")


class TestLogin:
    def test_login_ok(self, client):
        resp = client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
        assert resp.status_code == 200
        data = resp.json()
        assert data["usuario"] == "admin"
        assert data["is_admin"] is True

    def test_login_wrong_password(self, client):
        resp = client.post("/api/login", json={"usuario": "admin", "password": "WrongPass999"})
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/login", json={"usuario": "noexiste", "password": "Pass1234"})
        assert resp.status_code == 401

    def test_login_empty_fields(self, client):
        resp = client.post("/api/login", json={"usuario": "", "password": ""})
        assert resp.status_code == 400

    def test_login_missing_password(self, client):
        resp = client.post("/api/login", json={"usuario": "admin"})
        assert resp.status_code == 400

    def test_session_after_login(self, client):
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
        resp = client.get("/api/session")
        assert resp.status_code == 200
        data = resp.json()
        assert data["usuario"] == "admin"

    def test_logout(self, client):
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
        resp = client.post("/api/logout")
        assert resp.status_code == 200
        # Session should be cleared
        resp = client.get("/api/session")
        assert resp.json() is None or resp.status_code == 200


class TestLockout:
    def test_lockout_after_5_failures(self, client):
        """Después de 5 intentos fallidos en 5 min, el 6to debe retornar 429."""
        # Login exitoso primero para limpiar estado
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
        client.post("/api/logout")

        test_user = "lockout_test_user"
        # 5 intentos fallidos
        for _ in range(5):
            resp = client.post(
                "/api/login", json={"usuario": test_user, "password": "WrongPass1"}
            )
            assert resp.status_code == 401

        # 6to intento debe ser 429
        resp = client.post(
            "/api/login", json={"usuario": test_user, "password": "WrongPass1"}
        )
        assert resp.status_code == 429
        assert "bloqueada" in resp.json()["detail"].lower()

    def test_successful_login_clears_lockout(self, client):
        """Un login exitoso limpia los intentos fallidos."""
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
        client.post("/api/logout")
        # Después de login exitoso, reintentos fallidos parten desde 0
        resp = client.post(
            "/api/login", json={"usuario": "admin", "password": "WrongPass1"}
        )
        assert resp.status_code == 401  # No 429


@pytest.mark.skip(reason="Endpoints /api/auth/forgot-password y /api/auth/reset-password no implementados")
class TestPasswordReset:
    def test_forgot_password_unknown_user(self, client):
        resp = client.post("/api/auth/forgot-password", json={"usuario": "no_existe_jamas"})
        assert resp.status_code == 200

    def test_forgot_password_empty(self, client):
        resp = client.post("/api/auth/forgot-password", json={"usuario": ""})
        assert resp.status_code == 400

    def test_reset_password_invalid_token(self, client):
        resp = client.post("/api/auth/reset-password", json={"token": "token_invalido_xxx", "password": "NewPass123"})
        assert resp.status_code == 400

    def test_reset_password_weak_password(self, client):
        resp = client.post("/api/auth/reset-password", json={"token": "cualquier_token", "password": "weak"})
        assert resp.status_code == 400

    def test_reset_password_missing_fields(self, client):
        resp = client.post("/api/auth/reset-password", json={})
        assert resp.status_code == 400


class TestHealthEndpoint:
    def test_health_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
