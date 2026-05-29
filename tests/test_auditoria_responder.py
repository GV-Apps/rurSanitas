"""
test_auditoria_responder.py — Tests del flujo completo de auditoría:
crear con responsable válido, responder (en_proceso / terminada),
y consulta de historial por registro.
"""
import os
import pytest

ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")

# Admin tiene nombre_completo = "Administrador General" → se usa como AG
# para que admin sea el destinatario de su propia auditoría en los tests.
_AG_ADMIN = "Administrador General"


@pytest.fixture(scope="module")
def admin(client):
    """Sesión admin a nivel de módulo."""
    client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
    yield client


@pytest.fixture(scope="module")
def registro_con_ag(admin):
    """Registro con AG = nombre_completo del admin para poder crear auditorías."""
    resp = admin.post(
        "/api/registros",
        json={
            "rol": "GESTOR 1",
            "campos": {
                "C": "BOGOTA",
                "E": "902010101",
                "I": "PREST AUDITORIA TEST",
                "AG": _AG_ADMIN,
            },
        },
    )
    assert resp.status_code == 200, f"No se pudo crear registro: {resp.text}"
    return resp.json()["id"]


@pytest.fixture(scope="module")
def registro_para_responder(admin):
    """Registro con AG = admin para el flujo responder."""
    resp = admin.post(
        "/api/registros",
        json={
            "rol": "GESTOR 1",
            "campos": {
                "C": "MEDELLIN",
                "E": "902020202",
                "AG": _AG_ADMIN,
            },
        },
    )
    assert resp.status_code == 200, f"No se pudo crear registro: {resp.text}"
    return resp.json()["id"]


# ── Crear auditoría con responsable válido ────────────────────────────────────

class TestCrearAuditoriaConAG:
    @pytest.fixture(scope="class")
    def auditoria_duplicada_rid(self, admin):
        """Registro con auditoría activa para probar el caso duplicado."""
        resp = admin.post(
            "/api/registros",
            json={
                "rol": "GESTOR 1",
                "campos": {"C": "CALI", "E": "902030301", "AG": _AG_ADMIN},
            },
        )
        rid = resp.json()["id"]
        # Crear la primera auditoría
        admin.post(
            f"/api/auditoria/registro/{rid}",
            json={"comentario": "Primera auditoría para duplicar"},
        )
        return rid

    def test_crear_auditoria_ok(self, admin):
        """Crear auditoría en un registro sin auditoría activa."""
        resp = admin.post(
            "/api/registros",
            json={
                "rol": "GESTOR 1",
                "campos": {"C": "BARRANQUILLA", "E": "902030302", "AG": _AG_ADMIN},
            },
        )
        rid = resp.json()["id"]
        resp_aud = admin.post(
            f"/api/auditoria/registro/{rid}",
            json={"comentario": "Primera auditoría"},
        )
        assert resp_aud.status_code == 200
        assert resp_aud.json()["ok"] is True

    def test_crear_auditoria_duplicada(self, admin, auditoria_duplicada_rid):
        resp = admin.post(
            f"/api/auditoria/registro/{auditoria_duplicada_rid}",
            json={"comentario": "Duplicada"},
        )
        assert resp.status_code == 409
        assert "activa" in resp.json()["detail"].lower()

    def test_crear_auditoria_usuario_ag_no_encontrado(self, admin):
        """AG con nombre que no coincide con ningún usuario."""
        resp_reg = admin.post(
            "/api/registros",
            json={
                "rol": "GESTOR 1",
                "campos": {"C": "BOGOTA", "E": "902040404", "AG": "Usuario Fantasma XYZ"},
            },
        )
        rid = resp_reg.json()["id"]
        resp_aud = admin.post(
            f"/api/auditoria/registro/{rid}",
            json={"comentario": "Auditoria con AG fantasma"},
        )
        assert resp_aud.status_code == 400
        assert "no se encontró" in resp_aud.json()["detail"].lower()

    def test_crear_auditoria_registro_no_existe(self, ac):
        resp = ac.post(
            "/api/auditoria/registro/9999999",
            json={"comentario": "Registro inexistente"},
        )
        assert resp.status_code == 404

    def test_crear_auditoria_sin_comentario(self, ac, registro_con_ag):
        resp = ac.post(
            f"/api/auditoria/registro/{registro_con_ag}",
            json={"comentario": ""},
        )
        assert resp.status_code == 400


# ── Historial de auditoría por registro ──────────────────────────────────────

