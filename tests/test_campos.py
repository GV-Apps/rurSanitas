"""
test_campos.py — Tests para validación del código de campo (CWE-89 / F-15).
"""
import os
import pytest
from fastapi import HTTPException

from app.routers.campos_admin import _validate_codigo

ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")


class TestValidateCodigo:
    """_validate_codigo protege el DDL dinámico de ALTER TABLE."""

    valid_codes = ["A", "AB", "FX", "A1", "AB2", "ABC", "Z99"]
    invalid_codes = [
        "a",           # lowercase
        "ab",          # lowercase
        "A B",         # espacio
        "A;DROP",      # SQL injection
        "A--",         # SQL comment
        "ABCD",        # 4 letras sin dígito > 3 letras
        "",            # vacío
        "123",         # solo dígitos
        "A1B",         # letra después de dígito
    ]

    @pytest.mark.parametrize("codigo", valid_codes)
    def test_valid_codigo_no_exception(self, codigo):
        _validate_codigo(codigo)  # No debe lanzar

    @pytest.mark.parametrize("codigo", invalid_codes)
    def test_invalid_codigo_raises(self, codigo):
        with pytest.raises(HTTPException) as exc_info:
            _validate_codigo(codigo)
        assert exc_info.value.status_code == 400

    def test_sql_injection_blocked(self):
        """El patrón más peligroso: código que contendría SQL."""
        with pytest.raises(HTTPException):
            _validate_codigo("X TEXT; DROP TABLE registros--")

    def test_max_length_5(self):
        """Código de exactamente 5 chars (ABC12) debe ser válido."""
        _validate_codigo("ABC12")

    def test_over_max_length(self):
        """Código de 6 chars debe fallar."""
        with pytest.raises(HTTPException):
            _validate_codigo("ABCDE1")


class TestCamposAdminAPI:
    """Tests de integración para el endpoint de creación de campos."""

    def test_create_campo_invalid_codigo(self, admin_client):
        resp = admin_client.post(
            "/api/admin/campos",
            json={
                "codigo": "a;drop",
                "nombre": "Campo Malicioso",
                "rol": "GESTOR 1",
                "tipo_dato": "Texto",
            },
        )
        assert resp.status_code == 400

    def test_create_campo_empty_codigo(self, admin_client):
        resp = admin_client.post(
            "/api/admin/campos",
            json={"codigo": "", "nombre": "Test", "rol": "GESTOR 1"},
        )
        assert resp.status_code == 400
