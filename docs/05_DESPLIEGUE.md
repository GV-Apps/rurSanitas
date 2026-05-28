# Guía de Despliegue — Cloud Run

**Infraestructura:** Cloud Run (serverless) + Cloud SQL PostgreSQL + Secret Manager + GHCR + Artifact Registry  
**CI/CD:** GitHub Actions → `build-push.yml` → `deploy-cloudrun.yml`  
**Stack:** Python 3.12 + FastAPI + PostgreSQL (Cloud SQL)

> **¿Por qué Artifact Registry además de GHCR?**  
> Cloud Run **no acepta imágenes de GHCR** (`ghcr.io`). Solo acepta imágenes de `gcr.io`, `docker.pkg.dev` (Artifact Registry) o `docker.io`. El pipeline construye y firma la imagen en GHCR (donde Trivy y cosign operan), y en el momento del deploy la copia automáticamente a Artifact Registry antes de desplegar.

---

## Hoja de trabajo — completa a medida que avanzas

### Grupo A — Decides tú ahora

| Dato | Placeholder | Dónde encontrarlo / definirlo | Tu valor |
|------|-------------|-------------------------------|----------|
| ID del proyecto GCP | `TU_PROYECTO_ID` | GCP Console → barra superior → el ID aparece debajo del nombre (formato `texto-texto-123`) | |
| Número del proyecto GCP | `TU_PROJECT_NUMBER` | GCP Console → Dashboard → "Número de proyecto" (solo dígitos) | |
| Región | `TU_REGION` | Elige una región cercana. Ej: `southamerica-east1`. Cloud SQL y Cloud Run **deben usar la misma región** | |
| Nombre de la base de datos | `TU_BD` | Defines tú. Ej: `rur` | |
| Usuario de BD | `TU_USUARIO_BD` | `postgres` si es BD nueva; el usuario existente si ya tenías una | |
| Contraseña de BD | `TU_PASSWORD_BD` | La defines al crear la instancia, o la existente | |
| Organización/repo GitHub | `TU_ORG/TU_REPO` | Path exacto del repo en GitHub. Ej: `mi-empresa/automatizacion-rur` | |

### Grupo B — Obtienes durante el proceso

| Dato | Placeholder | Lo obtienes en | Tu valor |
|------|-------------|----------------|----------|
| Email del SA runtime | `rur-app-sa@TU_PROYECTO_ID.iam.gserviceaccount.com` | **Paso 1** | |
| Nombre de conexión Cloud SQL | `TU_PROYECTO_ID:TU_REGION:TU_INSTANCIA` | **Paso 2** — pantalla de la instancia → "Nombre de conexión" | |
| Email del SA de CI/CD | `github-actions-sa@TU_PROYECTO_ID.iam.gserviceaccount.com` | **Paso 5** | |
| Valor de WIF_PROVIDER | `projects/TU_PROJECT_NUMBER/locations/.../providers/github` | **Paso 6d** — comando gcloud | |
| URL del servicio Cloud Run | `https://rur-app-XXXXXXXXXXXX-XX.a.run.app` | **Primer push** — Cloud Run console tras el deploy automático | |

---

## Escenario de base de datos

| Escenario | Descripción |
|-----------|-------------|
| **A — Base de datos nueva** | No existe instancia Cloud SQL. La creas en el Paso 2. |
| **B — Base de datos existente** | Ya tienes una instancia con datos. Sáltate el Paso 2 y anota el nombre de conexión. |

> La app ejecuta migraciones automáticamente al arrancar — solo agrega columnas nuevas, nunca borra datos.

---

## Secuencia de pasos

```
Paso 0 — Configurar Cloud Shell (variables, una sola vez)
    ↓
Paso 1 — Service Account runtime (rur-app-sa)
    ↓
Paso 2 — [Solo escenario A] Crear instancia Cloud SQL
    ↓
Paso 3 — Habilitar APIs
    ↓
Paso 4 — Crear secretos en Secret Manager
    ↓
Paso 5 — Crear repositorio en Artifact Registry + SA de CI/CD
    ↓
Paso 6 — Configurar WIF + Secrets de GitHub
    ↓
◆ PRIMER PUSH → build + deploy automático (~12 min)
    ↓  Al terminar: anota la URL desde Cloud Run console
Paso 7 — Actualizar los 2 secretos URL con valor real
    ↓
Paso 8 — Configurar Microsoft EntraID SSO (si aplica)
    ↓
Paso 9 — Redeploy final
    ↓
Paso 10 — A partir de aquí: deploy automático en cada push
```

