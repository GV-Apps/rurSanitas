"""
test_registros.py — Tests del CRUD de registros de conciliación.
Cubre: crear, listar, obtener, actualizar, eliminar, secciones, filtros,
       verificar-acta, finalizar, mis-gestores, partir.
"""
import os
import pytest

ADMIN_PASS = os.environ.get("ADMIN_INITIAL_PASSWORD", "Admin1234Test!")

_CAMPOS_BASE = {
    "C": "BOGOTA",
    "E": "900111222",
    "I": "PRESTADOR TEST REGISTROS",
    "D": "COMPENSAR",
    "B": "BOGOTA",
}


# ── Fixtures de módulo ────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def gestor_client(client):
    """Crea un usuario GESTOR 1 y retorna client con sesión activa."""
    client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
    client.post(
        "/api/admin/usuarios",
        json={
            "usuario": "gestor_reg_test",
            "nombre_completo": "Gestor Registros Test",
            "password": "GestorReg123",
            "perm_gestor_1": True,
            "regional": "BOGOTA",
        },
    )
    client.post("/api/logout")
    client.post(
        "/api/login",
        json={"usuario": "gestor_reg_test", "password": "GestorReg123"},
    )
    yield client
    client.post("/api/logout")


@pytest.fixture(scope="module")
def admin(client):
    """Admin client a nivel de módulo."""
    client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
    yield client


@pytest.fixture(scope="module")
def registro_id(admin):
    """Crea un registro base para los tests del módulo y retorna su id."""
    resp = admin.post(
        "/api/registros",
        json={"rol": "GESTOR 1", "campos": _CAMPOS_BASE},
    )
    assert resp.status_code == 200, f"No se pudo crear registro: {resp.text}"
    return resp.json()["id"]


# ── Crear registro ────────────────────────────────────────────────────────────

class TestCrearRegistro:
    def test_crear_ok(self, ac):
        resp = ac.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "MEDELLIN", "E": "800222333", "I": "PREST MEDELLIN"}},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data

    def test_crear_sin_campos_validos(self, ac):
        resp = ac.post("/api/registros", json={"rol": "GESTOR 1", "campos": {}})
        assert resp.status_code == 400

    def test_crear_sin_rol(self, ac):
        resp = ac.post("/api/registros", json={"campos": {"C": "BOGOTA"}})
        assert resp.status_code == 400

    def test_crear_ab_formato_invalido(self, ac):
        resp = ac.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"AB": "ACTA-INVALIDA", "C": "BOGOTA"}},
        )
        assert resp.status_code == 400

    def test_crear_ab_formato_valido(self, ac):
        resp = ac.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"AB": "A01012025-0001", "C": "BOGOTA", "E": "900001001"}},
        )
        assert resp.status_code == 200

    def test_crear_ab_duplicado(self, ac):
        campos = {"AB": "A01012025-9999", "C": "BOGOTA", "E": "900001002"}
        ac.post("/api/registros", json={"rol": "GESTOR 1", "campos": campos})
        resp = ac.post("/api/registros", json={"rol": "GESTOR 1", "campos": campos})
        assert resp.status_code == 409

    def test_crear_sin_sesion(self, client):
        client.post("/api/logout")
        resp = client.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA"}},
        )
        assert resp.status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Obtener registro ──────────────────────────────────────────────────────────

