# Fase 3 móvil: rondas de auscultación

**Fecha:** 2026-07-31
**Estado:** implementada y validada técnicamente en Galaxy.
**Alcance:** rondas, puntos de control, lecturas, histórico y foto opcional,
con persistencia offline-first. No se aplicaron migraciones durante esta fase.

## Decisión offline

Las lecturas se guardan con `clientRequestId` y, sin conectividad o ante fallo
transitorio, se encolan en SQLite con `entity_type = 'medicion'`. La foto es
una operación de outbox independiente, con una ruta firmada de Storage por
lectura. La recuperación de red reutiliza el mismo UUID, por lo que el backend
mantiene la idempotencia.

## Flujos entregados

- Lista y creación de rondas por obra, con estado `draft`, `active`, `closed`
  y `cancelled`.
- Detalle de ronda y sus puntos pendientes/tomados; alta de punto a ronda.
- CRUD básico de puntos de control, histórico de lecturas y activación.
- Captura numérica o textual, unidad, notas y foto opcional.
- Estado de umbral `normal`, `warning`, `alarm` o `unknown` cuando responde
  el backend; estado pendiente cuando queda en outbox.
- Acciones mutables ocultas para el rol visitante.

Los instrumentos son: `digital_level`, `piezometer`, `distometer`,
`linometer`, `inclinometer` y `cant_rule`. La estación total conserva su flujo
propio de prismas.

## Render y correcciones halladas en dispositivo

Render publica `e7e2902`. La ruta de rondas devuelve `401` sin bearer, lo que
confirma que existe y exige autenticación.

El E2E detectó y corrigió dos defectos reales:

1. El scope de `topografo` contra `projects` construía `p.project_id`; la
   columna correcta es `p.id` (`0c61b50`).
2. El reintento idempotente de una lectura convertía la fecha a texto local,
   que PostgreSQL rechazaba por `GMT+0200`. Ahora se usa ISO 8601 y el sync
   engine reintenta fallos transitorios también en su comprobación periódica
   (`e7e2902`).

## E2E real

El escenario final se ejecutó con APK release local instalada por ADB en
Galaxy S25, sin EAS. Con modo avión confirmado se guardó `7 mm` y una foto;
tras `force-stop` y reapertura aún sin red, al restaurar conectividad Logcat
registró:

```text
[SyncEngine] Flushing 2 pending items...
[SyncEngine] Item ... synced successfully
[SyncEngine] Item ... synced successfully
[SyncEngine] Flush complete: 2/2 synced
```

Supabase confirmó una sola fila de lectura para
`a0ee5b77-480d-4f3e-9ed5-7ee8bb4810bb`, con `client_request_id` poblado, y un
adjunto asociado. El informe con identificadores, evidencia y limitaciones está
en `PHASE_3_DEVICE_E2E_REPORT_2026-07-31.md`.

## Verificación

```text
npm run build --workspace apps/backend
npm test --workspace apps/backend
npm run test --workspace apps/mobile -- --runInBand
npx tsc --noEmit --project apps/mobile/tsconfig.json
```

## Pendientes antes de piloto

- Persistir/cargar la lista de Obras para que un arranque frío sin red no deje
  la pantalla sin contexto.
- Mostrar operaciones del outbox en `error` y una acción de reintento o
  diagnóstico para el usuario.
- Decidir uso real de `project_code_catalog` y `project_rules` a partir de
  una campaña de campo.