---

## Paso 0 — Configurar Cloud Shell

Abre **Cloud Shell** (ícono `>_` en GCP Console, arriba a la derecha).

Define estas variables una sola vez. Todos los comandos del resto de la guía las usan:

```bash
PROJECT=TU_PROYECTO_ID
PROJECT_NUMBER=TU_PROJECT_NUMBER
REGION=TU_REGION
REPO=TU_ORG/TU_REPO          # path exacto del repo en GitHub
BD=TU_BD                      # nombre de la base de datos
USUARIO_BD=TU_USUARIO_BD      # usuario PostgreSQL
PASSWORD_BD=TU_PASSWORD_BD    # contraseña de la base de datos

gcloud config set project $PROJECT
```

> Cada vez que abras una nueva sesión de Cloud Shell repite este bloque completo — las variables no persisten entre sesiones.

---

## Paso 1 — Crear Service Account del container

```bash
gcloud iam service-accounts create rur-app-sa \
  --display-name="RUR App — Cloud Run SA"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:rur-app-sa@$PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:rur-app-sa@$PROJECT.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

---

## Paso 2 — [Solo escenario A] Crear instancia Cloud SQL

> **Escenario B:** sáltate este paso. Anota el nombre de conexión desde **Cloud SQL → tu instancia → Descripción general → Nombre de conexión**.

1. Menú lateral → **SQL** → **Crear instancia**
2. Selecciona **PostgreSQL**
3. Completa:
   - **ID de instancia:** nombre descriptivo (ej: `bd-postgresql-rur`)
   - **Contraseña del usuario `postgres`:** la que definiste como `TU_PASSWORD_BD`
   - **Versión:** PostgreSQL 15 o superior
   - **Región:** la misma que `TU_REGION`
   - **Disponibilidad de zona:** `Zona única` para inicio
4. En **Personalizar → Conectividad**: marca **IP pública**
5. Clic **Crear instancia** — tarda 3–5 minutos

Luego crea la base de datos y anota el nombre de conexión:

```bash
INSTANCIA=TU_INSTANCIA   # el ID de instancia que escribiste arriba

gcloud sql databases create $BD --instance=$INSTANCIA

gcloud sql instances describe $INSTANCIA --format="value(connectionName)"
```

**→ Anota el valor de `connectionName` en la Hoja de trabajo (Grupo B)**

---

## Paso 3 — Habilitar APIs

```bash
gcloud services enable \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  iam.googleapis.com
```

---

## Paso 4 — Crear secretos en Secret Manager

Edita las 5 variables con tus valores reales, luego copia y ejecuta el bloque completo de una vez:

```bash
# ── Edita solo estas 5 líneas ─────────────────────────────────────────────
INSTANCIA=TU_INSTANCIA            # ID de instancia Cloud SQL del Paso 2
ADMIN_PASS=TU_PASSWORD_ADMIN      # contraseña inicial del administrador de la app
SMTP_HOST=smtp.gmail.com          # servidor SMTP (cámbialo si no usas Gmail)
SMTP_USER=correo@empresa.com      # cuenta que envía correos
SMTP_PASS=TU_PASSWORD_SMTP        # contraseña SMTP (Gmail: usa contraseña de aplicación)
# ──────────────────────────────────────────────────────────────────────────

# Función auxiliar: crea el secreto si no existe, agrega versión si ya existe
_sec() {
  local name=$1 value=$2
  if gcloud secrets describe "$name" &>/dev/null; then
    echo -n "$value" | gcloud secrets versions add "$name" --data-file=-
  else
    echo -n "$value" | gcloud secrets create "$name" --data-file=-
  fi
}

CONEXION=$PROJECT:$REGION:$INSTANCIA
DB_URL="postgresql://${USUARIO_BD}:${PASSWORD_BD}@/${BD}?host=/cloudsql/${CONEXION}"
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32), end='')")

