<!-- doc-status
estado: vivo
rol: roadmap
verificado: 2026-08-02
-->

# ROADMAP.md — TopoField

**Este archivo es la única fuente de verdad sobre en qué fase está el proyecto y qué viene después.**

Si otro documento contradice a este en materia de fases, prioridades o siguiente paso, manda este. Los demás documentos vivos cubren otras preguntas: `MEMORIA.md` el porqué de cada decisión y la bitácora, `PRODUCT_STRATEGY.md` para quién y con qué límites, `UX_RESEARCH_PLAN.md` cómo se valida, `LAUNCH_PLAN.md` y `PILOT_READINESS_CHECKLIST.md` cómo se pilota.

## Por qué existe este archivo (2026-08-02)

Hasta hoy había **dos numeraciones de fases distintas y simultáneas**: `PLAN.md` (fases 1-8, eje producto/UX) y `MEMORIA.md` §8 (fases 0-7, eje datos/backend). No eran la misma cosa con dos nombres, pero se citaban indistintamente, así que "Fase 3" significaba dos trabajos diferentes según quién lo dijera. Esa ambigüedad es la causa concreta de repetir conversaciones ya cerradas.

Se resuelve con un solo eje, numerado `F0`–`F9`, y una tabla de equivalencias con los nombres antiguos para que la bitácora histórica siga siendo legible sin reescribirla. `PLAN.md` queda archivado en `docs/archive/`.

## Estado por fase

| Fase | Objetivo | Estado | Nombre antiguo |
|---|---|---|---|
| **F0** | Reconciliación: una sola verdad de esquema antes de programar | ✅ Cerrada (26-07-2026) | MEMORIA Fase 0 |
| **F1** | Contrato de dominio de auscultación | ✅ Cerrada con corrección (29-07-2026) — ADR 001 quedó supersedido: las tablas `obras/*` estaban en otro proyecto Supabase, no en el que usa el backend | MEMORIA Fase 1 |
| **F2** | Base offline fiable (outbox SQLite, sync, idempotencia) | ✅ Cerrada y validada en Galaxy real (29-07-2026) | MEMORIA Fase 2 |
| **F3** | MVP de auscultación: rondas, puntos de control, lecturas, umbrales, histórico, foto adjunta | ✅ Cerrada y validada en Galaxy real (31-07-2026) | MEMORIA Fase 3 / PLAN Fase 5 punto 7 |
| **F4** | Seguridad multi-tenant y preparación de release | ⚠️ **Cerrada en código pero NO desplegada** (ver "Deuda de despliegue" abajo): auditoría por endpoint, 3 correcciones aplicadas, RLS activo en las 24 tablas, keystore y AAB firmado. D1 y D2 ya decididas. | MEMORIA Fase 5 |
| **F5** | **Validación de uso real en campo** | 🔵 **ABIERTA — es el siguiente bloque** | PLAN Fase 4 (nunca ejecutada) |
| **F6** | Entregable Excel/CSV: exportar histórico en el formato que consume el flujo real | ⚪ Pendiente | parte de MEMORIA Fase 4 |
| **F7** | Instrumentos nuevos (piezómetro, inclinómetro) reemplazando el blob genérico de lectura | ⚪ Pendiente, condicionada a demanda real | MEMORIA Fase 6 |
| **F8** | Piloto con una segunda persona del equipo | ⚪ Pendiente, depende de F5 | PLAN Fase 6 / MEMORIA Fase 5 paso 2 |
| **F9** | Integraciones con plataformas de cálculo | 🅿️ Aparcada, sin retorno claro hoy | MEMORIA Fase 7 |

Nota sobre las fases 1-4 de `PLAN.md` (enfoque de producto, diseño funcional, UX aplicada): su contenido no se pierde, vive en `PRODUCT_STRATEGY.md` y `UX_RESEARCH_PLAN.md`, que siguen vigentes y no dependen de la numeración.

## ⚠️ Deuda de despliegue (verificado 02-08-2026) — bloquea F5

**Todo el trabajo de seguridad de F4 y las correcciones de hoy están en la rama `codex/phase-5-multitenant-security`, no en `main`, y no en producción.**

