<!-- doc-status
estado: archivado
congelado: 2026-08-02
superado-por: MEMORIA.md
-->

> 🧊 **Documento archivado el 02-08-2026.** Se conserva como historial verificable y no se actualiza. Para el estado actual del proyecto ver `ROADMAP.md`; para el porqué de cada decisión, `MEMORIA.md`.

# Informe E2E Galaxy - Fase 3

**Fecha:** 2026-07-31
**Dispositivo:** Galaxy S25 (`SM-S938B`, ADB `R5CY21X6FLE`)
**Backend:** Render y Supabase `topofield` reales
**Build:** APK release local por Gradle/ADB. No se usó EAS y no se aplicaron
migraciones.

## Objetivo

Verificar una lectura de auscultación con foto en red y sin red, incluido
`force-stop` de la aplicación, recuperación automática y deduplicación mediante
`client_request_id`.

## Preparación

- Ronda: `E2E-Galaxy-20260731-Atc`.
- Punto de control: `E2E-CP-20260731` (el teclado ADB añadió un superíndice al
  código visual; no afecta a la relación de datos).
- Round point: `ff4daa4c-63ef-49a3-bcdc-496f85c4cf25`.
- APK local instalada con `adb install -r`; Play Protect permaneció activado.

## Resultado válido final

1. Conectividad desactivada y comprobada: `airplane_mode_on_before_save=1` y
   red predeterminada ausente.
2. La UI mostró `2 cambios pendientes de sincronizar`, `Lectura guardada sin
   conexión` y que la foto quedaba pendiente.
3. La lectura se creó con `clientRequestId`
   `a0ee5b77-480d-4f3e-9ed5-7ee8bb4810bb`, valor `7`, unidad `mm`.
4. Tras `force-stop` y reapertura aún en modo avión, SQLite inició y el motor
   registró `No connectivity, skipping flush`; no hubo crash.
5. Al restaurar la red, Logcat mostró literalmente:

```text
07-31 11:09:59.502 [SyncEngine] Flushing 2 pending items...
07-31 11:10:00.314 [SyncEngine] Item 3879cd63... synced successfully
07-31 11:10:02.250 [SyncEngine] Item a6956bb6... synced successfully
07-31 11:10:02.250 [SyncEngine] Flush complete: 2/2 synced
```

6. Consulta de solo lectura a Supabase: una sola fila para ese UUID, con
   `client_request_id` no nulo y `attachment_count = 1`. La foto quedó en
   `readings/df16f9d3-c776-4f00-a90d-89623b169321/328461c3-8a73-486a-ba60-c4a345f8ffa8.jpg`.

El criterio de aceptación se cumple para el escenario final: una lectura y un
adjunto, sin duplicados, y sincronización tras reinicio sin acción manual.

## Hallazgo anterior y corrección

Una repetición anterior dejó la lectura
`3633f319-f62f-4bf2-93e2-5cce1b95f59b` sin adjunto. El reintento del adjunto
recibía `500 READING_CREATE_FAILED`: en la rama idempotente el backend enviaba
una fecha local como `GMT+0200`, formato que PostgreSQL no acepta. Se corrigió
en `e7e2902` con ISO 8601 y test. Esa fila de diagnóstico no se borra ni se
presenta como prueba superada; queda trazable y tiene `attachment_count = 0`.

## Pendientes reales

- Arranque frío sin red: la pantalla Obras no tiene todavía cache local de la
  lista y muestra que no puede cargar. La outbox sí persiste y sincroniza.
- Un fallo definitivo del outbox no dispone aún de un control visible de
  reintento o explicación para el usuario.
- Los datos controlados de QA permanecen en Supabase para trazabilidad; su
  borrado sería una escritura de producción y requiere autorización explícita.

## Verificación reproducible

```powershell
npm run build --workspace apps/backend
npm test --workspace apps/backend
npm run test --workspace apps/mobile -- --runInBand
npx tsc --noEmit --project apps/mobile/tsconfig.json
curl.exe https://la-libreta-del-peon-1.onrender.com/api/v1/health
curl.exe -i https://la-libreta-del-peon-1.onrender.com/api/v1/projects/00000000-0000-0000-0000-000000000000/rounds
```