_sec RUR_DATABASE_URL              "$DB_URL"
_sec RUR_SECRET_KEY                "$SECRET_KEY"
_sec RUR_ADMIN_INITIAL_PASSWORD    "$ADMIN_PASS"
_sec RUR_DEFAULT_SUPERIOR_INMEDIATO " "   # espacio intencional: GCP no acepta valor vacío; la app hace .strip() → queda como None
_sec RUR_SMTP_HOST                 "$SMTP_HOST"
_sec RUR_SMTP_PORT                 "587"
_sec RUR_SMTP_USER                 "$SMTP_USER"
_sec RUR_SMTP_PASSWORD             "$SMTP_PASS"
_sec RUR_SMTP_FROM                 "$SMTP_USER"
_sec RUR_APP_BASE_URL              "https://pendiente.run.app"
_sec RUR_AZURE_REDIRECT_URI        "https://pendiente.run.app/api/auth/microsoft/callback"
_sec RUR_AZURE_CLIENT_ID           "placeholder"
_sec RUR_AZURE_CLIENT_SECRET       "placeholder"
_sec RUR_AZURE_TENANT_ID           "placeholder"
```

> **Gmail SMTP:** no acepta la contraseña normal. Ve a **myaccount.google.com → Seguridad → Contraseñas de aplicaciones**, genera una para "Correo" y usa esos 16 caracteres como `SMTP_PASS`.

Verifica que todos los secretos tienen al menos 1 versión:

```bash
for s in RUR_DATABASE_URL RUR_SECRET_KEY RUR_ADMIN_INITIAL_PASSWORD \
  RUR_DEFAULT_SUPERIOR_INMEDIATO RUR_SMTP_HOST RUR_SMTP_PORT RUR_SMTP_USER \
  RUR_SMTP_PASSWORD RUR_SMTP_FROM RUR_APP_BASE_URL RUR_AZURE_CLIENT_ID \
  RUR_AZURE_CLIENT_SECRET RUR_AZURE_TENANT_ID RUR_AZURE_REDIRECT_URI; do
  n=$(gcloud secrets versions list $s --format="value(name)" 2>/dev/null | wc -l)
  echo "$s: $n versión(es)"
done
```

Todos deben mostrar `1 versión(es)`.

---

## Paso 5 — Crear repositorio en Artifact Registry y SA de CI/CD

```bash
# Repositorio donde el pipeline copia la imagen antes de cada deploy
gcloud artifacts repositories create rur \
  --repository-format=docker \
  --location=$REGION \
  --description="RUR App images"

# SA de CI/CD para GitHub Actions
gcloud iam service-accounts create github-actions-sa \
  --display-name="GitHub Actions CI/CD SA"

# Roles del SA de CI/CD
gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:github-actions-sa@$PROJECT.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:github-actions-sa@$PROJECT.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:github-actions-sa@$PROJECT.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

---

## Paso 6 — Configurar Workload Identity Federation + Secrets de GitHub

> WIF permite que GitHub Actions se autentique en GCP **sin guardar credenciales JSON** en el repositorio.

### Paso 6a — Crear el Workload Identity Pool

```bash
gcloud iam workload-identity-pools create github-actions \
  --location=global \
  --display-name="GitHub Actions"
```

### Paso 6b — Agregar el proveedor GitHub

```bash
gcloud iam workload-identity-pools providers create-oidc github \
  --location=global \
  --workload-identity-pool=github-actions \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor" \
  --attribute-condition="attribute.repository=='$REPO'"
```

### Paso 6c — Vincular el SA de CI/CD al pool

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions-sa@$PROJECT.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/attribute.repository/$REPO"
```

### Paso 6d — Obtener el valor de WIF_PROVIDER

```bash
gcloud iam workload-identity-pools providers describe github \
  --workload-identity-pool=github-actions \
  --location=global \
  --format="value(name)"
```

La salida es exactamente el valor que pegarás en el secret `WIF_PROVIDER` de GitHub.

**→ Anota ese valor en la Hoja de trabajo (Grupo B)**

### Paso 6e — Configurar los 6 Secrets en GitHub

GitHub → tu repositorio → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
|--------|-------|
| `GCP_PROJECT_ID` | Tu `TU_PROYECTO_ID` |
| `GCP_REGION` | Tu `TU_REGION` |
| `CLOUD_RUN_SA_EMAIL` | `rur-app-sa@TU_PROYECTO_ID.iam.gserviceaccount.com` |
| `CLOUD_SQL_INSTANCE` | `TU_PROYECTO_ID:TU_REGION:TU_INSTANCIA` |
| `WIF_PROVIDER` | El valor del Paso 6d |
| `WIF_SERVICE_ACCOUNT` | `github-actions-sa@TU_PROYECTO_ID.iam.gserviceaccount.com` |

---

## Primer push — build + deploy automático

Con los 6 secrets configurados, haz el primer push:

```bash
git push origin main
```

El pipeline corre automáticamente (~12 min en total):

```
build-push.yml (~8 min)
    ├── SAST (Semgrep)
    ├── SCA (pip-audit)
    ├── Tests pytest ≥70%
    ├── Build imagen → ghcr.io/TU_ORG/TU_REPO:sha-XXXXXXX
    ├── Trivy scan (CRITICAL/HIGH con fix)
    └── cosign sign (firma keyless)
         ↓
