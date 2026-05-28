# Base de Datos

El sistema soporta **SQLite** (desarrollo) y **PostgreSQL** (producción) usando el mismo código.
La detección es automática según la variable de entorno `DATABASE_URL`.

La base de datos se inicializa automáticamente al arrancar la aplicación por primera vez:
se crean todas las tablas, se insertan los campos del formulario y las opciones de las listas.

---

## Tablas del sistema

### `usuarios`
Almacena los usuarios del sistema con sus permisos por rol.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador único |
| `usuario` | TEXT UNIQUE | Nombre de usuario para login |
| `password_hash` | TEXT | Hash SHA-256 de la contraseña |
| `nombre_completo` | TEXT | Nombre visible en el sistema |
| `cedula` | TEXT | Número de identificación |
| `cargo` | TEXT | Cargo del usuario |
| `correo` | TEXT | Correo electrónico |
| `regional` | TEXT | Regional a la que pertenece |
| `perm_gestor_1` | INTEGER (0/1) | Permiso de Gestor 1 |
| `perm_gestor_2` | INTEGER (0/1) | Permiso de Gestor 2 |
| `perm_lider` | INTEGER (0/1) | Permiso de Líder |
| `perm_coordinador` | INTEGER (0/1) | Permiso de Coordinador |
| `perm_contralor` | INTEGER (0/1) | Permiso de Contralor |
| `is_admin` | INTEGER (0/1) | Administrador del sistema |
| `superior_inmediato` | TEXT | `usuario` del jefe directo |
| `activo` | INTEGER (0/1) | 0 = desactivado (no puede hacer login) |

**Notas:**
- Un usuario puede tener múltiples permisos activos simultáneamente
- `is_admin = 1` otorga acceso total, independiente de los demás permisos
- El sistema protege que siempre exista al menos un administrador activo
- Usuario por defecto al inicializar: `admin` / `admin123` — **cambiar en el primer uso**

---

### `campos`
Define los 139 campos del formulario de conciliación.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador único |
| `codigo` | TEXT UNIQUE | Código corto (A, B, C ... FX) |
| `nombre` | TEXT | Nombre descriptivo del campo |
| `modo` | TEXT | `MANUAL` (editable) o `AUTOMATICA` (calculado) |
| `origen` | TEXT | `LISTA` si usa opciones de `lista_opciones`; NULL si es libre |
| `tipo_dato` | TEXT | `Texto`, `Moneda`, `Fecha`, `Texto lista`, `Porcentaje`, `Binario`, `Entero` |
| `comentario` | TEXT | Tooltip informativo en el formulario |
| `formula` | TEXT | Fórmula de cálculo para campos AUTOMATICA (ej: `SUMA(S8:AA8)`) |
| `rol` | TEXT | Roles que pueden ver/editar este campo (ej: `GESTOR 1`, `LIDER,CONTRALOR`) |
| `orden` | INTEGER | Posición en el formulario |
| `requerido_crear` | INTEGER (0/1) | Obligatorio al crear el registro |
| `requerido_g2_lider` | INTEGER (0/1) | Obligatorio para Gestor 2 / Líder |
| `requerido_contralor` | INTEGER (0/1) | Obligatorio para Contralor |
| `dependencias` | TEXT | Dependencias de otros campos (para fórmulas) |

---

### `lista_opciones`
Opciones de los campos de tipo Lista desplegable.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador único |
| `codigo_campo` | TEXT | Código del campo al que pertenece la opción |
| `nombre_campo` | TEXT | Nombre descriptivo del campo |
| `valor` | TEXT | Texto de la opción |
| `activo` | INTEGER (0/1) | 1 = visible en el formulario |
| `fecha_creacion` | TEXT | Fecha de creación |

---

