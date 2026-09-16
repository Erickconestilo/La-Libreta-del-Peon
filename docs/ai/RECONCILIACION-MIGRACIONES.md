<!-- doc-status
estado: vivo
verificado: 2026-09-16
-->

# Reconciliación de migraciones 015–030

## Alcance y fuente del estado

Este informe cubre únicamente la Tarea 1 del bloque P0. Se leyeron los SQL
locales 015–030 —015 antes de trasladarlo a `migrations/deprecated/`— y el
runner de migraciones. No se ejecutó SQL, no se abrió ninguna conexión a
PostgreSQL o Supabase y no se modificó ninguna base.

El estado real de Supabase que se usa aquí es exclusivamente el re-verificado y
aportado para el proyecto `tmlexrsnxpmykbpeebri` el 2026-09-13:

- `public.schema_migrations` contiene `001`–`013`, `016`, `017` y `018`; no
  contiene `015`.
- `019`–`026` estaban aplicadas funcionalmente y el 2026-09-16 quedaron
  registradas en `public.schema_migrations` sin reejecutar sus SQL. El dry-run
  previo y la relectura posterior confirmaron también que en 024 `name`,
  `default_unit` e `is_active` coinciden con el SQL; los cinco códigos existen.
- `027`, `028`, `029` y `030` quedaron aplicadas y registradas el 2026-09-16,
  después de cerrar 019–026 y obtener un backup nuevo.
- `014_monitoring_rounds.sql` existe en `apps/backend/migrations/deprecated/`.
- El bucket `storage.buckets` `topofield-photos` es público. Ninguna de las
  migraciones 015–030 corrige esa propiedad.

Las menciones antiguas de otros documentos no sustituyen esta fotografía
re-verificada. En particular, la documentación histórica local no se usa para
mantener 021 o 024 como ausentes: la comprobación de objetos confirma que
ambas están aplicadas.

## Hallazgos que afectan a la secuencia

### 1. 015 no es una migración pendiente ordinaria

`015_obras_baseline_retroactive.sql` se declara a sí misma documental y “no
aplicar”. Describe el modelo legacy `obras`, `campanas`, `jornadas`, `sensores`,
`mediciones` y `estacionamientos`, que no es el modelo vigente de TopoField.
Debe conservarse como evidencia histórica, no registrarse como si hubiera sido
ejecutada ni ejecutarse para “rellenar” el hueco 014.

Hay además un defecto de ejecución independiente de la decisión de dominio:
en un esquema vacío el SQL crea `campanas` con una FK a `jornadas` antes de
crear `jornadas`, y crea `mediciones` con una FK a `estacionamientos` antes de
crear `estacionamientos`. Por ello el runner, que ve el archivo 015 y no ve su
número en el ledger, intentaría ejecutarlo antes de llegar a 019. La corrección
aprobada ya se aplicó: 015 está en `migrations/deprecated/`, igual que 014, y
el README de esa carpeta explica el motivo. No se añade un tombstone al ledger
ni se modifica el runner.

### 2. 020–026 quedan aplicadas funcionalmente

La re-verificación directa por objeto confirma que 020 tiene las nueve tablas
con `relrowsecurity = true` y la política `legacy deny all` en cada una. También
confirma `execution_order` y su índice de 021, `access_level` de 022,
`work_completion_reports` de 023, los cinco códigos de 024, el trigger
`on_auth_user_created` de 025 y el `CHECK` de `users` que acepta `supervisor`
en 026.

Las ocho migraciones 019–026 se registraron sin reejecutar sus SQL. El informe
de paridad de 024 no encontró diferencias, y el script no contiene ninguna ruta
para corregir esos valores.

### 3. No hay un parcial demostrado

Con los estados funcionales re-verificados no se identifica una migración
“parcial” de forma inequívoca. El dry-run confirmó los cinco códigos y sus tres
campos comparados en 024. Si una verificación posterior encuentra un objeto
faltante, esa fila deberá cambiarse a `parcial` indicando exactamente cuál; no
se infiere ese dato.

## Tabla de reconciliación

