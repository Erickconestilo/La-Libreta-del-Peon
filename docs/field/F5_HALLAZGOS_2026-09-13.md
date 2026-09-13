<!-- doc-status
estado: vivo
verificado: 2026-09-13
rol: field-evidence
-->

# F5: Hallazgos del Galaxy

## Alcance

Esta nota registra la evidencia fisica disponible de la release local v6. No
declara F5 cerrada: aun faltan una jornada observada, entrevistas, validacion
de exportacion con oficina y un cierre definitivo con umbral autorizado.

## Entorno

- Dispositivo: Samsung Galaxy `SM-S938B`, serial ADB `R5CY21X6FLE`.
- Paquete: `com.ciudadanoinusual.topofield`.
- Release instalada: `versionCode=6`, `versionName=1.0.0`.
- Firma: `CN=TopoField Android Release`.
- Red: LTE restaurada despues de la prueba; Wi-Fi apagado durante el corte.
- Ronda: `E2E-Galaxy-20260731-Atc`.
- Punto: `E2E-CP-20260731`.

## Recorrido ejecutado

1. Se abrio la obra `Campus Nord`, se consulto la ronda y se preparo la
   jornada sin conexion.
2. Se activo el modo avion desde la interfaz visible de ajustes rapidos y se
   mantuvo Wi-Fi apagado. No se uso `settings put global airplane_mode_on`.
3. Se registro el valor `825` con unidad `mm` y se acepto una fotografia.
4. La UI mostro literalmente:

   ```text
   2 cambios pendientes de sincronizar
   Lectura guardada sin conexión
   La foto también queda pendiente de sincronizar
   ```

5. Logcat del encolado:

   ```text
   09-13 06:38:39.477 21145 21169 I ReactNativeJS: [useCreateInstrumentReading] Enqueued reading 19eeb99b-8409-40fc-9c3d-c03cfc3d92b7 and photo attachment 84bbc7dd-5108-41ae-8f07-5f91ae30a5db for later sync
   ```

6. Se cerro la app, se forzo su detencion y se reabrio sin red. El motor
   registro literalmente:

   ```text
   [SyncEngine] Initializing...
   [SyncEngine] No connectivity, skipping flush
   ```

7. Se restauro LTE desde los ajustes visibles. Logcat registro:

   ```text
   [SyncEngine] Connectivity restored, flushing outbox...
   [SyncEngine] Flushing 2 pending items...
   [SyncEngine] Item b99020b1-6260-4f58-a72e-f7fd83bf4bd5 synced successfully
   [SyncEngine] Item 104bdcb5-2daa-440f-8af0-e2d1573ce20b synced successfully
   [SyncEngine] Flush complete: 2/2 synced
   [SyncEngine] No pending items
   ```

## Verificacion remota de solo lectura

La consulta realizada despues de la sincronizacion devolvio exactamente una
lectura para el `client_request_id` y un adjunto asociado:

```json
{"reading":[{"id":"a29d6302-b0f7-4fde-830c-d76b6b4a5729","client_request_id":"19eeb99b-8409-40fc-9c3d-c03cfc3d92b7","value_numeric":825,"unit":"mm","reading_status":"draft","attachment_count":1}]}
{"attachments":[{"id":"59bb29e7-db22-405f-8dbe-e0d1ea9569d0","reading_id":"a29d6302-b0f7-4fde-830c-d76b6b4a5729","storage_path":"readings/a29d6302-b0f7-4fde-830c-d76b6b4a5729/84bbc7dd-5108-41ae-8f07-5f91ae30a5db.jpg","attachment_type":"photo","uploaded_by":"b174f7e3-09af-4e66-860e-2f6e950c97d0"}],"attachmentCount":1}
```

El estado `draft` es correcto en esta prueba: `control_point_thresholds` no
tenia umbral vigente. El punto siguio `pending` y el cierre permanecio
bloqueado; no se marco como completado de forma artificial.

## Parte parcial y exportacion

Desde la misma ronda se creo un parte parcial con zona `Zona-piloto-E2E`. La
UI mostro literalmente:

```text
Parte recibido por el servidor. El supervisor podrá consultarlo.
```

La consulta de solo lectura devolvio una unica fila:

```json
[{"id":"62135c22-003f-4e62-88a6-7d5a4a02a1db","round_id":"db3a59e3-3756-4d95-9890-f026379f33db","zone_label":"Zona-piloto-E2E","status":"partial","completed_point_count":0,"pending_point_count":1,"client_request_id":"b13aacdb-fd6b-4c67-b72d-e8e29cbc8a84"}]
```

Al probar `Compartir CSV` y `Compartir Excel` en el resumen de la ronda, la
app no abrio la hoja de compartir y mostro en ambos casos:

```text
No se pudo completar la operación. Reintenta en unos segundos.
```

No se obtuvo un codigo HTTP visible en la UI ni en el logcat filtrado. Por eso
el resultado se clasifica como exportacion no validada, no como un bug de
formato demostrado. La observacion publica de Render sigue en `eb88db9`,
anterior a los cambios locales de exportacion; hay que repetir la prueba tras
un despliegue autorizado y comparar CSV/XLSX estructuralmente.

## Arranque en frio sin red

Antes de cortar la red se cargo la lista de rondas en linea para poblar el
cache por proyecto. Despues de cerrar y reabrir la app en modo avion, la
navegacion `Obras -> Campus Nord -> Rondas de auscultacion` mostro literalmente:

```text
Rondas sin actualizar. Última copia: 2026-09-13T05:00:36.436Z.
E2E-Galaxy-20260731-Atc
```

Este caso habia fallado en la v5 porque el viaje personal no sembraba la lista
por proyecto. La v6 incluye esa correccion en
`apps/mobile/lib/offline/monitoring-cache.ts` y
`apps/mobile/hooks/use-monitoring.ts`.

## Fricciones y decisiones

| Hallazgo | Clasificacion | Decision |
|---|---|---|
| La lista de rondas no estaba disponible tras arranque frio offline en v5. | Fallo reproducible | Corregido en v6 con regresion de cache por proyecto y sesion. |
| Una lectura sin umbral queda en `draft` y no cambia el punto a `taken`. | Regla de negocio | Aceptado; requiere umbral autorizado para probar cierre positivo. |
| El cierre con un punto pendiente permanece bloqueado. | Comportamiento esperado | Aceptado y documentado. |
| El Galaxy exige revisar el boton de guardado tras volver de camara por el scroll. | Friccion UX observada | Pendiente de priorizacion en la jornada observada; no se corrige sin repetir el escenario. |

## Evidencia visual no versionada

- `topofield-v6-airplane-hard-offline.png`
- `topofield-v6-rounds-online-cache-seed.png`
- `topofield-v5-hard-offline-save-result.png`
- `topofield-v5-hard-offline-queued.png`
- `topofield-v5-offline-reopen-final.png`

## Pendientes de campo

- Repetir el recorrido con una ronda y umbrales autorizados para probar un
  cierre definitivo real.
- Descargar CSV y XLSX autenticados y comparar sus filas normalizadas.
- Ejecutar una jornada observada y registrar tiempos, errores y dudas sin
  completar datos por memoria.
- Realizar cinco a ocho conversaciones con profesionales del perfil objetivo.
- Desplegar a Render solo con autorizacion remota expresa y repetir la
  validacion contra el hash publico desplegado.
