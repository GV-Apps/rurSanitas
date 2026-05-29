# Sistema de Automatización RUR — Conciliaciones EPS Sanitas

Sistema web para gestionar y rastrear conciliaciones entre valores esperados y facturados
en el programa RUR (Régimen Subsidiado) de EPS Sanitas (Keralty).

---

## Documentación

| Documento | Descripción |
|---|---|
| [docs/01_ESTRUCTURA.md](docs/01_ESTRUCTURA.md) | Estructura del proyecto y stack tecnológico |
| [docs/03_BASE_DE_DATOS.md](docs/03_BASE_DE_DATOS.md) | Tablas de base de datos y relaciones |
| [docs/04_MANUAL_TECNICO.md](docs/04_MANUAL_TECNICO.md) | Instalación, variables de entorno y despliegue |
| [docs/05_DESPLIEGUE.md](docs/05_DESPLIEGUE.md) | Guía paso a paso — Cloud Run (producción) |

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Python 3.12 + FastAPI + Gunicorn |
| Frontend | Vanilla JavaScript (SPA sin frameworks, sin npm) |
| BD desarrollo | SQLite (automático, sin instalación) |
| BD producción | PostgreSQL 15+ (Google Cloud SQL) |
| CI/CD | GitHub Actions (SAST + SCA + Tests + Trivy + cosign) |
| Producción | Google Cloud Run (serverless) + Cloud SQL PostgreSQL |
| Autenticación | Sesiones firmadas + SSO Microsoft EntraID |

---

## Inicio rápido — desarrollo local

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd TU_REPOSITORIO

# 2. Crear entorno virtual e instalar dependencias
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / Mac
pip install -r requirements.txt

# 3. Levantar la aplicación (SQLite local — sin configuración extra)
python -m uvicorn app.main:app --reload --port 8000
```

Abrir en el navegador: **http://localhost:8000**

**Usuario administrador por defecto:** `admin` / `admin123`  
Cambiar la contraseña en el primer inicio de sesión.

La base de datos SQLite (`app/formularios.db`) se crea automáticamente con
todas las tablas, los 139 campos del formulario, las opciones de listas y el
usuario administrador. No se requiere PostgreSQL para desarrollo local.

---

## Despliegue en producción — Cloud Run

La infraestructura de producción usa **Google Cloud Run** (serverless) con
**Cloud SQL** para PostgreSQL y **Secret Manager** para las variables de entorno.
El pipeline de CI/CD aplica controles de seguridad automáticos en cada push.

Ver la guía completa en: **[docs/05_DESPLIEGUE.md](docs/05_DESPLIEGUE.md)**

### Resumen del proceso

```
1. Configurar proyecto GCP y variables en Cloud Shell
2. Crear Service Account runtime (rur-app-sa)
3. Crear instancia Cloud SQL PostgreSQL
4. Habilitar 7 APIs de GCP
5. Crear 14 secretos en Secret Manager
6. Crear repositorio Artifact Registry + SA de CI/CD (github-actions-sa)
7. Configurar Workload Identity Federation + 6 secrets en GitHub
   ↓
   git push origin main  →  pipeline automático (~12 min)
   ↓
8. Anotar URL del servicio Cloud Run
9. Actualizar secretos de URL con la URL real
10. Configurar SSO Microsoft EntraID (si aplica)
11. Redeploy final
```

A partir del paso 7, **cada `git push` a `main` activa el pipeline completo** sin intervención manual.

### Pipeline de CI/CD (automático)

```
build-push.yml  (~8 min)
  ├── SAST: Semgrep — detecta inyección SQL, secretos embebidos, XSS
  ├── SCA: pip-audit — bloquea CVEs con fix disponible en dependencias
  ├── Tests: pytest con cobertura mínima ≥70%
  ├── Build imagen Docker → ghcr.io/ORG/REPO:sha-XXXXXXX
  ├── Trivy: escaneo de vulnerabilidades CRITICAL/HIGH en la imagen
  └── cosign: firma keyless de la imagen (verificable sin JSON keys)
       ↓