| Archivo | Objetos que crea o modifica | Estado real en el esquema | Acción propuesta | Riesgo de ejecutarla tal cual hoy |
|---|---|---|---|---|
| `015_obras_baseline_retroactive.sql` | Tablas legacy `obras`, `campanas`, `jornadas`, `sensores`, `mediciones` y `estacionamientos`; índices, RLS, 24 políticas y comentarios. No crea las funciones RLS que referencia. | **Ausente por diseño en TopoField / baseline documental.** No se considera una migración aplicada ni un hueco que deba rellenarse. | **Migración correctiva/documental:** no ejecutar ni registrar como aplicada; mantener el baseline separado del modelo vigente. | **Muy alto:** crearía un modelo paralelo legacy; además puede fallar por FKs a tablas creadas después, y los índices/políticas no tienen guardas de reejecución. |
| `016_unify_profiles_into_users.sql` | Añade `users.legacy_usuario_id`; copia y actualiza usuarios; elimina `public.profiles CASCADE`; cambia comentarios de `users`. | **Aplicada y registrada** en `schema_migrations`. | **Sin acción.** | **Crítico:** contiene `INSERT`, `UPDATE` y `DROP TABLE ... CASCADE`; con `profiles` ausente fallaría al consultar antes de completar, y con datos presentes podría alterar o borrar datos. |
| `017_drop_topotask_integration_tables.sql` | Verifica conteos y elimina `incidencia_fotos`, `incidencias`, `obra_destinatarios` y `envios_correo` con `CASCADE`; comenta el esquema. | **Aplicada y registrada** en `schema_migrations`. | **Sin acción.** | **Crítico:** es destructiva; si las tablas están ausentes, las consultas de conteo pueden abortar antes del `DROP`; si reaparecieron con filas, solo aborta después de comprobarlo. |
| `018_station_messages_client_request_id.sql` | Añade `station_messages.client_request_id`; crea índice único parcial `idx_station_messages_client_request_id`. | **Aplicada y registrada** en `schema_migrations`. | **Sin acción.** | **Bajo–medio:** usa `IF NOT EXISTS`, pero falla si hay duplicados no nulos o si un objeto con el mismo nombre tiene una definición incompatible. |
| `019_monitoring_rounds.sql` | Crea `instrument_types`, `control_points`, `monitoring_rounds`, `monitoring_round_points`, `instrument_readings`, `reading_attachments`, `control_point_thresholds`, `project_code_catalog` y `project_rules`; siembra seis tipos de instrumento y crea ocho índices. No activa RLS. | **Aplicada funcionalmente y registrada** el 16-09-2026 sin reejecutar SQL. | **Sin acción.** | Reejecutarla no aporta valor y puede ocultar drift. |
| `020_monitoring_rounds_rls.sql` | Activa RLS en las nueve tablas de 019 y crea una política `legacy deny all` para `anon` y `authenticated` en cada una. | **Aplicada funcionalmente y registrada**; definiciones de policies/RLS re-verificadas. | **Sin acción.** | No repetir `CREATE POLICY`. |
| `021_monitoring_round_assignment_order.sql` | Añade `monitoring_rounds.execution_order` con valor por defecto 0; crea índice parcial de cola por operador, fecha y orden. | **Aplicada funcionalmente y registrada**; índice re-verificado. | **Sin acción.** | No reejecutar sin una migración correctiva explícita. |
| `022_project_membership_access_level.sql` | Añade `project_memberships.access_level`; elimina y recrea el `CHECK` para `read`/`write`; crea índice parcial por obra y nivel. | **Aplicada funcionalmente y registrada**; CHECK re-verificado. | **Sin acción.** | Una correctiva futura debe preservar datos y constraint vigentes. |
| `023_work_completion_reports.sql` | Crea `work_completion_reports` con FKs, checks y unicidad de `client_request_id`; dos índices; RLS y política `legacy deny all`. | **Aplicada funcionalmente y registrada**; constraints/RLS re-verificados. | **Sin acción.** | No repetir la policy existente. |
| `024_field_instrument_catalog.sql` | Inserta o actualiza cinco códigos en `instrument_types`: `fissure_witness`, `fissure_gauge`, `potentiometer`, `clinometer` y `convergence_tape`; reactiva cada código. | **Aplicada funcionalmente y registrada**; los cinco códigos y sus campos coinciden. | **Sin acción.** | Reejecutar el UPSERT podría sobrescribir una decisión manual futura. |
| `025_fix_auth_user_trigger_users.sql` | Reemplaza la función `public.handle_new_auth_user()` para insertar en `users`; no crea ni altera el trigger que la invoca. | **Aplicada funcionalmente y registrada**; la función vigente está legítimamente supersedida por 026. | **Sin acción.** | No reejecutarla porque podría degradar el soporte de `supervisor`. |
| `026_supervisor_role.sql` | Elimina y recrea `users_role_check` incluyendo `supervisor`; reemplaza `handle_new_auth_user()` para aceptar ese rol. | **Aplicada funcionalmente y registrada**; función/trigger/CHECK re-verificados. | **Sin acción.** | Cualquier cambio futuro debe hacerse como migración nueva. |
| `027_station_mounting_visits.sql` | Índice único auxiliar en `stations`; tablas `station_mounting_visits` y `mounting_visit_evidence`; FKs compuestas tenant; cuatro índices; RLS y políticas guardadas. | **Aplicada y registrada 16-09-2026.** | **Rutas desplegadas en `349967a`; pendiente validación física en Galaxy.** | El rollback preferido ante fallo de cliente/backend es conservar este esquema aditivo. |
| `028_reading_attachment_idempotency.sql` | Comprueba duplicados por `reading_id` y `storage_path`; crea índice único `idx_reading_attachments_reading_storage`. | **Aplicada y registrada 16-09-2026; cero duplicados.** | **Sin acción de esquema.** | El índice debe permanecer como garantía de concurrencia. |
| `029_monitoring_work_execution_events.sql` | Crea tabla append-only de eventos; dos índices de consulta; dos índices únicos auxiliares; dos FKs compuestas con guardas; RLS y política `legacy deny all`. | **Aplicada y registrada 16-09-2026; capability `ready`.** | **Backend desplegado y contrato público verde; pendiente contrato autenticado/E2E Galaxy.** | El rollback de backend debe conservar la tabla aditiva. |
| `030_project_weekly_work.sql` | Crea `project_weekly_work_items` con FKs, checks de estado, versión, borrado lógico y unicidad por creador/request; índice parcial; RLS y política `legacy deny all`. | **Aplicada y registrada 16-09-2026; capability `ready`.** | **Backend desplegado/readiness verde; pendiente CRUD autenticado y v13 en Galaxy.** | El gate combinado evita promover backend si 029 o 030 dejan de estar listas. |