deploy-cloudrun.yml (~4 min)
    ├── WIF auth (sin JSON keys)
    ├── Pull imagen desde GHCR
    ├── Push imagen a Artifact Registry
    ├── gcloud run deploy (crea el servicio si no existe)
    └── Health check /health
```

Cuando termine, obtén la URL del servicio:

```bash
gcloud run services describe rur-app \
  --region=$REGION \
  --format="value(status.url)"
```

O en GitHub: **Actions → Deploy to Cloud Run → job deploy → "Verificar despliegue"**, aparece:
```
Servicio desplegado en: https://rur-app-XXXXXXXXXX-uc.a.run.app
```

Verifica que la app responde:
```bash
curl -s $(gcloud run services describe rur-app --region=$REGION --format="value(status.url)")/health
# debe responder: {"status": "ok"}
```

**→ Anota la URL en la Hoja de trabajo (Grupo B)**

---

## Paso 7 — Actualizar los secretos URL con la URL real

```bash
URL=https://TU_SERVICIO-XXXXXXXXXXXX-XX.a.run.app   # ← pega la URL obtenida arriba

echo -n "$URL" \
  | gcloud secrets versions add RUR_APP_BASE_URL --data-file=-

echo -n "$URL/api/auth/microsoft/callback" \
  | gcloud secrets versions add RUR_AZURE_REDIRECT_URI --data-file=-
```

---

## Paso 8 — Configurar Microsoft EntraID SSO

### Paso 8a — Crear la App Registration (portal Azure)

> El URI de redireccionamiento se forma agregando `/api/auth/microsoft/callback` a la URL base:
> ```
> https://rur-app-XXXXXXXXXXXX-uc.a.run.app/api/auth/microsoft/callback
> ```
> Es el mismo valor guardado en `RUR_AZURE_REDIRECT_URI` en el Paso 7.

1. **[portal.azure.com](https://portal.azure.com)** → busca **Microsoft Entra ID**
2. Menú lateral → **Registros de aplicaciones → + Nuevo registro**
3. Completa:
   - **Nombre:** nombre descriptivo (ej: `Conciliaciones RUR`)
   - **Tipos de cuenta:** *Solo cuentas del directorio organizativo actual*
   - **URI de redireccionamiento:** tipo **Web**, valor: `https://TU_URL.a.run.app/api/auth/microsoft/callback`
4. Clic **Registrar**

### Paso 8b — Copiar CLIENT_ID y TENANT_ID

En la pantalla de **Información general** de la app:
- **ID de aplicación (cliente)** → `CLIENT_ID`
- **ID de directorio (inquilino)** → `TENANT_ID`

### Paso 8c — Crear el secreto de cliente

1. Menú lateral → **Certificados y secretos → + Nuevo secreto de cliente**
2. Descripción: `rur-prod` — caducidad: 12 o 24 meses (**anota la fecha de vencimiento**)
3. Clic **Agregar**
4. **Copia el valor inmediatamente** — Azure solo lo muestra una vez

### Paso 8d — Agregar permisos de API

1. Menú lateral → **Permisos de API → + Agregar un permiso**
2. **Microsoft Graph → Permisos delegados**
3. Marca: `openid`, `email`, `profile`
4. Clic **Agregar permisos** → si aparece **Conceder consentimiento de administrador**, clic

### Paso 8e — Crear los 3 secretos Azure en Secret Manager

```bash
echo -n "TU_AZURE_CLIENT_ID" \
  | gcloud secrets versions add RUR_AZURE_CLIENT_ID --data-file=-

echo -n "TU_AZURE_CLIENT_SECRET" \
  | gcloud secrets versions add RUR_AZURE_CLIENT_SECRET --data-file=-

echo -n "TU_AZURE_TENANT_ID" \
  | gcloud secrets versions add RUR_AZURE_TENANT_ID --data-file=-
```

---

## Paso 9 — Redeploy final

Dispara el deploy desde GitHub sin hacer cambios en el código:

**GitHub → tu repositorio → pestaña Actions → Deploy to Cloud Run → Run workflow → Run workflow**

Cuando termine, verifica:
```bash
curl -s "$URL/health"
# debe responder: {"status": "ok"}
```

---

## Paso 10 — Deploy automático en cada push

```bash
git push origin main  →  build (~8 min)  →  deploy (~3 min)  →  listo
```

