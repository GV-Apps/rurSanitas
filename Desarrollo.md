# Desarrollo del proyecto — CodigoCliente

> Documento de continuidad. Permite retomar el desarrollo en otra sesión o cuenta de Claude sin depender del historial del chat.
> **No contiene credenciales ni información sensible.**
> Última actualización: 2026-05-29 (sesión 26 — sincronización con raíz: Dockerfile→3.12, requirements pinneados, CI/CD fixes, deploy capacidad 80 usuarios)

---

## 1. Resumen general del proyecto

**Nombre:** Automatización RUR — CodigoCliente

**Propósito:** Repositorio de entrega al cliente. Contiene el mismo código de producción que el repositorio raíz (`GIT_Automatizacion_RUR`) pero en un repositorio Git independiente con su propio pipeline CI/CD. No incluye archivos de desarrollo exclusivo de la consultoría (scripts de importación histórica, herramientas de análisis interno, etc.).

**Relación con el repositorio raíz:** Los archivos de aplicación (`app/`, `migrations/`, `tests/`, `docker/`, `.github/`) deben mantenerse sincronizados con la raíz. Cualquier cambio funcional se desarrolla primero en la raíz y luego se propaga a CodigoCliente.

**Stack:**
- Backend: FastAPI (Python 3.12) + Uvicorn / Gunicorn
- Frontend: SPA en Vanilla JS (`app/static/app.js`)
- BD desarrollo: SQLite (`app/formularios.db`)
- BD producción: PostgreSQL — Cloud SQL
- Contenedores: Docker multi-stage (`python:3.12-slim`, non-root user)
- Infraestructura: Cloud Run + Cloud SQL + Artifact Registry + Secret Manager
- CI/CD: GitHub Actions → SAST (Semgrep) + SCA (pip-audit) + Tests (≥60%) + Build + Trivy + cosign + Deploy Cloud Run
- Migraciones: Alembic + SQLAlchemy
- Autenticación: login local (bcrypt) + Microsoft EntraID SSO (authlib, OIDC)

---

## 2. Estado actual

- Rama activa: `docker`.
- Pipeline CI/CD funcional: security-gates → build/push imagen → Trivy → cosign → deploy Cloud Run.
- Tests: 404 passed, 5 skipped, cobertura ~65% (umbral mínimo 60%).
- Imagen Docker basada en `python:3.12-slim` con `apt-get upgrade -y` en Stage 2.
- `requirements.txt` con versiones pinneadas exactas (idéntico a raíz).
- Cloud Run configurado para producción: 2 instancias mínimas, 1 GiB RAM, 2 vCPU, 4 workers Gunicorn.
- Correcciones CI/CD sesión 26 aplicadas (ver §4).

---

## 3. Funcionalidades implementadas

Ídem al repositorio raíz. Ver `Desarrollo.md` de la raíz para el detalle completo de todas las funcionalidades.

Resumen:
- Autenticación con sesiones y roles: ADMIN, CONTRALOR, LIDER, GESTOR 2, GESTOR 1
- Microsoft EntraID SSO + login local opcional por usuario (`local_auth_enabled`)
- CRUD de registros de conciliación con campos dinámicos
- Exportación/importación Excel
- Auditoría de cambios, notificaciones, administración de campos y usuarios
- Soporte dual BD: SQLite (dev) / PostgreSQL (prod)
- Paginación server-side, filtros por rol y región

---

## 4. Cambios aprobados e implementados