## Decisión operativa resultante

Tras la aprobación de esta tabla, pero antes de cualquier escritura:

1. Se implementa y ejecuta únicamente el script de reconciliación en dry-run
   contra la base real, sin ejecutar SQL de las migraciones y sin escribir el
   ledger.
2. 015 ya está en `apps/backend/migrations/deprecated/` y se documenta junto
   con 014; no se inventa un tombstone ni se modifica `run-migrations.ts`.
3. El script debe producir el informe de presencia de objetos/columnas y la
   paridad de los cinco códigos de 024, sin corregir diferencias.
4. No se registran todavía filas y no se ejecutan 027–030. Después del dry-run
   se detiene el trabajo para revisión.

La acción “registrar sin ejecutar” para 019–026 queda respaldada por el
dry-run real: las ocho migraciones tienen todos sus objetos y columnas
esperados, y 024 no presenta diferencias de campos. El script no ejecuta sus
SQL ni reescribe valores del catálogo.

## Tarea 2 — salida del dry-run real

Comando ejecutado, sin `--write`:

```text
npm run reconcile:migrations --workspace apps/backend
```

Resultado literal relevante:

```text
Modo: DRY-RUN (solo lectura)
Ledger public.schema_migrations: disponible
...
Migraciones aplicadas funcionalmente listas para registrar: 8
024 campos name/default_unit/is_active: OK
DRY-RUN: no se escribirá ninguna fila en schema_migrations.
```

La salida mostró `ledger: AUSENTE`, `objetos: OK` y `columnas: OK` para cada
migración 019–026. No se usó `--write`, no se ejecutó ningún SQL de esas
migraciones y no se ejecutaron 027–030.

## Tarea 3 — reconciliación del ledger ejecutada (16-09-2026)

Con autorización explícita se ejecutó:

```text
npm run reconcile:migrations --workspace apps/backend -- --write
```

Salida literal relevante:

```text
Modo: WRITE (solo ledger, con --write)
No se leen ni ejecutan los SQL de las migraciones.
...
Filas registradas en schema_migrations: 8
```

La relectura inmediata en modo dry-run mostró `ledger: PRESENTE` para cada
migración 019–026, `Migraciones aplicadas funcionalmente listas para registrar:
0` y `Candidatas: ninguna`. Además se verificaron read-only las definiciones
críticas de RLS/policies de 020/023, el índice 021, los checks 022/026, las
constraints de `work_completion_reports` y la función/trigger Auth vigente.
Este paso no ejecutó 027, 028, 029 ni 030.

## Tarea 4 — aplicación controlada 027–030 (16-09-2026)

