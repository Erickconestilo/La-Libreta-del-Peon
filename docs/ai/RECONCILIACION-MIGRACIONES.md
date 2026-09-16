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
- `027`, `028`, `029` y `030` no están aplicadas.
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
| `019_monitoring_rounds.sql` | Crea `instrument_types`, `control_points`, `monitoring_rounds`, `monitoring_round_points`, `instrument_readings`, `reading_attachments`, `control_point_thresholds`, `project_code_catalog` y `project_rules`; siembra seis tipos de instrumento y crea ocho índices. No activa RLS. | **Aplicada funcionalmente; no registrada** en el ledger. | **Registrar sin ejecutar**, después de comprobar que los nueve objetos, la semilla y los índices coinciden con el SQL. | **Medio:** `IF NOT EXISTS` solo evita algunos choques por nombre y no valida el esquema; puede ocultar drift y fallar en FKs, índices o restricciones incompatibles. Reejecutarla tampoco resuelve el RLS. |
| `020_monitoring_rounds_rls.sql` | Activa RLS en las nueve tablas de 019 y crea una política `legacy deny all` para `anon` y `authenticated` en cada una. | **Aplicada funcionalmente; no registrada** en el ledger. Las nueve tablas tienen `relrowsecurity = true` y la política está presente en cada una. | **Registrar sin ejecutar**; no repetir `CREATE POLICY`. | **Medio–alto:** `ALTER TABLE ... ENABLE` es repetible, pero `CREATE POLICY` no; reejecutarla abortaría en la primera política existente. |
| `021_monitoring_round_assignment_order.sql` | Añade `monitoring_rounds.execution_order` con valor por defecto 0; crea índice parcial de cola por operador, fecha y orden. | **Aplicada funcionalmente; no registrada** en el ledger. La columna y `idx_monitoring_rounds_operator_queue` existen. | **Registrar sin ejecutar**; no volver a ejecutar el SQL. | **Bajo–medio:** las guardas no detectarían un tipo, default o definición de índice incompatible, aunque el objeto actual existe. |
| `022_project_membership_access_level.sql` | Añade `project_memberships.access_level`; elimina y recrea el `CHECK` para `read`/`write`; crea índice parcial por obra y nivel. | **Aplicada funcionalmente; no registrada** en el ledger. | **Registrar sin ejecutar**, validando previamente columna, constraint e índice. | **Medio:** el `DROP CONSTRAINT` seguido de `ADD CONSTRAINT` sustituye la regla existente y puede fallar por filas inválidas o drift; `IF NOT EXISTS` no valida la definición existente. |
| `023_work_completion_reports.sql` | Crea `work_completion_reports` con FKs, checks y unicidad de `client_request_id`; dos índices; RLS y política `legacy deny all`. | **Aplicada funcionalmente; no registrada** en el ledger. | **Registrar sin ejecutar**, tras comprobar tabla, restricciones, índices, RLS y política. | **Medio:** la tabla e índices tienen guardas, pero `CREATE POLICY` no; una tabla existente con esquema distinto no se corrige y la reejecución puede abortar por política duplicada. |
| `024_field_instrument_catalog.sql` | Inserta o actualiza cinco códigos en `instrument_types`: `fissure_witness`, `fissure_gauge`, `potentiometer`, `clinometer` y `convergence_tape`; reactiva cada código. | **Aplicada funcionalmente; no registrada** en el ledger. El dry-run confirmó los cinco códigos y coincidencia de `name`, `default_unit` e `is_active`. | **Registrar sin ejecutar**; no corregir valores. | **Medio:** el `UPSERT` es idempotente para la clave, pero sobrescribe nombre, unidad y `is_active`; podría deshacer una decisión manual. |
| `025_fix_auth_user_trigger_users.sql` | Reemplaza la función `public.handle_new_auth_user()` para insertar en `users`; no crea ni altera el trigger que la invoca. | **Aplicada funcionalmente; no registrada** en el ledger. El dry-run confirmó la función y el trigger `on_auth_user_created`. | **Registrar sin ejecutar**. Si hubiera que rehacerla, usar una correctiva que preserve el rol `supervisor` de 026. | **Alto:** ejecutarla hoy puede reemplazar la función de 026 y volver a rechazar `supervisor` en metadata, degradándolo a `topografo`; además modifica el comportamiento de creación de usuarios Auth. |
| `026_supervisor_role.sql` | Elimina y recrea `users_role_check` incluyendo `supervisor`; reemplaza `handle_new_auth_user()` para aceptar ese rol. | **Aplicada funcionalmente; no registrada** en el ledger. | **Registrar sin ejecutar**, comprobando constraint, función y trigger asociado. | **Medio–alto:** recrear el constraint puede fallar por roles inválidos; reemplaza la función Auth y el orden respecto a 025 importa. |
| `027_station_mounting_visits.sql` | Índice único auxiliar en `stations`; tablas `station_mounting_visits` y `mounting_visit_evidence`; FKs compuestas tenant; cuatro índices; RLS y políticas guardadas. | **Ausente.** | **Ejecutar** después del dry-run y de aprobación separada; no en este paso. | **Medio:** hay guardas útiles, pero FKs compuestas pueden fallar ante drift u huérfanos; las guardas por nombre no garantizan la definición completa. |
| `028_reading_attachment_idempotency.sql` | Comprueba duplicados por `reading_id` y `storage_path`; crea índice único `idx_reading_attachments_reading_storage`. | **Ausente.** | **Ejecutar** después del dry-run y de aprobación separada; preflight obligatorio de duplicados. | **Medio–alto:** falla deliberadamente si existen duplicados; no debe ocultarse con un `ON CONFLICT`. |
| `029_monitoring_work_execution_events.sql` | Crea tabla append-only de eventos; dos índices de consulta; dos índices únicos auxiliares; dos FKs compuestas con guardas; RLS y política `legacy deny all`. | **Ausente.** | **Ejecutar** después del dry-run, en la secuencia aprobada; no en este paso. | **Medio:** constraints o políticas pueden fallar ante drift; las guardas no validan la semántica completa de objetos existentes. |
| `030_project_weekly_work.sql` | Crea `project_weekly_work_items` con FKs, checks de estado, versión, borrado lógico y unicidad por creador/request; índice parcial; RLS y política `legacy deny all`. | **Ausente.** | **Ejecutar** únicamente después de la base efímera y del gate de release; no en este paso. | **Medio:** no tiene DML, pero el esquema existente no se valida y una política parcial puede abortar; no debe ampliar el fallo de readiness al núcleo. |

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
