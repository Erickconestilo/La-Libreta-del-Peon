<!-- doc-status
estado: vivo
verificado: 2026-08-02
-->

# Checklist de Piloto

El Paso 1 es la fase **F5** de `ROADMAP.md`, la única abierta ahora mismo. No se trata solo de comprobar que todo funciona: hay que registrar cómo se usa. Los hallazgos van a `docs/field/F5_HALLAZGOS_<fecha>.md` siguiendo la plantilla de `UX_RESEARCH_PLAN.md`.

## Paso 1 - Erick usando datos reales en campo

Comprobaciones técnicas:

- [ ] Confirmar que la cuenta tecnica de Erick entra y conserva sesion ante un fallo transitorio de red.
- [ ] Usar el AAB firmado localmente y guardar al menos dos copias externas del keystore y sus credenciales antes de distribuirlo.
- [ ] Verificar login, una estacion, una foto, una lectura offline y su sincronizacion en el dispositivo objetivo con datos reales de una sola obra.
- [ ] Confirmar que Render publica el commit que se pretende probar y que las rutas de rondas responden autenticadas.
- [ ] Mantener el backup de Git y no publicar la reescritura de historial sin la autorizacion separada de `push --force`.
- [ ] Revisar los elementos de outbox en error antes de cerrar una jornada y conservar capturas o identificadores de incidencia si falla una sincronizacion.

Observación de uso (esto es lo que cierra F5, no lo anterior):

- [ ] Cronometrar seis escenarios reales: entrar a una obra, localizar una estacion, revisar memoria visual, anadir foto o nota, registrar una lectura de ronda, consultar historico.
- [ ] Anotar cada duda, bloqueo, paso sobrante y elemento que se ignora, en el momento y no de memoria al final de la jornada.
- [ ] Clasificar cada hallazgo en fallo real, friccion UX o deseo fuera de fase, y decidir por cada uno: se corrige antes del Paso 2, se corrige despues, o se acepta.
- [ ] No arreglar nada durante la jornada salvo un bloqueo total: anotar y seguir. Corregir sobre la marcha destruye la medicion.

## Paso 2 - Sumar a otra persona del equipo

- [ ] Ejecutar aceptacion API real con dos cuentas `topografo`, dos obras y membresias opuestas: lectura, alta, edicion, foto, mensaje, ronda y lectura cruzadas deben devolver `403` o `404`, nunca datos ajenos.
- [ ] Configurar y revisar el canal de feedback, la guia de instalacion y las credenciales/roles de cada persona piloto.
- [ ] **Aplicar D1** (decidido el 02-08-2026, ver `ROADMAP.md`): restringir las rutas de auscultacion a `admin` y `topografo`, quitando el acceso del token publico `visitante`. Cambio de backend, delegable a un agente; repasar que ninguna pantalla movil dependa de leer auscultacion sin sesion.
- [ ] **Aplicar D2** (decidido el 02-08-2026): activar en Supabase Auth la proteccion contra contrasenas filtradas. Configuracion de produccion, la ejecuta o autoriza Erick en el momento.
- [ ] Avisar a cualquier colaborador con un clon antes de pedir el `push --force` que publicaria el historial saneado.
- [ ] Establecer quien revoca cuentas, reasigna membresias y responde ante perdida de un dispositivo.
