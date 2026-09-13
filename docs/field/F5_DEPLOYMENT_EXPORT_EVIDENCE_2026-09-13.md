<!-- doc-status
estado: vivo
verificado: 2026-09-13
-->

# F5: Evidencia de despliegue y exportación autenticada

## Alcance

Este informe registra solo verificaciones reproducibles del 13-09-2026. No sustituye
la observación de una jornada ni las entrevistas profesionales exigidas para cerrar
F5. No contiene credenciales, tokens ni contenido de exportaciones.

## Render

- Servicio: `La-Libreta-del-Peon-1`.
- Deploy: `dep-daj3kenqj5pc73at1n50`.
- Commit live: `df224f9b7226c8aa5899a5e889898663b4642016`.
- `GET /api/v1/health`: `HTTP/1.1 200 OK`, cuerpo
  `{"commit":"df224f9b7226c8aa5899a5e889898663b4642016","status":"ok"}`.
- `GET /api/v1/projects/00000000-0000-0000-0000-000000000000/rounds`
  sin token: `HTTP/1.1 401 Unauthorized`.
- `GET /api/v1/me/journey` sin token: `HTTP/1.1 401 Unauthorized`.
- Logs recientes de arranque con nivel `error`: consulta vacía.

## Galaxy

- ADB: `R5CY21X6FLE device product:pa3qxeea model:SM_S938B`.
- Paquete: `com.ciudadanoinusual.topofield`.
- Versión instalada: `versionCode=7`, `versionName=1.0.0`,
  `lastUpdateTime=2026-09-13 07:39:25`.
- `Compartir CSV`: archivo generado
  `topofield-ronda-db3a59e3-3756-4d95-9890-f026379f33db-1789278874558.csv`;
  Android mostró `1 elemento` y el selector nativo con WhatsApp, Drive,
  Outlook, Quick Share, Telegram, ChatGPT y otros destinos.
- `Compartir Excel`: archivo generado
  `topofield-ronda-db3a59e3-3756-4d95-9890-f026379f33db-1789278900825.xlsx`;
  Android mostró `1 elemento` y el selector nativo con destinos disponibles.

## Logs de exportación

- `75f841da-81dd-49f0-820b-895397b2015b GET /api/v1/rounds/db3a59e3-3756-4d95-9890-f026379f33db/export?format=csv 200`.
- `247d163c-d381-4ded-af68-dc27627418b9 GET /api/v1/rounds/db3a59e3-3756-4d95-9890-f026379f33db/export?format=xlsx 200`.

## Pendiente explícito

- Comparar el contenido CSV/XLSX con herramientas estructuradas.
- Repetir cierre con umbral autorizado y validar que no se cierra con puntos pendientes.
- Completar jornada observada y cinco a ocho conversaciones profesionales.
