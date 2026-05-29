"""
test_registros_aprobacion.py — Tests del flujo de aprobación de Fecha N,
reapertura, validación y secciones paginadas adicionales.
"""
import os
import pytest

ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")

# Fecha más antigua que 14 días para disparar aprobación N
_N_ANTIGUA = "2020-01-15"
_CAMPOS_BASE = {"C": "BOGOTA", "E": "901010101", "I": "PREST APROBACION TEST"}


@pytest.fixture(scope="module")
def admin(client):
    """Sesión admin a nivel de módulo."""
    client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
    yield client


@pytest.fixture(scope="module")
def gestor_sin_permisos(admin):
    """Crea usuario GESTOR 1 sin LIDER ni CONTRALOR para tests de permiso."""
    admin.post(
        "/api/admin/usuarios",
        json={
            "usuario": "gestor_apn_test",
            "nombre_completo": "Gestor ApN Test",
            "password": "GestorApN123",
            "perm_gestor_1": True,
        },
    )
    return {"usuario": "gestor_apn_test", "password": "GestorApN123"}


@pytest.fixture(scope="module")
def registro_pendiente_n(admin):
    """Crea un registro con N antigua → estado_aprobacion_n = 'pendiente'."""
    resp = admin.post(
        "/api/registros",
        json={
            "rol": "GESTOR 1",
            "campos": {**_CAMPOS_BASE, "N": _N_ANTIGUA},
            "comentario_solicitud_n": "Solicitud de prueba N",
        },
    )
    assert resp.status_code == 200, f"No se pudo crear registro: {resp.text}"
    return resp.json()["id"]


@pytest.fixture(scope="module")
def registro_para_rechazar(admin):
    """Crea un registro con N antigua para flujo rechazar → reactivar."""
    resp = admin.post(
        "/api/registros",
        json={
            "rol": "GESTOR 1",
            "campos": {"C": "MEDELLIN", "E": "901020202", "N": _N_ANTIGUA},
            "comentario_solicitud_n": "Para rechazar",
        },
    )
    assert resp.status_code == 200, f"No se pudo crear registro: {resp.text}"
    return resp.json()["id"]


@pytest.fixture(scope="module")
def registro_para_cancelar(admin):
    """Crea un registro con N antigua para flujo cancelar."""
    resp = admin.post(
        "/api/registros",
        json={
            "rol": "GESTOR 1",
            "campos": {"C": "CALI", "E": "901030303", "N": _N_ANTIGUA},
            "comentario_solicitud_n": "Para cancelar",
        },
    )
    assert resp.status_code == 200, f"No se pudo crear registro: {resp.text}"
    return resp.json()["id"]


@pytest.fixture(scope="module")
def registro_para_reabrir(admin):
    """Crea un registro y lo pone en estado cerrado."""
    resp = admin.post(
        "/api/registros",
        json={"rol": "GESTOR 1", "campos": {"C": "BARRANQUILLA", "E": "901040404"}},
    )
    assert resp.status_code == 200
    rid = resp.json()["id"]
    # Poner en estado cerrado (AC = CERRADO POR CANCELACION DE MESA)
    admin.put(
        f"/api/registro/{rid}",
        json={"campos": {"AC": "CERRADO POR CANCELACION DE MESA"}, "motivo_cierre": ""},
    )
    return rid


@pytest.fixture(scope="module")
def registro_para_validar(admin):
    """Crea un registro para el flujo de validación."""
    resp = admin.post(
        "/api/registros",
        json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "901050505", "I": "PREST VALIDAR"}},
    )
    assert resp.status_code == 200
    return resp.json()["id"]


# ── Flujo Aprobar N ───────────────────────────────────────────────────────────