Antes de escribir se creó el backup recuperable
`topofield-pre-027-030-2026-09-16T18-40-47-241Z.json`, de `55.300` bytes y
SHA-256 `c3746b34497247bb3a0239630ed81a5d45696a69a8813323d9d6c9e07fd645a8`.
El precheck confirmó tablas objetivo ausentes, cero grupos duplicados de
adjuntos y ledger sin 027–030.

Las cuatro migraciones se ejecutaron en transacciones separadas, con lock
advisory y registro de su filename solo después del SQL. La verificación
posterior confirmó: 027 tablas/FK/índices/RLS/policies; 028 índice único
`(reading_id, storage_path)` y cero duplicados; 029 tabla/11 columnas/UNIQUE/FK/
índices/RLS con `workExecution.available=true`; 030 tabla/15 columnas/UNIQUE/
índice/checks/RLS con `weeklyWork.available=true`. El backend local contra el
esquema remoto devolvió `/api/v1/readiness` `200` con ambas capabilities en
`reason=ready`. Después, PR #22 publicó un snapshot limpio en GitHub `main` y
Render auto-desplegó `349967a538a3a5e8f4c51245d02511b7ec6cce69`.
`/health` devolvió ese SHA y `/readiness` devolvió `200` con 029+030 `ready`;
el contrato público terminó correctamente. La validación autenticada y la
prueba física en Galaxy siguen fuera de esta misión de esquema.

## Tarea 5 — revalidación independiente de identidad y readiness (16-09-2026)

La tabla `public.schema_migrations` se releyó en modo solo lectura. Sus únicas
columnas son `id`, `filename` y `executed_at`; **no persiste checksum ni hash**.
Por ello, los siguientes SHA-256 identifican los ficheros SQL locales actuales,
pero no deben citarse como checksum remoto ni como prueba criptográfica de los
bytes ejecutados en Supabase:

| Migración | SHA-256 local |
|---|---|
| 019 | `0f0048b64e9f26efc23fdb61beccfe07257afa4261c9cc22e9e2d5f92770828b` |
| 020 | `d1ebf28c2ac25e4306f5fad36ff8651253e194139defbc88c780cecce0f016be` |
| 021 | `417b05cd2ca97d6d19c1d3ae6528f72d532647efe9020cb56d1e06074442216b` |
| 022 | `25188881231dedda4ebb19311afcbf14bb7cc9ae58761eb12b04e083ea31e3e5` |
| 023 | `2d1d0d40692954bb59279796cd7eed1c957677b9f17608376fadf6e9c794c965` |
| 024 | `c1bedb57b171bb51f47382d13536d875b03fb87c076b3814a6ff2eed88d8d334` |
| 025 | `8b8e92fef786fb70ad650b6d46c2e39cb0e6de9abf338c09ce4ce0ce6dab0393` |
| 026 | `085006421a3fc0e2a0d8544b8d9f90018f2c7bce26d76d8cf51e050676ba8ac4` |
| 027 | `1a459ef61be6b2d8f36956ba5ff593e9b68b40f9604ba7412965a27b97f22c40` |
| 028 | `26a3cb531717ef2a1b7e6c2653fd3d83a980d4bd57a1bc302af50feb374f58ff` |
| 029 | `b2d631a0cfdcba74ebed9319120b71d3533f2e05cacf73ffc8f70122fd956e3a` |
| 030 | `e2934e59dbd5ec2077efe33accfcec44d720f90242803a8b0d475085609c3e25` |

El ledger muestra 019–026 con una misma marca `executed_at` y 027–030 con cuatro
marcas posteriores distintas y crecientes. Eso corrobora la reconciliación
ledger-only seguida por cuatro registros separados; por sí solo no demuestra
los prechecks. Los prechecks/gates se atribuyen al registro contemporáneo de
ejecución de la Tarea 4.

La matriz de readiness se repitió contra PostgreSQL 17 efímero sin mutar
Supabase. Antes del hardening se reprodujeron dos falsos positivos: conservar el
nombre de la policy 029 cambiando su semántica a allow-all y conservar el nombre
del índice 030 con columnas distintas. Los probes se endurecieron en `6a44d75`
para comprobar PK, definiciones de columnas, FKs, índices, CHECKs y policy deny-all. Tras el fix,
`/readiness` responde `503` para ambos ausentes, 029 solo, 030 solo, drift 029,
drift 030, ausencia de PK en cualquiera y error de probe, y `200` solo cuando
029+030 son íntegros. El probe
endurecido contra Supabase real, en solo lectura, devuelve ambas capabilities
`ready`; esto valida el esquema actual, no publica por sí mismo el nuevo código
en Render.