| Fecha | Cambio | Detalle |
|---|---|---|
| 2026-05-29 | Fix CI — `# nosemgrep` fuera de f-strings | `helpers.py`: movido comentario `# nosemgrep` a la línea `execute(` en PostgreSQL y SQLite CREATE TABLE para que no sea interpretado como SQL |
| 2026-05-29 | Fix CI — `local_auth_enabled=1` en INSERT admin | `helpers.py`: INSERT de usuario admin en PostgreSQL y SQLite ahora incluye `local_auth_enabled=1` explícitamente. Sin esto, el admin no podía iniciar sesión en la BD fresca de CI |
| 2026-05-29 | Fix CI — `local_auth_enabled` en INSERT de usuarios nuevos | `routers/usuarios.py`: INSERT de usuarios creados por el admin ahora incluye `local_auth_enabled` con default `True`. Sin esto, nuevos usuarios tenían `local_auth_enabled=0` y no podían iniciar sesión |
| 2026-05-29 | Docker — actualización a `python:3.12-slim` | `docker/Dockerfile`: ambos stages actualizados de `3.11-slim` a `3.12-slim`. Agrega `apt-get upgrade -y` en Stage 2. Resuelve 3 vulnerabilidades HIGH de Trivy (CVE-2026-24049, CVE-2026-23949) que afectaban `wheel` y `setuptools` en la imagen base 3.11 |
| 2026-05-29 | `requirements.txt` — versiones pinneadas | Sincronizado con raíz: cambio de rangos (`>=`) a versiones exactas (`==`) para builds reproducibles |
| 2026-05-29 | Deploy — capacidad producción 80 usuarios | `deploy-cloudrun.yml`: `GUNICORN_WORKERS=4`, `--min-instances=2`, `--memory=1Gi`, `--cpu=2` |

---

## 5. Pendientes

- Resolver configuración del secret `WIF_PROVIDER` en GitHub (valor debe tener formato `projects/NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER`).
- Resolver `AZURE_REDIRECT_URI` en GCP Secret Manager: valor debe ser `https://<url-cloud-run>/api/auth/microsoft/callback` (sin doble `https://`).
- Registrar la URI de callback en la App Registration de Azure AD del cliente.
- Continuar aumentando cobertura de tests hasta alcanzar 70% (umbral actual: 60%).

---

## 6. Aprobado pero aún no implementado

No aplica por el momento.

---

## 7. Propuestas o análisis no aprobados

No aplica por el momento.

---

## 8. Decisiones técnicas y justificación

| Decisión | Justificación |
|---|---|
| Repositorio independiente del raíz | Entrega limpia al cliente sin archivos internos de consultoría |
| `python:3.12-slim` (igual que raíz) | Versiones base modernas de `wheel`/`setuptools` sin vulnerabilidades HIGH. `python:3.11-slim` tenía CVE-2026-24049 y CVE-2026-23949 |
| `requirements.txt` con versiones pinneadas | Builds reproducibles; cualquier cambio de versión es explícito y trazable en git |
| Cloud Run min-instances=2 | Evita cold start durante picos; las 2 instancias base atienden el uso normal de ~80 usuarios |
| GUNICORN_WORKERS=4 | FastAPI async + 4 workers por instancia × 2 instancias = capacidad para 40–60 usuarios simultáneos sin saturar |

---

## 9. Archivos clave y responsabilidad de cada uno

| Archivo | Responsabilidad |
|---|---|
| `app/` | Código de la aplicación (idéntico a raíz) |
| `migrations/` | Migraciones Alembic (idéntico a raíz) |
| `tests/` | Suite de tests (idéntica a raíz) |
| `docker/Dockerfile` | Imagen Docker producción (`python:3.12-slim`, multi-stage, non-root) |
| `docker/scripts/entrypoint.sh` | Script de arranque: migraciones Alembic + Gunicorn |
| `.github/workflows/build-push.yml` | Pipeline CI: SAST + SCA + Tests + Build + Trivy + cosign |
| `.github/workflows/deploy-cloudrun.yml` | Pipeline CD: autenticación WIF + copia imagen GHCR→Artifact Registry + deploy Cloud Run |
| `requirements.txt` | Dependencias con versiones pinneadas exactas |
| `pytest.ini` | Configuración de tests (umbral cobertura: 60%) |
| `INFRAESTRUCTURA_GCP.md` | Recursos GCP requeridos para desarrollo/pruebas y producción |
| `Desarrollo.md` | Este archivo. Continuidad del desarrollo entre sesiones |

---

## 10. Estado de Docker

**Docker existe en este proyecto.**

| Archivo | Propósito |
|---|---|
| `docker/Dockerfile` | Imagen producción. Stage 1: builder con gcc + pip install. Stage 2: runtime `python:3.12-slim` + `apt-get upgrade -y` |
| `docker/scripts/entrypoint.sh` | Ejecuta `alembic upgrade head` (si `RUN_MIGRATIONS=true`) + arranca Gunicorn |
| `docker/docker-compose.yml` | Entorno local con PostgreSQL |

**Cambios recientes:** `docker/Dockerfile` actualizado a `python:3.12-slim` (desde `3.11-slim`) con `apt-get upgrade -y` en Stage 2 (sesión 26). Elimina vulnerabilidades Trivy HIGH de la imagen base.

