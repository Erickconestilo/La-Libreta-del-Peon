# Checklist de Piloto

## Paso 1 - Erick usando datos reales en campo

- [ ] Confirmar que la cuenta tecnica de Erick entra y conserva sesion ante un fallo transitorio de red.
- [ ] Usar el AAB firmado localmente y guardar al menos dos copias externas del keystore y sus credenciales antes de distribuirlo.
- [ ] Verificar login, una estacion, una foto, una lectura offline y su sincronizacion en el dispositivo objetivo con datos reales de una sola obra.
- [ ] Confirmar que Render publica el commit que se pretende probar y que las rutas de rondas responden autenticadas.
- [ ] Mantener el backup de Git y no publicar la reescritura de historial sin la autorizacion separada de `push --force`.
- [ ] Revisar los elementos de outbox en error antes de cerrar una jornada y conservar capturas o identificadores de incidencia si falla una sincronizacion.

## Paso 2 - Sumar a otra persona del equipo

- [ ] Ejecutar aceptacion API real con dos cuentas `topografo`, dos obras y membresias opuestas: lectura, alta, edicion, foto, mensaje, ronda y lectura cruzadas deben devolver `403` o `404`, nunca datos ajenos.
- [ ] Configurar y revisar el canal de feedback, la guia de instalacion y las credenciales/roles de cada persona piloto.
- [ ] Decidir expresamente si el rol `visitante` puede consultar auscultacion; ahora tiene alcance global en las rutas `GET` que lo admiten.
- [ ] Activar en Supabase la proteccion contra contrasenas filtradas si Erick lo aprueba; es una configuracion de Auth y no se cambia desde el codigo sin autorizacion explicita.
- [ ] Obtener el permiso escrito aplicable del empleador antes de reutilizar procesos, catalogos o datos operativos reales con terceros. Esta es una accion de Erick, no delegable.
- [ ] Avisar a cualquier colaborador con un clon antes de pedir el `push --force` que publicaria el historial saneado.
- [ ] Establecer quien revoca cuentas, reasigna membresias y responde ante perdida de un dispositivo.