class TestAprobarN:
    def test_estado_pendiente_tras_crear(self, admin, registro_pendiente_n):
        resp = admin.get(f"/api/registro/{registro_pendiente_n}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["estado_aprobacion_n"] == "pendiente"

    def test_aprobar_n_ok(self, admin, registro_pendiente_n):
        resp = admin.post(
            f"/api/registro/{registro_pendiente_n}/aprobar-n",
            json={"comentario": "Aprobado por test"},
        )
        assert resp.status_code == 200
        assert "aprobada" in resp.json()["mensaje"].lower()

    def test_aprobar_n_ya_aprobado(self, admin, registro_pendiente_n):
        # No está pendiente, ya fue aprobado
        resp = admin.post(
            f"/api/registro/{registro_pendiente_n}/aprobar-n",
            json={"comentario": "Re-aprobacion"},
        )
        assert resp.status_code == 400

    def test_aprobar_n_no_existe(self, ac):
        resp = ac.post("/api/registro/9999999/aprobar-n", json={"comentario": "X"})
        assert resp.status_code == 404

    def test_aprobar_n_sin_permiso(self, client, gestor_sin_permisos):
        client.post("/api/logout")
        client.post("/api/login", json=gestor_sin_permisos)
        try:
            # Crear registro con N antigua
            r = client.post(
                "/api/registros",
                json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "901060606", "N": _N_ANTIGUA}},
            )
            rid = r.json()["id"]
            resp = client.post(f"/api/registro/{rid}/aprobar-n", json={"comentario": "X"})
            assert resp.status_code == 403
        finally:
            client.post("/api/logout")
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Historial N ───────────────────────────────────────────────────────────────

class TestHistorialN:
    def test_historial_n_ok(self, admin, registro_pendiente_n):
        resp = admin.get(f"/api/registro/{registro_pendiente_n}/historial-n")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # Debe tener al menos el log de solicitud y aprobacion
        assert len(data) >= 1

    def test_historial_n_registro_sin_log(self, admin):
        resp_reg = admin.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "901070707"}},
        )
        rid = resp_reg.json()["id"]
        resp = admin.get(f"/api/registro/{rid}/historial-n")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_historial_n_sin_sesion(self, client, registro_pendiente_n):
        client.post("/api/logout")
        try:
            assert client.get(f"/api/registro/{registro_pendiente_n}/historial-n").status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Flujo Rechazar N → Reactivar N ───────────────────────────────────────────

class TestRechazarReactivarN:
    def test_rechazar_n_sin_comentario(self, admin, registro_para_rechazar):
        resp = admin.post(
            f"/api/registro/{registro_para_rechazar}/rechazar-n",
            json={"comentario": ""},
        )
        assert resp.status_code == 400

    def test_rechazar_n_ok(self, admin, registro_para_rechazar):
        resp = admin.post(
            f"/api/registro/{registro_para_rechazar}/rechazar-n",
            json={"comentario": "Rechazado por fecha muy antigua"},
        )
        assert resp.status_code == 200
        assert "rechazada" in resp.json()["mensaje"].lower()

    def test_rechazar_n_ya_rechazado(self, admin, registro_para_rechazar):
        resp = admin.post(
            f"/api/registro/{registro_para_rechazar}/rechazar-n",
            json={"comentario": "Volver a rechazar"},
        )
        assert resp.status_code == 400

    def test_rechazar_n_no_existe(self, ac):
        resp = ac.post("/api/registro/9999999/rechazar-n", json={"comentario": "X"})
        assert resp.status_code == 404

    def test_reactivar_n_sin_comentario(self, admin, registro_para_rechazar):
        resp = admin.post(
            f"/api/registro/{registro_para_rechazar}/reactivar-n",
            json={"comentario": ""},
        )
        assert resp.status_code == 400

    def test_reactivar_n_ok(self, admin, registro_para_rechazar):
        resp = admin.post(
            f"/api/registro/{registro_para_rechazar}/reactivar-n",
            json={"comentario": "Re-aprobado por contralor"},
        )
        assert resp.status_code == 200
        assert "re-aprobado" in resp.json()["mensaje"].lower()

    def test_reactivar_n_ya_aprobado(self, admin, registro_para_rechazar):
        resp = admin.post(
            f"/api/registro/{registro_para_rechazar}/reactivar-n",
            json={"comentario": "Volver a reactivar"},
        )
        assert resp.status_code == 400

    def test_reactivar_n_no_existe(self, ac):
        resp = ac.post("/api/registro/9999999/reactivar-n", json={"comentario": "X"})
        assert resp.status_code == 404


# ── Flujo Cancelar N ──────────────────────────────────────────────────────────

class TestCancelarN:
    def test_cancelar_n_ok(self, admin, registro_para_cancelar):
        resp = admin.post(f"/api/registro/{registro_para_cancelar}/cancelar-n")
        assert resp.status_code == 200
        assert "cancelada" in resp.json()["mensaje"].lower()

    def test_cancelar_n_ya_cancelado(self, admin, registro_para_cancelar):
        resp = admin.post(f"/api/registro/{registro_para_cancelar}/cancelar-n")
        assert resp.status_code == 400

    def test_cancelar_n_no_existe(self, ac):
        resp = ac.post("/api/registro/9999999/cancelar-n")
        assert resp.status_code == 404