Seguimiento en GitHub → pestaña **Actions**.

---

## Actualizar un secreto existente (operación futura)

```bash
echo -n "NUEVO_VALOR" | gcloud secrets versions add NOMBRE_DEL_SECRETO --data-file=-
```

Luego redeploy: **GitHub → Actions → Deploy to Cloud Run → Run workflow**

> Rotar `RUR_SECRET_KEY` invalida todas las sesiones activas. Hacerlo fuera de horario laboral.

---

## Paso opcional — Dominio personalizado

> La URL `*.run.app` es permanente y funciona para producción. Este paso solo aplica si quieres una URL propia como `rur.tuempresa.com`.

**Requisitos:** dominio propio y acceso para modificar registros DNS.

1. **Cloud Run → Administrar dominios personalizados → + Agregar asignación**
2. Selecciona el servicio `rur-app`
3. Escribe el subdominio (ej: `rur.tuempresa.com`)
4. GCP muestra un registro DNS — agrégalo en el panel DNS de tu registrador
5. Espera 15–60 minutos — GCP emite el certificado SSL automáticamente

Después, actualiza los secretos con la nueva URL:
```bash
URL_CUSTOM=https://rur.tuempresa.com

echo -n "$URL_CUSTOM" \
  | gcloud secrets versions add RUR_APP_BASE_URL --data-file=-

echo -n "$URL_CUSTOM/api/auth/microsoft/callback" \
  | gcloud secrets versions add RUR_AZURE_REDIRECT_URI --data-file=-
```

Luego redeploy (Paso 9) y actualiza también el URI de redireccionamiento en Azure (Paso 8a).

---

## Rollback

```bash
# Ver revisiones disponibles
gcloud run revisions list --service=rur-app --region=$REGION

# Redirigir el 100% del tráfico a una revisión anterior
gcloud run services update-traffic rur-app \
  --region=$REGION \
  --to-revisions=NOMBRE-REVISION=100
```

---

## Diagnóstico de errores

### Ver logs de la app

```bash
gcloud run services logs read rur-app --region=$REGION --limit=50
```

### Error 503 — "Connection Refused" en socket Cloud SQL

```
connection to server on socket "/cloudsql/PROYECTO:REGION:INSTANCIA/.s.PGSQL.5432" failed: Connection refused
```

**Causa más frecuente:** la API de Cloud SQL Admin no estaba habilitada al momento del deploy.

```bash
gcloud services enable sqladmin.googleapis.com
```

Luego redeploy (Run workflow o Re-run failed jobs).

**Otras causas:**
- `RUR_DATABASE_URL` mal formado — formato exacto requerido:
  ```
  postgresql://USUARIO:PASSWORD@/BD?host=/cloudsql/PROYECTO:REGION:INSTANCIA
  ```
- El GitHub secret `CLOUD_SQL_INSTANCE` no coincide con el nombre de conexión real:
  ```bash
  gcloud sql instances describe TU_INSTANCIA --format="value(connectionName)"
  ```

### Error de SSO Microsoft

- Verifica que `RUR_AZURE_REDIRECT_URI` coincida exactamente con el URI registrado en Azure (Paso 8a)
- Haz un redeploy tras cualquier cambio en secretos (Paso 9)

### Health check

```bash
curl -s "$URL/health"
# → {"status": "ok"}
```

---

## Checklist de puesta en marcha

```
[ ] Paso 0 — Variables Cloud Shell definidas
[ ] Paso 1 — rur-app-sa creado con roles secretmanager + cloudsql
[ ] Paso 2 — Instancia Cloud SQL creada y base de datos creada
[ ] Paso 3 — 7 APIs habilitadas (incluido sqladmin.googleapis.com)
[ ] Paso 4 — 14 secretos RUR_* con al menos 1 versión en Secret Manager
[ ] Paso 5 — Repositorio "rur" en Artifact Registry + github-actions-sa con 3 roles
[ ] Paso 6 — WIF configurado + 6 secrets de GitHub configurados
[ ] Primer push — pipeline completó exitosamente (build + deploy)
[ ] URL del servicio anotada en Hoja de trabajo
[ ] Paso 7 — RUR_APP_BASE_URL y RUR_AZURE_REDIRECT_URI con URL real
[ ] Paso 8 — App Registration en Azure configurada (si se usa SSO)
[ ] Paso 9 — Redeploy final completado
[ ] Health check responde {"status": "ok"}
[ ] Login con admin / contraseña definida en RUR_ADMIN_INITIAL_PASSWORD funciona
```