Evidencia, no suposición:

- `main` local está **20 commits por detrás** de la rama de trabajo (`git log main..codex/phase-5-multitenant-security`). El merge sería fast-forward limpio, sin conflictos.
- Render expone el commit desplegado en `/api/v1/health`. Devuelve `41e3cc3`, que corresponde a `fix(mobile): resolver bloqueos de piloto offline` del **31-07-2026 12:00**. Ese hash ya no existe en el repo local porque el historial se reescribió, pero se localizó en el backup mirror pre-purga.
- Conclusión: **producción corre el estado del 31 de julio.** No incluye las 3 correcciones de aislamiento entre obras de F4 (incidencias y flujos de foto), ni D1 (quitar auscultación al token público), ni sus tests de regresión.

**Por qué importa.** Las correcciones de F4 son de aislamiento multi-tenant: son precisamente las que impiden que una obra vea datos de otra. Están escritas, probadas y commiteadas, pero un usuario real hoy sigue hablando con un backend que no las tiene. Esto no es cosmético: si F5 se hace en campo contra producción, se estaría validando una versión que ya sabemos que tiene fallos corregidos.

**El bloqueo real es tuyo, no técnico.** Publicar exige `git push --force` a `origin`, porque el historial local fue reescrito el 31-07 para purgar nombres reales de obra y todos los hashes cambiaron. Un push normal sería rechazado. `push --force` sobre `origin/main` es destructivo para cualquiera que tenga un clon, así que **requiere autorización explícita de Erick en el momento**, tras avisar a posibles colaboradores. Nunca se ha dado esa autorización.

Secuencia pendiente, en orden:

1. Fusionar la rama a `main` en local (fast-forward, reversible, no publica nada).
2. Erick autoriza el `push --force` tras confirmar que nadie más tiene un clon del repo.
3. Render redespliega solo al detectar el nuevo `main`; verificar con `/api/v1/health` que el commit cambió.
4. Recién entonces tiene sentido hacer F5 en campo.

## F5 — Validación de uso real en campo (fase actual)

**Por qué esta y no otra.** Todo el trabajo de las últimas semanas fue técnico: motor offline, seguridad entre obras, RLS, firma de release. Correcto, pero nadie salvo Erick ha tocado la app, y ni siquiera Erick la ha usado una jornada completa con datos reales. Abrir F6 (Excel) o F7 (instrumentos) ahora significa construir superficie nueva sobre un MVP cuyas fricciones reales nadie ha medido, y descubrirlas más tarde con más código que rehacer. F5 no requiere escribir código, así que es la fase más barata del roadmap y la que más criterio desbloquea.

**Trabajo.** Ejecutar el Paso 1 de `PILOT_READINESS_CHECKLIST.md` (Erick, una obra real, un dispositivo, una jornada) registrando lo que pasa con la plantilla de investigación de `UX_RESEARCH_PLAN.md`: tiempo por tarea, errores, bloqueos, dudas repetidas, pasos sobrantes, elementos que se ignoran. No basta con marcar "funciona / no funciona".

**Criterio de salida.** Existe `docs/field/F5_HALLAZGOS_<fecha>.md` con:

- los seis escenarios mínimos cubiertos (entrar a obra, localizar estación, revisar memoria visual, añadir foto o nota, registrar una lectura de ronda, consultar histórico);
- una lista priorizada de fricciones, separando fallo real de fricción UX de deseo fuera de fase;
- una decisión explícita por cada fricción: se corrige antes de F8, se corrige después, o se acepta.

**Qué NO hacer durante F5.** No abrir F6 ni F7 en paralelo. No añadir features "ya que estamos". Si aparece un bug bloqueante, se corrige y se anota; cualquier otra cosa va a la lista de fricciones.

## Decisiones tomadas el 02-08-2026 (criterio de ingeniería, pendientes de aplicar)

Tres decisiones que estaban abiertas y bloqueaban el avance. Se resuelven aquí con su razonamiento; ninguna se ha aplicado todavía porque dos tocan código o configuración de producción.

### D1 — El rol `visitante` no accede a datos de auscultación