**Parámetros Cloud Run** (configurados en `deploy-cloudrun.yml`, aplican en cada deploy automáticamente):
- Memoria: `1Gi` | CPU: `2` | Instancias mínimas: `2` | Instancias máximas: `10` | Workers: `4`

---

## 11. Validaciones y relación con VALIDACION_CAMPOS.md

El archivo `VALIDACION_CAMPOS.md` en el repositorio raíz documenta todas las validaciones del sistema. En CodigoCliente no existe copia independiente — consultar siempre la del repositorio raíz.

---

## 12. Riesgos, problemas detectados y deuda técnica

| Ítem | Descripción | Estado |
|---|---|---|
| `WIF_PROVIDER` secret incorrecto | El valor debe seguir el formato `projects/NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER` (número de proyecto, no ID) | Pendiente — ver §5 |
| `AZURE_REDIRECT_URI` con doble `https://` | Secret en GCP Secret Manager tiene valor incorrecto causando error AADSTS50011 en login SSO | Pendiente — ver §5 |
| URI callback no registrada en Azure portal | La URL de Cloud Run no está añadida como Redirect URI en la App Registration del cliente | Pendiente — ver §5 |
| Divergencia raíz ↔ CodigoCliente | Cualquier cambio funcional en la raíz debe propagarse manualmente a este repositorio | Riesgo continuo — requiere disciplina en la sincronización |

---

## 13. Supuestos confirmados

- La imagen `python:3.12-slim` resuelve las CVE HIGH de Trivy sin necesidad de parchear manualmente `wheel`/`setuptools`.
- `gcloud run deploy` crea el servicio Cloud Run si no existe y lo actualiza si ya existe — no requiere configuración previa en consola GCP.
- Los parámetros de Cloud Run (memoria, CPU, instancias) se aplican en cada ejecución del pipeline — no requieren configuración manual en la consola GCP.

---

## 14. Dudas abiertas o puntos por validar con el usuario

- ¿El pool WIF y los service accounts de GCP son los mismos que usa el repositorio raíz, o se configuraron por separado para CodigoCliente?
- ¿La App Registration de Azure AD es la misma que el repositorio raíz o requiere una nueva para el entorno del cliente?

---

## 15. Instrucciones para retomar el desarrollo

### Contexto mínimo para continuar

1. **Leer este archivo** para entender el estado de CodigoCliente.
2. **Leer `Desarrollo.md` del repositorio raíz** para el detalle completo de funcionalidades y validaciones.
3. **Cualquier cambio de código** debe hacerse primero en la raíz, probarse allí, y luego propagarse aquí.

### Sincronización con la raíz

Los archivos que deben mantenerse idénticos a la raíz:
- `app/` (todo el código de la aplicación)
- `migrations/`
- `tests/`
- `docker/Dockerfile`
- `docker/scripts/entrypoint.sh`
- `requirements.txt`
- `.github/workflows/build-push.yml`
- `.github/workflows/deploy-cloudrun.yml`
- `pytest.ini`

### Verificar el pipeline CI/CD

Ante cualquier fallo de CI, comparar primero con el pipeline de la raíz (que es el de referencia). Las diferencias entre ambos en el pasado fueron:
- `# nosemgrep` dentro de f-strings (resuelto)
- `local_auth_enabled` ausente en INSERTs (resuelto)
- Imagen Docker `3.11-slim` vs `3.12-slim` (resuelto)
- `requirements.txt` con rangos vs pinneados (resuelto)

### Prerrequisitos para el primer deploy (setup único)

Estos recursos deben existir en GCP antes del primer despliegue:
1. Proyecto GCP creado
2. Artifact Registry: repositorio Docker `rur`
3. Secret Manager: 14 secrets creados con sus valores (ver `INFRAESTRUCTURA_GCP.md`)
4. Service accounts con roles IAM correspondientes
5. Workload Identity Federation (pool + provider) vinculado al repositorio GitHub
6. Cloud SQL: instancia PostgreSQL creada gráficamente desde consola GCP
7. Secrets de GitHub Actions configurados: `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, `GCP_REGION`, `CLOUD_RUN_SA_EMAIL`, `CLOUD_SQL_INSTANCE`