deploy-cloudrun.yml  (~4 min)
  ├── Autenticación WIF (Workload Identity Federation — sin credenciales JSON)
  ├── Copiar imagen GHCR → Artifact Registry (Cloud Run no acepta GHCR)
  ├── gcloud run deploy (crea el servicio si no existe)
  └── Health check: GET /health → {"status": "ok"}
```

---

## Variables de entorno requeridas en producción

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `SECRET_KEY` | Clave de 64 chars para firmar sesiones (generar con `secrets.token_hex(32)`) |
| `APP_BASE_URL` | URL base de la app, sin barra final |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Configuración SMTP para reset de contraseña |
| `ADMIN_INITIAL_PASSWORD` | Contraseña del admin en el primer arranque |
| `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` / `AZURE_TENANT_ID` / `AZURE_REDIRECT_URI` | SSO Microsoft EntraID |

En Cloud Run, todas estas variables se leen de **Secret Manager** automáticamente.
Para desarrollo local o servidor Docker, usar el archivo `.env.prod` (no subir al repositorio).

---

## Estructura del repositorio

```
/
├── app/                   ← Aplicación FastAPI (backend + SPA frontend)
│   ├── main.py            ← Entry point
│   ├── config.py          ← Variables de entorno
│   ├── core/              ← Campos, helpers, seed data
│   ├── routers/           ← Endpoints por dominio
│   ├── static/            ← app.js (SPA) + style.css (Keralty Design)
│   └── templates/         ← index.html (shell de la SPA)
├── docker/
│   ├── Dockerfile         ← Imagen multi-stage Python 3.12 (usada por CI/CD)
│   ├── docker-compose.yml ← Desarrollo local con PostgreSQL (opcional)
│   └── scripts/entrypoint.sh
├── migrations/            ← Migraciones Alembic
├── .github/workflows/     ← build-push.yml + deploy-cloudrun.yml
├── importar_historicos.py ← Importación masiva desde Excel
├── requirements.txt
└── docs/                  ← Documentación técnica
```

---

## Funcionalidades principales

- **Gestión de registros de conciliación** con 139 campos configurables por rol
- **Sistema de roles:** Gestor 1, Gestor 2, Líder, Coordinador, Contralor, Administrador
- **Flujo de aprobación** del campo N con historial de acciones
- **Auditorías** asignadas por el Administrador a registros específicos
- **Exportación a Excel** filtrada por rol
- **Notificaciones internas** entre usuarios
- **Gestión de prestadores de salud** (IPS) con catálogo y solicitudes
- **Importación masiva** de registros históricos desde Excel
- **SSO con Microsoft EntraID** (login institucional)
- **Reset de contraseña** por correo electrónico
- **Carga masiva de usuarios** desde Excel
- **Días festivos** y códigos de ciudad configurables

---

## Entrega del código a repositorio nuevo

Al migrar el código al repositorio GitHub del cliente, solo hay tres ajustes
que dependen del repositorio:

1. **Condición WIF** en GCP — actualizar `assertion.repository` con el nuevo path
2. **Vinculación SA→Pool** en WIF — actualizar el `principalSet` con el nuevo repo
3. **6 Secrets de GitHub** — configurar en el repositorio nuevo

El código, los secretos de Secret Manager y el proyecto GCP no requieren cambios.
Ver la guía completa en [docs/05_DESPLIEGUE.md](docs/05_DESPLIEGUE.md).

---

## Soporte y diagnóstico rápido

```bash
# Ver logs de la app en Cloud Run
gcloud run services logs read rur-app --region=TU_REGION --limit=50

# Health check
curl -s https://TU_URL/health
# → {"status": "ok"}

# Ver revisiones disponibles (para rollback)
gcloud run revisions list --service=rur-app --region=TU_REGION
```

Para diagnóstico detallado de errores comunes (Connection Refused, SSO, secretos vacíos),
ver la sección **Diagnóstico de errores** en [docs/05_DESPLIEGUE.md](docs/05_DESPLIEGUE.md).