**Decisión: restringir todas las rutas de rondas, puntos de control, lecturas, umbrales e histórico a `admin` y `topografo`. Aplicada el 02-08-2026.**

Razonamiento. `visitante` no es un usuario identificado: es un token público compartido (`GUEST_PUBLIC_TOKEN`) con alcance global, sin membresía de obra. Los datos de auscultación no son contenido divulgativo como la guía Leica; son mediciones de comportamiento estructural. Una lectura fuera de umbral puede implicar riesgo estructural, responsabilidad frente a un cliente, o información comercial de un tercero. Exponerlos tras un secreto compartido y sin trazabilidad de quién consultó es una asimetría mala: riesgo alto, beneficio nulo, porque nadie ha pedido esa consulta pública. Además, la nota original del MVP ya excluía a `visitante` de auscultación — el acceso actual es deriva acumulada, no una decisión que alguien tomara.

Contraargumento razonable, para no venderlo como obvio: si en algún momento se quiere enseñar la app a un cliente potencial sin darle cuenta, `visitante` es el atajo cómodo. Respuesta: para eso conviene una cuenta demo real con obra propia y datos de muestra, no un token global — y esa cuenta es trabajo de F8, no de ahora.

**Aplicación (02-08-2026):** el token `GUEST_PUBLIC_TOKEN` no ha circulado nunca fuera de esta máquina (confirmado por Erick), así que no hizo falta rotarlo. Se comprobó antes de tocar código que el móvil no depende de ese token para auscultación: `canRetryPublicReadAsGuest` en `apps/mobile/lib/api.ts` tiene una lista explícita de rutas que sí pueden reintentarse como invitado (`/projects`, `/stations`, `/guide-entries`, `/prisms/coverage/*`) y ninguna ruta de rondas, puntos de control, lecturas o umbrales está en esa lista. Se quitó `'visitante'` de `requireRole([...])` en 5 rutas: `apps/backend/src/routes/monitoring.routes.ts` (detalle de ronda, histórico de lecturas, umbrales) y `apps/backend/src/routes/projects.routes.ts` (listar rondas y puntos de control de una obra).

**Regresión cubierta (mismo día):** `requireRole` no tenía ninguna prueba propia — las de `access-control.ts` cubren el scope por obra, no la puerta por rol y ruta. Se añadieron dos capas: `middleware/auth.test.ts` prueba `requireRole` en aislamiento (401 sin usuario, 403 fuera de lista, paso libre dentro de lista), y `routes/route-role-audit.test.ts` audita los routers reales — camina `router.stack`, localiza el middleware `requireRole` de cada ruta de auscultación por su propiedad `allowedRoles` (se añadió esa propiedad a `requireRole` solo para poder auditarlo así, sin depender de un framework de integración nuevo) y falla si `'visitante'` reaparece en alguna. Se probó la prueba misma: se reintrodujo `'visitante'` a mano en una copia aislada y `route-role-audit.test.ts` lo detectó (`not ok ... visitante excluido`) antes de revertirlo. 49/49 tests backend en verde, `tsc` limpio.

### D2 — Activar la protección contra contraseñas filtradas en Supabase Auth

> ⚠️ **Corrección (02-08-2026): no es gratis.** Se intentó activar en el panel y el interruptor no persiste: la función está marcada "Only available on Pro plan and above" y el proyecto está en el plan **Free**. La decisión de abajo asumía coste cero; no es así. Queda repensada más abajo.

Razonamiento original (sigue siendo válido en cuanto a por qué interesa, no en cuanto al coste): es el único aviso de seguridad que quedaba abierto en el advisor. Rechaza, al registrar o cambiar contraseña, las contraseñas que aparecen en brechas conocidas. Con 11 usuarios existentes y un piloto por delante, cuanto antes se active, menos gente real tendrá que cambiar de contraseña después.

**Dato nuevo relevante (02-08-2026):** el mismo día se encontró que el proyecto Free se había pausado solo por inactividad (ver bitácora), tumbando la app hasta que se reactivó a mano. El plan Pro (25 USD/mes) **también elimina esa pausa automática** — no es solo el candado de contraseñas, es dos problemas reales resueltos por el mismo cambio de plan.

