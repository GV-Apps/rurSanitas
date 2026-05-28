# Manual Técnico

## Contenido

1. [Requisitos previos](#1-requisitos-previos)
2. [Instalación y ejecución local (desarrollo)](#2-instalación-y-ejecución-local-desarrollo)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Despliegue en servidor con Docker](#4-despliegue-en-servidor-con-docker)
5. [Despliegue en Google Cloud Run (producción)](#5-despliegue-en-google-cloud-run-producción)
6. [CI/CD con GitHub Actions](#6-cicd-con-github-actions)
7. [Primer inicio — usuario administrador](#7-primer-inicio--usuario-administrador)
8. [Importación de registros históricos](#8-importación-de-registros-históricos)
9. [Migraciones de base de datos](#9-migraciones-de-base-de-datos)
10. [Mantenimiento y diagnóstico](#10-mantenimiento-y-diagnóstico)

---

## 1. Requisitos previos

### Desarrollo local
- Python 3.12 o superior
- pip

### Producción (servidor propio con Docker)
- Ubuntu 22.04 / 24.04 (u otra distribución con Docker)
- Docker Engine + Docker Compose v2
- Dominio con DNS configurado
- PostgreSQL 15+ (puede ser externo: RDS, Cloud SQL, Supabase, etc.)

### Producción (Cloud Run — recomendado)
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

---

## 3. Variables de entorno

Copiar `.env.example` como `.env.prod` y completar los valores:

```bash
cp .env.example .env.prod
nano .env.prod   # o abrir con cualquier editor
```

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
| `GUNICORN_WORKERS` | No (default: 2) | Workers ASGI (recomendado: 2×núcleos+1) |
| `TZ` | No (default: America/Bogota) | Zona horaria del servidor |

**Generar SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

> **IMPORTANTE:** El archivo `.env.prod` nunca debe subirse al repositorio Git.
> Está en `.gitignore` por defecto.

---

## 4. Despliegue en servidor con Docker

Esta opción aplica cuando tienes un VPS o servidor propio (DigitalOcean, AWS EC2, Hetzner, etc.).

### 4.1 Instalar Docker en el servidor

```bash
sudo apt update && sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Cerrar sesión y reconectar para activar el grupo
```

### 4.2 Crear estructura en el servidor

```bash
sudo mkdir -p /opt/rur/docker/nginx
sudo chown -R $USER:$USER /opt/rur
```

### 4.3 Copiar archivos de configuración al servidor

```bash
# Reemplazar IP_SERVIDOR con la IP real del servidor
scp docker/docker-compose.ghcr.yml  usuario@IP_SERVIDOR:/opt/rur/docker/
scp docker/nginx/nginx.conf          usuario@IP_SERVIDOR:/opt/rur/docker/nginx/
```

### 4.4 Crear el archivo de variables de entorno en el servidor

```bash
nano /opt/rur/docker/.env.prod
chmod 600 /opt/rur/docker/.env.prod
```

Completar con los valores reales de la sección 3.

### 4.5 Obtener certificado SSL

```bash
sudo apt install -y certbot
# El DNS del dominio debe apuntar a este servidor
sudo certbot certonly --standalone -d tudominio.com
```

### 4.6 Configurar la imagen en docker-compose.ghcr.yml

Editar el archivo y reemplazar `<TU_USUARIO_GITHUB>/<NOMBRE_REPOSITORIO>` con el path real del repositorio.

Si la imagen en GHCR es privada:
```bash
# Crear PAT en GitHub: Settings → Developer settings → Tokens (classic) → read:packages
echo "TU_PAT" | docker login ghcr.io -u TU_USUARIO_GITHUB --password-stdin
```

### 4.7 Primer despliegue

```bash
cd /opt/rur/docker
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
docker compose -f docker-compose.ghcr.yml ps
```

### 4.8 Renovación automática del certificado SSL

```bash
sudo crontab -e
```

Agregar:
```cron
0 3 * * * certbot renew \
  --pre-hook  "docker compose -f /opt/rur/docker/docker-compose.ghcr.yml stop nginx" \
  --post-hook "docker compose -f /opt/rur/docker/docker-compose.ghcr.yml start nginx" \
  --quiet
```

### 4.9 Actualizar a una nueva versión

```bash
cd /opt/rur/docker
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
docker image prune -f
```

### 4.10 Rollback a versión anterior

```bash
# Ver imágenes disponibles
docker images | grep tu_repositorio

# Editar docker-compose.ghcr.yml y cambiar :latest por :sha-XXXXXXX
docker compose -f docker-compose.ghcr.yml up -d
```

---

## 5. Despliegue en Google Cloud Run (producción)

Cloud Run es la opción de producción recomendada: serverless, escalado automático, SSL gestionado por Google y sin administración de infraestructura.

**Ver la guía completa y detallada en:** [`docs/05_DESPLIEGUE.md`](05_DESPLIEGUE.md)

### Resumen del proceso

```
1. Configurar Cloud Shell (variables del proyecto GCP)
2. Crear Service Account runtime (rur-app-sa)
3. Crear instancia Cloud SQL PostgreSQL (si es nueva)
4. Habilitar 7 APIs de GCP
5. Crear 14 secretos en Secret Manager
6. Crear repositorio Artifact Registry + Service Account de CI/CD
7. Configurar Workload Identity Federation (WIF) + 6 secrets en GitHub
↓
Primer git push → pipeline completo automático (~12 min)
↓
Anotar URL del servicio → actualizar secretos de URL → configurar SSO → redeploy
```

### Pipeline de CI/CD (automático tras cada push a `main`)

```
build-push.yml
  ├── SAST: Semgrep (CWE-89, CWE-798, CWE-79)
  ├── SCA: pip-audit (sin CVEs con fix)
  ├── Tests: pytest ≥70% cobertura
  ├── Build imagen Docker → ghcr.io/ORG/REPO:sha-XXXXXXX
  ├── Trivy: escaneo CRITICAL/HIGH con fix
  └── cosign: firma keyless de imagen
       ↓
deploy-cloudrun.yml
  ├── Autenticación WIF (sin credenciales JSON)
  ├── Copiar imagen GHCR → Artifact Registry
  ├── gcloud run deploy
  └── Health check /health
```

---

## 6. CI/CD con GitHub Actions

El repositorio incluye dos workflows:

| Archivo | Disparo | Propósito |
|---------|---------|-----------|
| `.github/workflows/build-push.yml` | Push a `main` o `docker` | Security gates + build + push imagen |
| `.github/workflows/deploy-cloudrun.yml` | Tras build exitoso | Deploy automático a Cloud Run |

### Configuración de permisos en GitHub (una sola vez)

1. GitHub → repositorio → **Settings → Actions → General**
2. Bajar a **Workflow permissions** → seleccionar **Read and write permissions** → Save

### La imagen usa el nombre del repositorio automáticamente

```yaml
# build-push.yml — se normaliza a minúsculas para compatibilidad con GHCR
IMAGE_REPO=ghcr.io/$(echo '${{ github.repository }}' | tr '[:upper:]' '[:lower:]')
```

No requiere cambio de código al cambiar de organización o nombre de repositorio.

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

## 7. Primer inicio — usuario administrador

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

## 8. Importación de registros históricos

El script `importar_historicos.py` permite cargar registros de conciliación
existentes desde un archivo Excel.

### Formato del archivo Excel

El archivo debe tener columnas que correspondan a los campos del formulario
(códigos A, B, C... o nombres completos de columna). La primera fila debe
ser el encabezado.

### Ejecución

```bash
# Con SQLite (desarrollo)
python importar_historicos.py --archivo datos_historicos.xlsx

# Con PostgreSQL (producción) — definir la variable de entorno antes
DATABASE_URL=postgresql://user:pass@host:5432/dbname \
  python importar_historicos.py --archivo datos_historicos.xlsx
```

### Resultado

- Los registros se insertan con `usuario = 'importacion'`
- Al finalizar, genera `reporte_errores_importacion.xlsx` con:
  - Todas las filas que fallaron
  - Columna `MOTIVO_ERROR` con la descripción del error

---

## 9. Migraciones de base de datos

El proyecto usa **Alembic** para gestionar cambios de esquema en producción.

```bash
# Verificar el estado actual de migraciones
alembic current

# Aplicar migraciones pendientes
alembic upgrade head

# Crear una nueva migración (al modificar el esquema)
alembic revision --autogenerate -m "descripcion del cambio"
```

El `entrypoint.sh` ejecuta `alembic upgrade head` automáticamente al
arrancar el contenedor (se puede desactivar con `RUN_MIGRATIONS=false`).

> **Nota:** La función `init_db()` también realiza migraciones idempotentes
> al arrancar. Alembic se usa para cambios estructurales mayores.

---

## 10. Mantenimiento y diagnóstico

### Ver logs en Cloud Run

```bash
gcloud run services logs read rur-app --region=TU_REGION --limit=50
```

### Ver logs en Docker (servidor propio)

```bash
docker compose -f docker-compose.ghcr.yml logs -f app
docker compose -f docker-compose.ghcr.yml logs -f nginx
```

### Verificar que la aplicación responde

```bash
curl -s https://tudominio.com/health
# Respuesta esperada: {"status": "ok"}
```

### Reiniciar la aplicación (Docker)

```bash
cd /opt/rur/docker
docker compose -f docker-compose.ghcr.yml restart app
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

# Luego redeploy (GitHub → Actions → Deploy to Cloud Run → Run workflow)
```

### Contenedor no arranca — error de conexión a BD (Docker)

```bash
docker compose -f docker-compose.ghcr.yml logs app
# Errores comunes:
# - "could not connect to server" → verificar DATABASE_URL en .env.prod
# - "password authentication failed" → credenciales incorrectas
# - "database does not exist" → crear la base de datos en PostgreSQL
```

### Regenerar SECRET_KEY (invalida todas las sesiones activas)

```bash
# Generar nueva clave
python3 -c "import secrets; print(secrets.token_hex(32))"

# En Cloud Run: actualizar el secreto y hacer redeploy
echo -n "NUEVA_CLAVE" | gcloud secrets versions add RUR_SECRET_KEY --data-file=-

# En Docker: actualizar .env.prod y reiniciar
docker compose -f docker-compose.ghcr.yml up -d --force-recreate app
```

> Realizar fuera de horario laboral para minimizar el impacto.

### Actualizar un secreto en Secret Manager (Cloud Run)

```bash
echo -n "NUEVO_VALOR" | gcloud secrets versions add NOMBRE_SECRETO --data-file=-
# Luego redeploy: GitHub → Actions → Deploy to Cloud Run → Run workflow
```

### Archivos estáticos en caché (JS/CSS desactualizado)

Los archivos estáticos tienen versión en la URL (`?v=N`). Si se modifica
`app.js` o `style.css`, incrementar el número en `app/templates/index.html`:
```html
<link rel="stylesheet" href="/static/style.css?v=4">
<script src="/static/app.js?v=5"></script>
```
