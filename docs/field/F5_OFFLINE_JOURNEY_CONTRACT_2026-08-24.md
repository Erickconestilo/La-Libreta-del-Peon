<!-- doc-status
estado: vivo
verificado: 2026-08-24
-->

# F5 — Contrato de jornada offline

## Alcance

La preparación administrativa de una ronda sigue requiriendo conexión. Una
vez preparada, el móvil conserva en SQLite la ronda, sus puntos, el histórico
comparable y los umbrales consultados.

Durante la jornada sin cobertura se permiten lecturas, notas y fotos. Las
lecturas y adjuntos pasan por el outbox existente y mantienen
`clientRequestId` para que un reinicio o un reintento no duplique datos.

## Estados visibles

- `Pendiente`: elemento local todavía no enviado.
- `Guardado localmente`: lectura o foto conservada en el dispositivo.
- `Sincronizando`: el motor está enviando el elemento.
- `Sincronizado`: el servidor confirmó el elemento.
- `Error`: el envío necesita reintento o revisión desde Perfil.

La pantalla de detalle muestra la fecha de la última copia preparada cuando
la ronda se abre sin red. La copia no se presenta como dato actualizado.

## Ciclo de ronda

- `draft -> active`: el operador inicia la jornada.
- `active -> closed`: el backend exige que no haya puntos `pending`; el móvil
  además exige que no existan elementos locales pendientes, en sincronización,
  con error o en conflicto para esa ronda.
- `draft|active -> cancelled`: cancelación operativa.
- `closed` y `cancelled` son terminales.

La API de cambio de estado es `PATCH /api/v1/rounds/:roundId`, protegida para
`admin` y `topografo` y siempre filtrada por el scope real de la obra.

## Límites deliberados

Crear obras, rondas y puntos sigue siendo online. No se intenta convertir toda
la aplicación en offline en esta fase; se cubre el recorrido de medición que
aporta valor en campo.
