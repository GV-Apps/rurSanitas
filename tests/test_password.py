"""
test_password.py — Tests para hash, verificación y política de contraseñas.
Cubre: hash_password, verify_password (bcrypt + legacy SHA-256), _validate_password_strength.
"""
import hashlib

import pytest

from app.core.helpers import hash_password, verify_password
from app.routers.usuarios import _validate_password_strength


class TestHashPassword:
    def test_returns_bcrypt_hash(self):
        h = hash_password("MiPass123")
        assert h.startswith("$2b$") or h.startswith("$2a$")

    def test_different_salts_each_call(self):
        h1 = hash_password("MiPass123")
        h2 = hash_password("MiPass123")
        assert h1 != h2  # salt distinto en cada llamada

    def test_hash_is_string(self):
        h = hash_password("cualquier")
        assert isinstance(h, str)

    def test_rounds_12(self):
        h = hash_password("test")
        # bcrypt format: $2b$ROUNDS$...
        rounds = int(h.split("$")[2])
        assert rounds == 12


class TestVerifyPassword:
    def test_correct_bcrypt(self):
        h = hash_password("Correcto99")
        assert verify_password("Correcto99", h) is True

    def test_wrong_password_bcrypt(self):
        h = hash_password("Correcto99")
        assert verify_password("Incorrecto", h) is False

    def test_legacy_sha256_correct(self):
        """Migración lazy: hashes SHA-256 legacy deben seguir funcionando."""
        sha256_hash = hashlib.sha256("legacyPass1".encode()).hexdigest()
        assert verify_password("legacyPass1", sha256_hash) is True

    def test_legacy_sha256_wrong(self):
        sha256_hash = hashlib.sha256("legacyPass1".encode()).hexdigest()
        assert verify_password("WrongPass", sha256_hash) is False

    def test_empty_password_fails(self):
        h = hash_password("SomePass9")
        assert verify_password("", h) is False


class TestPasswordStrength:
    def test_valid_password(self):
        assert _validate_password_strength("ValPass123") is None

    def test_too_short(self):
        error = _validate_password_strength("Abc1")
        assert error is not None
        assert "8" in error

    def test_no_digit(self):
        error = _validate_password_strength("SinDigitos")
        assert error is not None
        assert "número" in error.lower() or "numero" in error.lower()

    def test_empty(self):
        error = _validate_password_strength("")
        assert error is not None

    def test_exactly_8_with_digit(self):
        assert _validate_password_strength("Abcde1fg") is None

    def test_only_digits(self):
        # 8 digits — no letter constraint, just digit required
        assert _validate_password_strength("12345678") is None