class TestHistorialAuditoria:
    @pytest.fixture(scope="class")
    def registro_con_auditoria(self, admin):
        """Registro con una auditoría creada, para verificar historial."""
        resp = admin.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "902050500", "AG": _AG_ADMIN}},
        )
        rid = resp.json()["id"]
        admin.post(
            f"/api/auditoria/registro/{rid}",
            json={"comentario": "Auditoría para historial"},
        )
        return rid

    def test_historial_registro_ok(self, admin, registro_con_auditoria):
        resp = admin.get(f"/api/auditoria/registro/{registro_con_auditoria}")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_historial_estructura(self, admin, registro_con_auditoria):
        resp = admin.get(f"/api/auditoria/registro/{registro_con_auditoria}")
        data = resp.json()
        if data:
            item = data[0]
            assert "id" in item
            assert "comentario_admin" in item
            assert "estado" in item

    def test_historial_registro_sin_auditorias(self, admin):
        resp_reg = admin.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "902050505"}},
        )
        rid = resp_reg.json()["id"]
        resp = admin.get(f"/api/auditoria/registro/{rid}")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_historial_sin_sesion(self, client, registro_con_auditoria):
        client.post("/api/logout")
        try:
            assert client.get(
                f"/api/auditoria/registro/{registro_con_auditoria}"
            ).status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Responder auditoría ───────────────────────────────────────────────────────

class TestResponderAuditoria:
    @pytest.fixture(scope="class")
    def aud_para_responder(self, admin, registro_para_responder):
        """Crea una auditoría sobre registro_para_responder y retorna su id."""
        resp = admin.post(
            f"/api/auditoria/registro/{registro_para_responder}",
            json={"comentario": "Auditoría para responder"},
        )
        assert resp.status_code == 200, f"No se pudo crear auditoría: {resp.text}"
        auds = admin.get("/api/auditoria/activas").json()
        for a in auds:
            if a["registro_id"] == registro_para_responder:
                return a["auditoria_id"]
        pytest.fail("No se encontró la auditoría creada para responder")

    def test_responder_estado_invalido(self, admin, aud_para_responder):
        resp = admin.put(
            f"/api/auditoria/{aud_para_responder}/responder",
            json={"estado": "invalido", "comentario": ""},
        )
        assert resp.status_code == 400
        assert "estado inválido" in resp.json()["detail"].lower()

    def test_responder_no_existe(self, ac):
        resp = ac.put(
            "/api/auditoria/9999999/responder",
            json={"estado": "en_proceso", "comentario": ""},
        )
        assert resp.status_code == 404

    def test_responder_en_proceso_ok(self, admin, aud_para_responder):
        resp = admin.put(
            f"/api/auditoria/{aud_para_responder}/responder",
            json={"estado": "en_proceso", "comentario": "Trabajando en ello"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["estado"] == "en_proceso"

    def test_responder_terminada_ok(self, admin, aud_para_responder):
        resp = admin.put(
            f"/api/auditoria/{aud_para_responder}/responder",
            json={"estado": "terminada", "comentario": "Corrección realizada"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["estado"] == "terminada"

    def test_responder_ya_terminada(self, admin, aud_para_responder):
        resp = admin.put(
            f"/api/auditoria/{aud_para_responder}/responder",
            json={"estado": "en_proceso", "comentario": "Intentar de nuevo"},
        )
        assert resp.status_code == 409
        assert "terminada" in resp.json()["detail"].lower()

    def test_responder_sin_sesion(self, client, aud_para_responder):
        client.post("/api/logout")
        try:
            resp = client.put(
                f"/api/auditoria/{aud_para_responder}/responder",
                json={"estado": "en_proceso", "comentario": ""},
            )
            assert resp.status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})

    def test_responder_destinatario_incorrecto(self, client):
        """Otro usuario no puede responder la auditoría de admin."""
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
        # Crear usuario sin permisos
        client.post(
            "/api/admin/usuarios",
            json={
                "usuario": "gestor_aud_otro",
                "nombre_completo": "Gestor Auditoria Otro",
                "password": "GestorAudOtro123",
                "perm_gestor_1": True,
            },
        )
        # Registro con AG = admin
        resp_reg = client.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "902060606", "AG": _AG_ADMIN}},
        )
        rid = resp_reg.json()["id"]
        resp_aud = client.post(
            f"/api/auditoria/registro/{rid}",
            json={"comentario": "Prueba destinatario incorrecto"},
        )
        assert resp_aud.status_code == 200
        # Obtener auditoria id
        auds = client.get("/api/auditoria/activas").json()
        aud_id = None
        for a in auds:
            if a["registro_id"] == rid:
                aud_id = a["auditoria_id"]
                break
        assert aud_id is not None
        # Login como otro usuario e intentar responder
        client.post("/api/logout")
        client.post("/api/login", json={"usuario": "gestor_aud_otro", "password": "GestorAudOtro123"})
        try:
            resp = client.put(
                f"/api/auditoria/{aud_id}/responder",
                json={"estado": "en_proceso", "comentario": "Intento no autorizado"},
            )
            assert resp.status_code == 403
        finally:
            client.post("/api/logout")
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
