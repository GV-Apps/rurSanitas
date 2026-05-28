# Estructura del Proyecto

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Servidor web | FastAPI 0.111+ (Python 3.12) |
| Servidor ASGI/WSGI | Gunicorn + Uvicorn workers |
| Frontend | Vanilla JavaScript — SPA sin frameworks |
| Plantillas | Jinja2 (solo para servir el HTML inicial) |
| BD desarrollo | SQLite (archivo local `app/formularios.db`) |
| BD producción | PostgreSQL 15+ (Cloud SQL) |
| Contenedores | Docker + Docker Compose |
| CI/CD | GitHub Actions → GHCR → Artifact Registry → Cloud Run |
| Producción | Google Cloud Run (serverless) + Cloud SQL + Secret Manager |
| Autenticación | Sesiones firmadas (Starlette SessionMiddleware + SHA-256) + SSO Microsoft EntraID |
| Seguridad CI/CD | SAST (Semgrep) + SCA (pip-audit) + Trivy + cosign (firma keyless) |

---

## Árbol de archivos

```
/
├── app/                             ← Aplicación principal
│   ├── main.py                      ← Entry point FastAPI; monta routers y middleware
│   ├── auth.py                      ← Dependencias require_login / require_admin
│   ├── config.py                    ← Variables de entorno (SECRET_KEY, DATABASE_URL, DEBUG)
│   ├── database.py                  ← Adaptador SQLite↔PostgreSQL; función get_db()
│   │
│   ├── core/
│   │   ├── fields.py                ← Mapeo código→columna DB; jerarquía de roles
│   │   ├── helpers.py               ← Lógica compartida: auth, notificaciones, auditoría,
│   │   │                               visibilidad/edición de registros, carga Excel
│   │   └── seed_data.py             ← Definición de los 139 campos del formulario
│   │                                   y 1337+ opciones de listas desplegables
│   │
│   ├── routers/                     ← Endpoints organizados por dominio
│   │   ├── auth_routes.py           ← POST /api/login, POST /api/logout, GET /api/session
│   │   ├── registros.py             ← CRUD de registros de conciliación (router principal)
│   │   ├── usuarios.py              ← Gestión de usuarios (solo ADMIN)
│   │   ├── campos.py                ← Lectura de campos por rol
│   │   ├── campos_admin.py          ← Administración de campos (solo ADMIN)
│   │   ├── listas.py                ← Opciones de listas desplegables
│   │   ├── prestadores.py           ← CRUD prestadores + solicitudes de gestor
│   │   ├── export.py                ← Exportación a Excel por rol
│   │   ├── audit.py                 ← Historial de auditoría por registro
│   │   ├── auditoria.py             ← Asignación y respuesta de auditorías activas
│   │   ├── notificaciones.py        ← Notificaciones internas entre usuarios
│   │   ├── festivos.py              ← Gestión de días festivos
│   │   ├── ciudad_codigos.py        ← Códigos de ciudad para consecutivos
│   │   └── config_lider.py          ← Configuración de umbral LIDER → CONTRALOR
│   │
│   ├── static/
│   │   ├── app.js                   ← SPA completa (~8000 líneas): formulario dinámico,
│   │   │                               validaciones, cuotas, fórmulas, modales, roles
│   │   └── style.css                ← Estilos — sistema de diseño Keralty/EPS Sanitas (Figtree)
│   │
│   └── templates/
│       └── index.html               ← Shell HTML de la SPA; carga app.js y style.css
│
├── docker/
│   ├── Dockerfile                   ← Imagen multi-stage Python 3.12-slim
│   ├── docker-compose.yml           ← Desarrollo local con PostgreSQL (opcional)
│   ├── docker-compose.ghcr.yml      ← Producción con imagen desde GHCR (servidor propio)
│   ├── nginx/
│   │   └── nginx.conf               ← Proxy inverso, SSL, rate limiting, headers seguridad
│   └── scripts/
│       └── entrypoint.sh            ← Script de arranque del contenedor (Alembic + Gunicorn)
│
├── migrations/                      ← Migraciones Alembic (esquema de BD)
│   └── env.py
│
├── .github/
│   └── workflows/
│       ├── build-push.yml           ← CI/CD: SAST + SCA + Tests + build + Trivy + cosign
│       └── deploy-cloudrun.yml      ← Deploy automático a Cloud Run tras build exitoso
│
├── importar_historicos.py           ← Script CLI para importación masiva de registros
│                                       históricos desde Excel
├── requirements.txt                 ← Dependencias Python
├── alembic.ini                      ← Configuración de Alembic
├── .env.example                     ← Plantilla de variables de entorno
└── .gitignore
```

---

## Flujo de la aplicación

```
Navegador
    │
    ├── GET /  →  index.html (shell HTML)  →  app.js carga la SPA
    │
    ├── POST /api/login  →  verifica usuario/contraseña → crea sesión firmada
    │
    ├── GET /api/session  →  comprueba sesión activa → devuelve rol y permisos
    │
    ├── GET /api/campos/{rol}  →  campos y opciones del formulario
    │
    ├── GET /api/registros/grupos-resumen  →  estructura paginada de registros
    ├── GET /api/registros/lista-paginada  →  20 registros por grupo por página
    │
    ├── POST /api/registros/{rol}   →  crear registro
    ├── PUT  /api/registros/{id}    →  editar registro
    │
    └── GET /api/registros/exportar/{rol}  →  Excel filtrado por rol
```

---

## Detección automática de base de datos

```python
# config.py
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Sin DATABASE_URL → SQLite (desarrollo, sin instalación)
# Con DATABASE_URL  → PostgreSQL (producción)
```

El adaptador en `database.py` hace transparente la diferencia: el mismo código
de negocio funciona con ambos motores sin cambios.

---

## SPA (Single Page Application)

La interfaz es una SPA en Vanilla JavaScript alojada en `app/static/app.js`.
No usa frameworks (no React, no Vue, no Angular). Todas las "páginas" son
secciones `<div>` con clase `hidden` que se muestran/ocultan según el estado.

Ventajas de este diseño:
- Sin transpilación ni build tools
- Sin dependencias de npm
- El código se puede leer y modificar directamente en el IDE
- Compatible con cualquier servidor que sirva archivos estáticos