**Decisión de Erick (02-08-2026): no gastar por ahora.** Se queda en Free — la alternativa conservadora de abajo. Válido mientras el piloto sea solo Erick; se reabre si F5 muestra que el proyecto se pausa con más frecuencia de la tolerable, o al incorporar una segunda persona (F8).

- **Mejor opción:** subir a Pro. 25 USD/mes cubre tanto D2 como el riesgo de que el proyecto se vuelva a pausar solo antes de una sesión de campo — ese segundo problema es operativo, no cosmético, y ya costó una interrupción real hoy.
- **Alternativa conservadora:** quedarse en Free por ahora. D2 queda sin activar (no es catastrófico: es una capa extra, no la única defensa) y el riesgo de pausa se gestiona a mano, comprobando el estado del proyecto antes de cada sesión de campo (ya añadido a `PILOT_READINESS_CHECKLIST.md`).
- **Riesgo principal de esperar:** otra pausa automática justo antes o durante una sesión de campo real, con alguien más que Erick usando la app — ahí sí cuesta credibilidad, no solo una interrupción resoluble en dos minutos.
- **Información que cambiaría la decisión:** si F5 confirma que la app se usa con la frecuencia suficiente para que Supabase nunca la pause sola, el argumento operativo de subir a Pro desaparece y solo queda el candado de contraseñas, que es prescindible mientras el piloto siga siendo Erick solo.

No es configuración que un agente pueda aplicar: implica gasto recurrente, así que la decisión y el pago son de Erick.

### D3 — Orden entre Excel (F6) e instrumentos nuevos (F7)

**Decisión: F6 antes que F7, y dentro de F6, exportar antes que importar.**

Razonamiento. El motivo original del proyecto es sustituir un Excel. Pero "sustituir el Excel" tiene dos mitades muy distintas y se estaban tratando como una: **exportar** (producir el entregable que el jefe o el cliente espera recibir) e **importar** (traerse el histórico antiguo). Exportar es lo que cierra el bucle: si TopoField no puede generar el documento que el flujo real consume, la app queda como cuaderno paralelo por bueno que sea el motor offline, y el usuario acaba volviendo al Excel para el último paso. Importar el histórico, en cambio, es más caro, arrastra los errores del Excel viejo, y no aporta nada hasta que el flujo de captura esté validado — importar datos a un flujo no validado es importar problemas.

F7 (piezómetro, inclinómetro) va después porque hoy no hay una campaña real que los exija. Añadir un tipo de instrumento sin un caso que lo pida es entusiasmo técnico, no producto. Se reabre en cuanto exista una campaña concreta que lo necesite; entonces el trabajo estará mejor definido.

Contraargumento razonable: el blob genérico de `instrument_readings` es deuda técnica conocida y cuanto más tiempo pase, más datos habrá que migrar cuando se estructure. Es cierto, y es el mejor argumento para adelantar F7. Se acepta el riesgo: el volumen de lecturas hoy es mínimo, y migrar cien filas es barato comparado con diseñar un esquema para instrumentos que todavía no se sabe cómo se usarán en campo.

## Pendientes que no son fases

Se mantienen en `MEMORIA.md` §12a, que es su sitio. Resumen de los que solo puede resolver Erick:

- Aplicar D1 (delegable a un agente) y D2 (no delegable, es configuración de Supabase).
- Autorizar, en el momento y por separado, cualquier `push --force` de la reescritura de historial, tras avisar a quien tenga un clon.
- Capa (3) de `MEMORIA.md` §5, datos de terceros: sigue abierta, sin urgencia; no se reabre salvo que Erick la traiga.

## Cómo se mantiene este archivo

Al cerrar una fase: cambiar su estado en la tabla, actualizar `verificado:` en la cabecera, y añadir una línea a la bitácora de `MEMORIA.md` §12. No crear un documento nuevo de fase — los informes puntuales van a `docs/archive/` una vez leídos.

El chequeo automático (`npm run docs:check`) verifica que no exista un segundo archivo declarando `rol: roadmap`, que la fecha de `verificado:` no se quede rancia y que los enlaces entre documentos no apunten a archivos movidos. Ver `docs/DOC_MAINTENANCE.md`.
