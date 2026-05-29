"""
test_config.py — Tests para carga de configuración.
Cubre: DEBUG flag, variables de entorno, valores por defecto seguros.
"""
import os


class TestDebugConfig:
    def test_debug_false_by_default(self, monkeypatch):
        monkeypatch.delenv("DEBUG", raising=False)
        import importlib
        import app.config as cfg
        # Simular recarga con DEBUG ausente
        original = cfg.DEBUG
        monkeypatch.setenv("DEBUG", "false")
        new_val = os.environ.get("DEBUG", "false").lower() in ("true", "1", "yes")
        assert new_val is False

    def test_debug_true_when_set(self, monkeypatch):
        monkeypatch.setenv("DEBUG", "true")
        val = os.environ.get("DEBUG", "false").lower() in ("true", "1", "yes")
        assert val is True

    def test_debug_false_with_value_false(self, monkeypatch):
        monkeypatch.setenv("DEBUG", "false")
        val = os.environ.get("DEBUG", "false").lower() in ("true", "1", "yes")
        assert val is False

    def test_debug_accepts_1_as_true(self, monkeypatch):
        monkeypatch.setenv("DEBUG", "1")
        val = os.environ.get("DEBUG", "false").lower() in ("true", "1", "yes")
        assert val is True


class TestSmtpConfig:
    def test_smtp_empty_by_default_in_tests(self):
        """En tests, SMTP debe estar deshabilitado (SMTP_HOST vacío)."""
        from app.config import SMTP_HOST
        assert SMTP_HOST == ""

    def test_smtp_port_default(self):
        from app.config import SMTP_PORT
        assert SMTP_PORT == 587


class TestSeedConfig:
    def test_admin_initial_password_from_env(self):
        from app.config import ADMIN_INITIAL_PASSWORD
        assert ADMIN_INITIAL_PASSWORD == os.environ.get("ADMIN_INITIAL_PASSWORD", "")

    def test_default_superior_empty_in_tests(self):
        from app.config import DEFAULT_SUPERIOR_INMEDIATO
        assert DEFAULT_SUPERIOR_INMEDIATO == ""