class TestObtenerRegistro:
    def test_get_by_id_ok(self, admin, registro_id):
        resp = admin.get(f"/api/registro/{registro_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == registro_id
        assert "campos" in data

    def test_get_by_id_no_existe(self, ac):
        resp = ac.get("/api/registro/9999999")
        assert resp.status_code == 404

    def test_get_sin_sesion(self, client, registro_id):
        client.post("/api/logout")
        resp = client.get(f"/api/registro/{registro_id}")
        assert resp.status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Listar registros ──────────────────────────────────────────────────────────

class TestListarRegistros:
    def test_info_selector_ok(self, admin):
        resp = admin.get("/api/registros/info")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_listar_por_rol(self, admin):
        resp = admin.get("/api/registros/GESTOR%201")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_filtros_disponibles(self, admin):
        resp = admin.get("/api/registros/filtros-disponibles")
        assert resp.status_code == 200
        data = resp.json()
        assert "regiones" in data
        assert "gestores" in data

    def test_mis_gestores(self, admin):
        resp = admin.get("/api/mis-gestores")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


# ── Grupos y secciones ────────────────────────────────────────────────────────

class TestGruposResumen:
    def test_grupos_resumen_ok(self, admin):
        resp = admin.get("/api/registros/grupos-resumen")
        assert resp.status_code == 200
        data = resp.json()
        assert "secciones" in data
        assert "grupos_main" in data

    def test_grupos_resumen_con_busqueda(self, admin):
        resp = admin.get("/api/registros/grupos-resumen?busqueda=TEST")
        assert resp.status_code == 200

    def test_grupos_resumen_con_region(self, admin):
        resp = admin.get("/api/registros/grupos-resumen?f_region=BOGOTA")
        assert resp.status_code == 200

    def test_get_registros_paginados(self, admin):
        resp = admin.get("/api/registros/lista-paginada?page=1&seccion=main")
        assert resp.status_code == 200
        data = resp.json()
        assert "registros" in data
        assert "total" in data
        assert "page" in data

    def test_get_registros_seccion_creados(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=creados")
        assert resp.status_code == 200

    def test_get_registros_seccion_cerrados(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=cerrados")
        assert resp.status_code == 200

    def test_get_registros_con_busqueda(self, admin):
        resp = admin.get("/api/registros/lista-paginada?busqueda=BOGOTA")
        assert resp.status_code == 200

    def test_get_registros_sin_sesion(self, client):
        client.post("/api/logout")
        try:
            resp = client.get("/api/registros/lista-paginada")
            assert resp.status_code in (401, 403)
        finally:
            client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Verificar acta ────────────────────────────────────────────────────────────

class TestVerificarActa:
    def test_verificar_acta_no_duplicado(self, admin):
        resp = admin.get("/api/registros/verificar-acta?campo=AB&valor=A99992999-9999")
        assert resp.status_code == 200
        assert resp.json()["duplicado"] is False

    def test_verificar_acta_duplicado(self, admin):
        campos = {"AB": "A01012025-7777", "C": "BOGOTA", "E": "900001003"}
        admin.post("/api/registros", json={"rol": "GESTOR 1", "campos": campos})
        resp = admin.get("/api/registros/verificar-acta?campo=AB&valor=A01012025-7777")
        assert resp.status_code == 200
        assert resp.json()["duplicado"] is True

    def test_verificar_acta_excluyendo_id(self, admin, registro_id):
        resp = admin.get(
            f"/api/registros/verificar-acta?campo=AB&valor=A99992999-9999&exclude_id={registro_id}"
        )
        assert resp.status_code == 200


# ── Actualizar registro ───────────────────────────────────────────────────────

class TestActualizarRegistro:
    def test_update_campo_permitido(self, admin, registro_id):
        resp = admin.put(
            f"/api/registro/{registro_id}",
            json={"campos": {"C": "CALI"}, "motivo_cierre": ""},
        )
        assert resp.status_code == 200
        assert "actualizado" in resp.json()["mensaje"].lower()

    def test_update_no_existe(self, ac):
        resp = ac.put(
            "/api/registro/9999999",
            json={"campos": {"C": "CALI"}, "motivo_cierre": ""},
        )
        assert resp.status_code == 404

    def test_update_sin_campos_permitidos(self, admin, registro_id):
        resp = admin.put(
            f"/api/registro/{registro_id}",
            json={"campos": {}, "motivo_cierre": ""},
        )
        assert resp.status_code == 400

    def test_update_ab_duplicado(self, admin, registro_id):
        campos_otro = {"AB": "A01012025-8888", "C": "BOGOTA", "E": "900001004"}
        admin.post("/api/registros", json={"rol": "GESTOR 1", "campos": campos_otro})
        resp = admin.put(
            f"/api/registro/{registro_id}",
            json={"campos": {"AB": "A01012025-8888"}, "motivo_cierre": ""},
        )
        assert resp.status_code == 409

    def test_update_sin_sesion(self, client, registro_id):
        client.post("/api/logout")
        resp = client.put(
            f"/api/registro/{registro_id}",
            json={"campos": {"C": "CALI"}, "motivo_cierre": ""},
        )
        assert resp.status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Eliminar registro ─────────────────────────────────────────────────────────

class TestEliminarRegistro:
    def test_delete_sin_datos_gestor2(self, gestor_client):
        resp = gestor_client.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "900888777", "I": "PREST DEL"}},
        )
        assert resp.status_code == 200
        new_id = resp.json()["id"]
        del_resp = gestor_client.delete(f"/api/registro/{new_id}")
        assert del_resp.status_code == 200
        assert "eliminado" in del_resp.json()["mensaje"].lower()

    def test_delete_no_existe(self, gestor_client):
        resp = gestor_client.delete("/api/registro/9999999")
        assert resp.status_code == 404

    def test_delete_sin_permiso_gestor1(self, client):
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
        resp_r = client.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "900777666"}},
        )
        new_id = resp_r.json()["id"]
        client.post("/api/logout")
        non_gestor_pass = "NonGestor123"
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})
        client.post(
            "/api/admin/usuarios",
            json={"usuario": "no_gestor_user", "nombre_completo": "No Gestor", "password": non_gestor_pass},
        )
        client.post("/api/logout")
        client.post("/api/login", json={"usuario": "no_gestor_user", "password": non_gestor_pass})
        resp = client.delete(f"/api/registro/{new_id}")
        assert resp.status_code == 403
        client.post("/api/logout")
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Finalizar registro ────────────────────────────────────────────────────────