### `registros`
Tabla principal del sistema. Cada fila es un registro de conciliación.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador único |
| `rol` | TEXT | Rol del usuario que creó el registro |
| `usuario` | TEXT | Username del creador |
| `fecha_creacion` | TEXT | ISO 8601 |
| `validado` | INTEGER (0/1) | 1 = validado por el Gestor asignado |
| `fecha_validacion` | TEXT | Fecha de validación |
| `validado_por` | TEXT | Usuario que validó |
| `reapertura_lider_ac` | INTEGER | Contador de reaperturas del campo AC |
| `reapertura_lider_bd` | INTEGER | Contador de reaperturas del campo BD |
| `reapertura_lider_ce` | INTEGER | Contador de reaperturas del campo CE |
| `estado_aprobacion_n` | TEXT | Estado del flujo de aprobación del campo N |
| `comentario_solicitud_n` | TEXT | Comentario al solicitar aprobación de N |
| `comentario_rechazo_n` | TEXT | Motivo de rechazo de N |
| `comentario_aprobacion_contralor_n` | TEXT | Comentario de aprobación del Contralor |
| `n_valor_anterior` | TEXT | Valor de N antes de la solicitud |
| `origen_pendiente_n` | TEXT | `create` o `update` |
| `proceso_finalizado` | INTEGER (0/1) | 1 = proceso finalizado por Contralor |
| **A .. FX** | varios | Una columna por cada campo del formulario |

Los nombres de columna corresponden a los nombres descriptivos definidos en `core/fields.py`
(ej: `CONSECUTIVO_DE_RADICACION_DE_LA_CONCILIACION`, `REGIONAL_IPS`, etc.).

---

### `audit_log`
Historial completo de cambios en los registros.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador único |
| `registro_id` | INTEGER | ID del registro afectado |
| `accion` | TEXT | `creacion`, `modificacion`, `eliminacion` |
| `usuario` | TEXT | Quien hizo el cambio |
| `rol` | TEXT | Rol(es) del usuario en el momento |
| `es_autorizado` | INTEGER (0/1) | 1 = autor/asignado del registro |
| `campos_diff` | TEXT | JSON con `{columna: {antes, despues}}` |
| `consecutivo` | TEXT | Campo A del registro (para identificación rápida) |
| `nombre_prestador` | TEXT | Nombre del prestador (campo I) |
| `fecha` | TEXT | ISO 8601 |
| `motivo_comentario` | TEXT | Comentario de cierre si aplica |

---

### `notificaciones`
Mensajes internos entre usuarios del sistema.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador único |
| `usuario_destino` | TEXT | Username del destinatario |
| `tipo` | TEXT | Tipo de evento (`cierre_registro`, `aprobacion_n`, etc.) |
| `mensaje` | TEXT | Texto del mensaje |
| `registro_id` | INTEGER | Referencia al registro (opcional) |
| `leida` | INTEGER (0/1) | 0 = no leída |
| `fecha_creacion` | TEXT | ISO 8601 |

---

### `prestadores`
Catálogo de prestadores de salud (IPS).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador único |
| `nit` | TEXT | NIT del prestador |
| `codigo_compania` | TEXT | Código de compañía |
| `compania` | TEXT | Nombre de la compañía |
| `nombre_sucursal` | TEXT | Nombre de la sucursal / IPS |
| `ciudad` | TEXT | Ciudad de ubicación |
| `regional` | TEXT | Regional |
| `estado` | TEXT | Estado del prestador |
| `creado_manual` | INTEGER (0/1) | 1 = creado manualmente desde el sistema |
| `fecha_creacion` | TEXT | Fecha de creación |
| *(otras columnas)* | TEXT | Datos adicionales de contratación y habilitación |

---

### `auditoria_registros`
Auditorías asignadas a registros por el Administrador.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador único |
| `registro_id` | INTEGER | ID del registro auditado |
| `comentario_admin` | TEXT | Comentario del Admin al crear la auditoría |
| `estado` | TEXT | `activa`, `en_proceso`, `terminada` |
| `admin_usuario` | TEXT | Usuario Admin que creó la auditoría |
| `destinatario_usuario` | TEXT | Usuario responsable de responder |
| `comentario_respuesta` | TEXT | Respuesta del destinatario |
| `fecha_creacion` | TEXT | ISO 8601 |
| `fecha_respuesta` | TEXT | ISO 8601 |