# ── Flujo Reabrir ─────────────────────────────────────────────────────────────

class TestReabrirRegistro:
    def test_reabrir_sin_motivo(self, admin, registro_para_reabrir):
        resp = admin.post(
            f"/api/registro/{registro_para_reabrir}/reabrir",
            json={"motivo": ""},
        )
        assert resp.status_code == 400

    def test_reabrir_ok(self, admin, registro_para_reabrir):
        resp = admin.post(
            f"/api/registro/{registro_para_reabrir}/reabrir",
            json={"motivo": "Reapertura de prueba"},
        )
        assert resp.status_code == 200
        assert "reabierto" in resp.json()["mensaje"].lower()

    def test_reabrir_no_cerrado(self, admin, registro_para_reabrir):
        # Después de reabrir ya no está cerrado
        resp = admin.post(
            f"/api/registro/{registro_para_reabrir}/reabrir",
            json={"motivo": "Intentar de nuevo"},
        )
        assert resp.status_code == 400

    def test_reabrir_no_existe(self, ac):
        resp = ac.post("/api/registro/9999999/reabrir", json={"motivo": "X"})
        assert resp.status_code == 404

    def test_reabrir_sin_permiso(self, client, gestor_sin_permisos):
        """GESTOR 1 sin LIDER ni CONTRALOR no puede reabrir."""
        client.post("/api/logout")
        client.post("/api/login", json=gestor_sin_permisos)
        try:
            resp = client.post("/api/registro/1/reabrir", json={"motivo": "Prueba sin permiso"})
            assert resp.status_code == 403
        finally:
            client.post("/api/logout")
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Flujo Validar ─────────────────────────────────────────────────────────────

class TestValidarRegistro:
    def test_validar_ok(self, admin, registro_para_validar):
        resp = admin.post(f"/api/registro/{registro_para_validar}/validar")
        assert resp.status_code == 200
        data = resp.json()
        assert "validado" in data["mensaje"].lower()
        assert "fecha_validacion" in data

    def test_validar_ya_validado(self, admin, registro_para_validar):
        resp = admin.post(f"/api/registro/{registro_para_validar}/validar")
        assert resp.status_code == 400
        assert "ya fue validado" in resp.json()["detail"].lower()

    def test_validar_no_existe(self, ac):
        resp = ac.post("/api/registro/9999999/validar")
        assert resp.status_code == 404

    def test_validar_sin_permiso(self, client, admin, gestor_sin_permisos):
        """GESTOR sin asignación (AG) no puede validar registros de otro."""
        # Crear registro para que exista un ID válido
        resp_reg = admin.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "901090909"}},
        )
        rid = resp_reg.json()["id"]
        client.post("/api/logout")
        client.post("/api/login", json=gestor_sin_permisos)
        try:
            resp = client.post(f"/api/registro/{rid}/validar")
            assert resp.status_code == 403
        finally:
            client.post("/api/logout")
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Secciones lista-paginada adicionales ─────────────────────────────────────

class TestListaPaginadaSecciones:
    def test_seccion_pendientes_n(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=pendientes_n")
        assert resp.status_code == 200
        data = resp.json()
        assert "registros" in data

    def test_seccion_rechazados_n(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=rechazados_n")
        assert resp.status_code == 200
        assert "registros" in resp.json()

    def test_seccion_pendientes_validar(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=pendientes_validar")
        assert resp.status_code == 200
        assert "registros" in resp.json()

    def test_seccion_finalizados(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=finalizados")
        assert resp.status_code == 200
        assert "registros" in resp.json()

    def test_seccion_cerrados_con_grupo(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=cerrados&grupo=BOGOTA")
        assert resp.status_code == 200
        assert "registros" in resp.json()

    def test_seccion_desconocida_con_busqueda(self, admin):
        # Sección que no existe simplemente retorna vacío (no hay filtros adicionales)
        resp = admin.get("/api/registros/lista-paginada?seccion=main&busqueda=INEXISTENTE999")
        assert resp.status_code == 200


# ── Lista picker ──────────────────────────────────────────────────────────────

class TestListaPicker:
    def test_lista_picker_ok(self, admin):
        resp = admin.get("/api/registros/lista")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_lista_picker_estructura(self, admin):
        resp = admin.get("/api/registros/lista")
        data = resp.json()
        if data:
            item = data[0]
            assert "id" in item

    def test_lista_picker_sin_sesion(self, client):
        client.post("/api/logout")
        try:
            assert client.get("/api/registros/lista").status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
