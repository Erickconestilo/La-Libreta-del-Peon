<!-- doc-status
estado: vivo
rol: field-template
verificado: 2026-09-12
-->

# F5: Plantilla De Observación De Campo

Esta plantilla se rellena durante una jornada real y entrevistas breves. No
debe completarse con recuerdos, datos inventados ni conclusiones de una demo.
Usa datos autorizados y no escribas nombres de clientes, códigos sensibles ni
credenciales en este archivo.

## Identificación De La Jornada

| Campo | Registro |
|---|---|
| Fecha y hora | |
| Observador | |
| Rol de la persona | |
| Dispositivo y versión | |
| Obra autorizada | |
| Ronda o zona | |
| Cobertura y condiciones | |
| Backend/commit comprobado | |
| ¿Se trabajó offline? | |

## Escenarios Críticos

Cronometra desde la primera acción hasta que la persona confirma que la tarea
está terminada. Anota las palabras exactas que diga cuando se bloquee o dude.

| ID | Tarea | Inicio | Fin | Errores | Ayuda | Resultado literal |
|---|---|---:|---:|---:|---:|---|
| S1 | Entrar en la obra correcta | | | | | |
| S2 | Localizar una estación o referencia | | | | | |
| S3 | Revisar memoria visual | | | | | |
| S4 | Añadir foto o nota | | | | | |
| S5 | Registrar una lectura | | | | | |
| S6 | Consultar histórico y estado | | | | | |

## Jornada Offline

Registra cada transición por separado. `Guardado localmente` no significa
`recibido por servidor`.

| Elemento | Hora local | Estado visto en móvil | Hora de servidor | Resultado de deduplicación | Evidencia |
|---|---|---|---|---|---|
| Lectura | | | | | |
| Foto/adjunto | | | | | |
| Parte parcial | | | | | |
| Reintento tras reinicio | | | | | |

Checklist de integridad:

- [ ] La lectura permanece tras cerrar y reabrir la app sin red.
- [ ] La foto queda asociada al registro correcto.
- [ ] El outbox no muestra elementos en `error` al terminar.
- [ ] El servidor confirma una sola fila por `clientRequestId`.
- [ ] Lo no sincronizado no aparece como recibido por otro usuario.
- [ ] El cierre sigue bloqueado mientras quedan puntos pendientes.

## Hallazgos

Duplica este bloque por cada problema observado. Un hallazgo debe describir
conducta observable, no una opinión general.

| Campo | Registro |
|---|---|
| ID | |
| Escenario | |
| Qué intentó hacer | |
| Qué ocurrió literalmente | |
| Impacto en el trabajo | |
| Frecuencia en esta jornada | |
| Ayuda o alternativa usada | |
| Clasificación | fallo / fricción UX / necesidad real / fuera de fase |
| Severidad | P0 / P1 / P2 / P3 |
| Decisión | corregir antes / corregir después / aceptar |
| Criterio de cierre | |

## Entrevistas Profesionales

Haz la conversación antes de enseñar la app. Registra ejemplos del último
trabajo, frecuencia y coste del problema; no preguntes si “les gusta” una
demo. Pide permiso antes de guardar cualquier dato identificable.

| ID | Perfil y experiencia | Flujo actual | Pérdida repetida | Frecuencia | Alternativa | Qué tendría que aprobar | Disposición a probar |
|---|---|---|---|---|---|---|---|
| E1 | | | | | | | |
| E2 | | | | | | | |
| E3 | | | | | | | |
| E4 | | | | | | | |
| E5 | | | | | | | |
| E6 | | | | | | | |
| E7 | | | | | | | |
| E8 | | | | | | | |

## Síntesis De La Ronda

Completar cuando existan observaciones y conversaciones reales.

- Tareas que TopoField resolvió mejor que el flujo actual:
- Problema repetido por al menos tres personas:
- Elementos que siguieron resolviendo con Excel, WhatsApp, papel o controlador:
- Top 10 de fricciones ordenadas por severidad y frecuencia:
- Cambios que deben entrar antes del siguiente piloto:
- Ideas que se aparcan:
- Decisión sobre continuar con el segmento inicial:

No cierres F5 con esta plantilla vacía. El criterio de salida sigue siendo el
de `ROADMAP.md`: seis escenarios observados, decisiones por hallazgo y al
menos cinco conversaciones profesionales.