---

### `solicitudes_usuario`
Solicitudes de creación de gestores por Líderes y Contralores.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador único |
| `nombre_completo` | TEXT | Nombre del gestor solicitado |
| `correo` | TEXT | Correo del gestor |
| `regional` | TEXT | Regional asignada |
| `rol_solicitado` | TEXT | `GESTOR 1` o `GESTOR 2` |
| `comentario` | TEXT | Comentario adicional del solicitante |
| `solicitante` | TEXT | Username de quien solicitó |
| `estado` | TEXT | `pendiente`, `aprobada`, `denegada` |
| `comentario_respuesta` | TEXT | Respuesta del Admin |
| `fecha_solicitud` | TEXT | ISO 8601 |
| `fecha_respuesta` | TEXT | ISO 8601 |

---

### `solicitudes_prestador`
Solicitudes de registro de nuevos prestadores.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | — |
| `nit` | TEXT | NIT del prestador solicitado |
| `comentario` | TEXT | Contexto de la solicitud |
| `solicitante` | TEXT | Username de quien solicitó |
| `estado` | TEXT | `pendiente`, `aprobada`, `denegada` |
| `comentario_respuesta` | TEXT | Respuesta del Admin |
| `fecha_solicitud` | TEXT | ISO 8601 |
| `fecha_respuesta` | TEXT | ISO 8601 |

---

### `aprobacion_n_log`
Historial de acciones del flujo de aprobación del campo N.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | — |
| `registro_id` | INTEGER | ID del registro |
| `accion` | TEXT | `solicitud`, `aprobacion`, `rechazo`, `cancelacion`, `reaprobacion` |
| `usuario` | TEXT | Usuario que realizó la acción |
| `comentario` | TEXT | Comentario opcional |
| `fecha` | TEXT | ISO 8601 |

---

### `ciudad_codigos`
Prefijos por ciudad para generar el consecutivo del campo A.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | — |
| `ciudad` | TEXT | Nombre de la ciudad |
| `codigo` | TEXT | Código numérico de la ciudad |
| `activo` | INTEGER (0/1) | 1 = disponible en el formulario |

---

### `festivos`
Días festivos para validación de fechas de cuotas.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | — |
| `fecha` | TEXT UNIQUE | Formato `YYYY-MM-DD` |

---

### `config_umbral_lider_contralor`
Configuración del acceso extendido LÍDER → CONTRALOR.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | — |
| `campo_codigo` | TEXT | Código del campo Moneda a evaluar |
| `umbral` | REAL | Valor máximo para activar el acceso extendido |
| `activo` | INTEGER (0/1) | 1 = funcionalidad activa |

---

### `temp_reports`
Almacén temporal de reportes Excel generados (se limpian automáticamente).

| Columna | Tipo | Descripción |
|---|---|---|
| `token` | TEXT PK | Token UUID para descarga |
| `created_at` | REAL | Timestamp UNIX de creación |
| `data` | BLOB | Bytes del archivo Excel |

Los reportes expiran automáticamente a los **10 minutos** de ser generados.

---

## Inicialización automática

Al arrancar la aplicación por primera vez, `init_db()` en `app/core/helpers.py`:

1. Crea todas las tablas si no existen
2. Inserta los 139 campos del formulario desde `seed_data.py` (idempotente)
3. Inserta las 1337+ opciones de listas desde `seed_data.py` (solo si la tabla está vacía)
4. Inserta los festivos y códigos de ciudad por defecto
5. Crea el usuario `admin` con contraseña `admin123` si la tabla `usuarios` está vacía

Las migraciones de nuevas columnas también son idempotentes — se pueden ejecutar
en una base de datos existente sin perder datos.
