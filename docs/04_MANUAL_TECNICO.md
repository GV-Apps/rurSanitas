# Manual Técnico

## Contenido

1. [Requisitos previos](#1-requisitos-previos)
2. [Instalación y ejecución local (desarrollo)](#2-instalación-y-ejecución-local-desarrollo)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Despliegue en Google Cloud Run (producción)](#4-despliegue-en-google-cloud-run-producción)
5. [CI/CD con GitHub Actions](#5-cicd-con-github-actions)
6. [Primer inicio — usuario administrador](#6-primer-inicio--usuario-administrador)
7. [Importación de registros históricos](#7-importación-de-registros-históricos)
8. [Migraciones de base de datos](#8-migraciones-de-base-de-datos)
9. [Mantenimiento y diagnóstico](#9-mantenimiento-y-diagnóstico)

---

## 1. Requisitos previos

### Desarrollo local
- Python 3.12 o superior
- pip

### Producción (Cloud Run)
- Cuenta Google Cloud Platform con proyecto activo
- Repositorio en GitHub (para el CI/CD)
- Cuenta Azure (para SSO con Microsoft EntraID, si aplica)

---

## 2. Instalación y ejecución local (desarrollo)

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd TU_REPOSITORIO

# 2. Crear entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / Mac

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Levantar la aplicación
python -m uvicorn app.main:app --reload --port 8000
```

La base de datos SQLite se crea automáticamente en `app/formularios.db`
con todas las tablas, campos y datos por defecto.

Abrir en el navegador: **http://localhost:8000**

**Usuario y contraseña por defecto:** `admin` / `admin123`  
**Cambiar la contraseña en el primer inicio de sesión.**

### Opción alternativa: desarrollo local con PostgreSQL

Si quieres usar PostgreSQL en local (más cercano a producción):

```bash
cd docker
docker compose up -d db   # levanta solo PostgreSQL en el puerto 5432

# En la raíz del repo:
DATABASE_URL=postgresql://rur_user:rur_pass@localhost:5432/rur \
  python -m uvicorn app.main:app --reload --port 8000
```

---

## 3. Variables de entorno

Copiar `.env.example` como referencia y definir las variables según el entorno.

| Variable | Requerida en prod | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | `postgresql://user:pass@host:5432/dbname` |
| `SECRET_KEY` | Sí | Clave de 64 caracteres para firmar sesiones |
| `APP_BASE_URL` | Sí | URL base de la app (sin barra final). Ej: `https://rur.empresa.com` |
| `SMTP_HOST` | Para reset de contraseña | Servidor SMTP. Ej: `smtp.gmail.com` |
| `SMTP_PORT` | Para reset de contraseña | Puerto SMTP. Ej: `587` |
| `SMTP_USER` | Para reset de contraseña | Cuenta de correo que envía |
| `SMTP_PASSWORD` | Para reset de contraseña | Contraseña SMTP (Gmail: contraseña de aplicación) |
| `SMTP_FROM` | Para reset de contraseña | Dirección From del correo |
| `ADMIN_INITIAL_PASSWORD` | No (default: aleatorio) | Contraseña del admin en el primer despliegue |
| `DEFAULT_SUPERIOR_INMEDIATO` | No | Usuario por defecto en carga masiva de usuarios |
| `AZURE_CLIENT_ID` | Para SSO Microsoft | ID de la App Registration en Azure |
| `AZURE_CLIENT_SECRET` | Para SSO Microsoft | Secreto de cliente de Azure |
| `AZURE_TENANT_ID` | Para SSO Microsoft | ID del tenant de Azure |
| `AZURE_REDIRECT_URI` | Para SSO Microsoft | URI de redireccionamiento registrado en Azure |
| `DEBUG` | No (default: false) | `false` en producción |
| `GUNICORN_WORKERS` | No (default: 2) | Workers ASGI |
| `TZ` | No (default: America/Bogota) | Zona horaria del servidor |

**Generar SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

> En producción (Cloud Run), todas las variables se cargan automáticamente desde
> **Secret Manager** — no se usa ningún archivo `.env`.

---

## 4. Despliegue en Google Cloud Run (producción)

Cloud Run es la plataforma de producción de este sistema: serverless, escalado
automático (0 a N instancias), SSL gestionado por Google y sin administración
de infraestructura de servidores.

**Ver la guía completa paso a paso en: [`docs/05_DESPLIEGUE.md`](05_DESPLIEGUE.md)**

### Resumen del proceso

```
1. Definir variables en Cloud Shell (una sola vez)
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

A partir del paso 7, **cada `git push` a `main` activa el pipeline completo**
sin intervención manual.

### Por qué Cloud Run usa Artifact Registry además de GHCR

El CI/CD construye y firma la imagen en GHCR. Cloud Run **no acepta imágenes
de GHCR** — solo acepta `gcr.io`, `docker.pkg.dev` (Artifact Registry) o `docker.io`.
El workflow `deploy-cloudrun.yml` copia automáticamente la imagen antes de cada deploy.

---

## 5. CI/CD con GitHub Actions

El repositorio incluye dos workflows:

| Archivo | Disparo | Propósito |
|---------|---------|-----------|
| `.github/workflows/build-push.yml` | Push a `main` o `docker` | Security gates + build + push imagen |
| `.github/workflows/deploy-cloudrun.yml` | Tras build exitoso | Deploy automático a Cloud Run |

### Pipeline completo (automático en cada push a `main`)

```
build-push.yml  (~8 min)
  ├── SAST: Semgrep — inyección SQL, secretos embebidos, XSS (CWE-89, CWE-798, CWE-79)
  ├── SCA: pip-audit — bloquea CVEs con fix disponible en dependencias
  ├── Tests: pytest con cobertura mínima ≥70%
  ├── Build imagen Docker → ghcr.io/ORG/REPO:sha-XXXXXXX
  ├── Trivy: vulnerabilidades CRITICAL/HIGH con fix en la imagen
  └── cosign: firma keyless (verificable sin JSON keys)
       ↓
deploy-cloudrun.yml  (~4 min)
  ├── Autenticación WIF (sin credenciales JSON en el repositorio)
  ├── Copiar imagen GHCR → Artifact Registry
  ├── gcloud run deploy
  └── Health check: GET /health → {"status": "ok"}
```

### Configuración de permisos en GitHub (una sola vez)

GitHub → repositorio → **Settings → Actions → General → Workflow permissions**
→ **Read and write permissions** → Save

### Secrets requeridos en GitHub

Configurar en **Settings → Secrets and variables → Actions**:

| Secret | Descripción |
|--------|-------------|
| `GCP_PROJECT_ID` | ID del proyecto GCP |
| `GCP_REGION` | Región de Cloud Run y Cloud SQL |
| `CLOUD_RUN_SA_EMAIL` | Email del Service Account runtime |
| `CLOUD_SQL_INSTANCE` | Nombre de conexión Cloud SQL (`PROYECTO:REGION:INSTANCIA`) |
| `WIF_PROVIDER` | Workload Identity Federation provider |
| `WIF_SERVICE_ACCOUNT` | Email del Service Account de CI/CD |

---

## 6. Primer inicio — usuario administrador

Al arrancar por primera vez con una base de datos vacía, se crea automáticamente:
- **Usuario:** `admin`
- **Contraseña:** valor de `ADMIN_INITIAL_PASSWORD` (si se definió) o `admin123`

**Cambiar la contraseña inmediatamente** desde el panel de administración:
Admin → Usuarios → seleccionar el usuario admin → Editar → nueva contraseña.

O directamente en PostgreSQL:
```sql
-- Generar el hash SHA-256:
-- python3 -c "import hashlib; print(hashlib.sha256('NuevaContraseña'.encode()).hexdigest())"

UPDATE usuarios
SET password_hash = '<hash_sha256>'
WHERE usuario = 'admin';
```

---

## 7. Importación de registros históricos

El script `importar_historicos.py` carga registros de conciliación existentes
desde un archivo Excel.

### Formato del archivo Excel

Columnas correspondientes a los campos del formulario (códigos A, B, C... o
nombres completos de columna). La primera fila debe ser el encabezado.

### Ejecución

```bash
# Con SQLite (desarrollo)
python importar_historicos.py --archivo datos_historicos.xlsx

# Con PostgreSQL — definir la variable de entorno antes
DATABASE_URL=postgresql://user:pass@host:5432/dbname \
  python importar_historicos.py --archivo datos_historicos.xlsx
```

### Resultado

- Los registros se insertan con `usuario = 'importacion'`
- Al finalizar, genera `reporte_errores_importacion.xlsx` con las filas que
  fallaron y la columna `MOTIVO_ERROR` con la descripción del error

---

## 8. Migraciones de base de datos

El proyecto usa **Alembic** para gestionar cambios de esquema en producción.

```bash
# Verificar el estado actual de migraciones
alembic current

# Aplicar migraciones pendientes
alembic upgrade head

# Crear una nueva migración (al modificar el esquema)
alembic revision --autogenerate -m "descripcion del cambio"
```

El `entrypoint.sh` ejecuta `alembic upgrade head` automáticamente al arrancar
el contenedor. Se puede desactivar con `RUN_MIGRATIONS=false`.

> La función `init_db()` también realiza migraciones idempotentes al arrancar.
> Alembic se usa para cambios estructurales mayores.

---

## 9. Mantenimiento y diagnóstico

### Ver logs en Cloud Run

```bash
gcloud run services logs read rur-app --region=TU_REGION --limit=50
```

### Health check

```bash
curl -s https://TU_URL/health
# → {"status": "ok"}
```

### Rollback en Cloud Run

```bash
# Ver revisiones disponibles
gcloud run revisions list --service=rur-app --region=TU_REGION

# Enviar el 100% del tráfico a una revisión anterior
gcloud run services update-traffic rur-app \
  --region=TU_REGION \
  --to-revisions=NOMBRE-REVISION=100
```

### Error "Connection Refused" en Cloud SQL

```bash
# Habilitar la API de Cloud SQL Admin si no está activa
gcloud services enable sqladmin.googleapis.com
# Luego redeploy: GitHub → Actions → Deploy to Cloud Run → Run workflow
```

### Actualizar un secreto en Secret Manager

```bash
echo -n "NUEVO_VALOR" | gcloud secrets versions add NOMBRE_SECRETO --data-file=-
# Luego redeploy: GitHub → Actions → Deploy to Cloud Run → Run workflow
```

> Rotar `RUR_SECRET_KEY` invalida todas las sesiones activas. Hacerlo fuera de horario laboral.

### Archivos estáticos en caché (JS/CSS desactualizado)

Si se modifica `app.js` o `style.css`, incrementar el número de versión en
`app/templates/index.html`:
```html
<link rel="stylesheet" href="/static/style.css?v=4">
<script src="/static/app.js?v=5"></script>
```

### Diagnóstico extendido

Ver sección **Diagnóstico de errores** en [`docs/05_DESPLIEGUE.md`](05_DESPLIEGUE.md).