class TestFinalizarRegistro:
    def test_finalizar_como_admin(self, admin, registro_id):
        resp = admin.post(f"/api/registro/{registro_id}/finalizar")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_finalizar_no_existe(self, ac):
        resp = ac.post("/api/registro/9999999/finalizar")
        assert resp.status_code == 404

    def test_finalizar_sin_sesion(self, client, registro_id):
        client.post("/api/logout")
        resp = client.post(f"/api/registro/{registro_id}/finalizar")
        assert resp.status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Partir registro ───────────────────────────────────────────────────────────

class TestPartirRegistro:
    def test_partir_sin_consecutivo(self, ac):
        resp = ac.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "900555444", "M": "1000000"}},
        )
        new_id = resp.json()["id"]
        resp_partir = ac.post(
            f"/api/registro/{new_id}/partir",
            json={"partes": [{"D": "SANITAS", "M": "500000"}]},
        )
        assert resp_partir.status_code in (200, 400)

    def test_partir_no_existe(self, ac):
        resp = ac.post(
            "/api/registro/9999999/partir",
            json={"partes": [{"D": "SANITAS", "M": "100000"}]},
        )
        assert resp.status_code == 404


# ── Sesión requerida (cobertura auth paths) ───────────────────────────────────

class TestAuthPaths:
    def test_grupos_resumen_sin_sesion(self, client):
        client.post("/api/logout")
        assert client.get("/api/registros/grupos-resumen").status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})

    def test_info_sin_sesion(self, client):
        client.post("/api/logout")
        assert client.get("/api/registros/info").status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})

    def test_verificar_acta_sin_sesion(self, client):
        client.post("/api/logout")
        assert client.get("/api/registros/verificar-acta?campo=AB&valor=X").status_code in (401, 403)
        client.post("/api/login", json={"usuario": "admin", "password": ADMIN_PASS})


# ── Cobertura de paths internos ───────────────────────────────────────────────

class TestAuditNoDiff:
    def test_update_mismos_valores_no_genera_diff(self, admin):
        """Actualizar un registro con los mismos valores no registra diff en audit.
        Cubre la rama `if not diff and accion != 'eliminacion': return` en _registrar_audit."""
        r = admin.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "900400001", "D": "SANITAS"}},
        )
        assert r.status_code == 200
        rid = r.json()["id"]
        # Primera actualización con valor distinto (genera diff)
        admin.put(f"/api/registro/{rid}", json={"campos": {"D": "COMPENSAR"}, "motivo_cierre": ""})
        # Segunda actualización con el mismo valor (no genera diff → early return en _registrar_audit)
        resp = admin.put(
            f"/api/registro/{rid}",
            json={"campos": {"D": "COMPENSAR"}, "motivo_cierre": ""},
        )
        assert resp.status_code == 200

    def test_update_campo_c_con_valor_nuevo(self, admin):
        """Actualiza el campo C para ejercitar el diff building en _registrar_audit."""
        r = admin.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "900400002"}},
        )
        rid = r.json()["id"]
        resp = admin.put(
            f"/api/registro/{rid}",
            json={"campos": {"C": "MEDELLIN"}, "motivo_cierre": ""},
        )
        assert resp.status_code == 200


class TestGestorVisibilidad:
    """Ejercita get_visibility_filter para usuarios no-admin (líneas 175-227)."""

    def test_gestor_ve_sus_propios_registros(self, gestor_client):
        """GESTOR 1 puede listar registros y ve los que creó."""
        resp = gestor_client.get("/api/registros/grupos-resumen")
        assert resp.status_code == 200

    def test_gestor_lista_paginada(self, gestor_client):
        gestor_client.post(
            "/api/registros",
            json={"rol": "GESTOR 1", "campos": {"C": "BOGOTA", "E": "900500001"}},
        )
        resp = gestor_client.get("/api/registros/lista-paginada?seccion=main")
        assert resp.status_code == 200
        data = resp.json()
        assert "registros" in data

    def test_gestor_info_selector(self, gestor_client):
        resp = gestor_client.get("/api/registros/info")
        assert resp.status_code == 200

    def test_gestor_filtros_disponibles(self, gestor_client):
        resp = gestor_client.get("/api/registros/filtros")
        assert resp.status_code == 200


class TestListaPaginadaSecciones:
    def test_seccion_pendientes_n(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=pendientes_n")
        assert resp.status_code == 200

    def test_seccion_rechazados_n(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=rechazados_n")
        assert resp.status_code == 200

    def test_seccion_por_validar(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=por_validar")
        assert resp.status_code == 200

    def test_seccion_finalizados(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=finalizados")
        assert resp.status_code == 200

    def test_seccion_cerrados(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=cerrados")
        assert resp.status_code == 200

    def test_seccion_otra_regional(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=otra_regional")
        assert resp.status_code == 200

    def test_seccion_desconocida(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=xyz_desconocida")
        assert resp.status_code == 200

    def test_con_busqueda(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=main&busqueda=BOGOTA")
        assert resp.status_code == 200

    def test_con_regional(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=main&regional=BOGOTA")
        assert resp.status_code == 200

    def test_con_usuario_filtro(self, admin):
        resp = admin.get("/api/registros/lista-paginada?seccion=main&usuario=admin")
        assert resp.status_code == 200
