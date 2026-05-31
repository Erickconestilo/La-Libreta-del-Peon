# QA_ANDROID_GALAXY.md — Prueba APK TopoField

## APK actual

- Build EAS: `247704f1-2316-483f-bb9e-62adee8714cd`
- APK: https://expo.dev/artifacts/eas/5vayQrWGeBVzi8V8SdCfit.apk
- APK local instalado por ADB: `C:\Users\guill\Downloads\topofield-247704f1-team-messages.apk`
- Backend usado: `https://la-libreta-del-peon-1.onrender.com/api/v1`
- Perfil EAS: `preview`
- Commit incluido en APK: `32b825d4d8a954dcfb28cc07302f493bc4c44804`
- Commit backend desplegado en Render: `3e721a14a713fb2dc609c519305df3cfaeff757e`
- Instalación ADB en Galaxy: `Success`
- Nota: esta APK incluye guía con búsqueda/agrupación, mensajes internos, propuestas provisionales, croquis con zona táctil mayor y campo de token corregido.

## APK anterior

- Build EAS anterior: `cc43f0f1-ff3e-43da-b574-ec09dedfa4e4`
- APK anterior: https://expo.dev/artifacts/eas/rdY4AEzq4WTnj9rCXAD4mG.apk
- APK local anterior: `C:\Users\guill\Downloads\topofield-cc43f0f1-guides-icon-prisms.apk`
- Commit incluido en APK anterior: `805fb6197a98ecdb358ff5839d6fbecbfe85b31d`

## Estado backend Render

- `GET /health`: 200 con `commit: 3e721a14a713fb2dc609c519305df3cfaeff757e`
- `GET /stations`: 200
- `GET /projects` sin token: 401
- `GET /guide-entries` sin token: 401
- `GET /prisms/coverage/CN1` sin token: 401
- `GET /projects` con `GUEST_PUBLIC_TOKEN`: 200
- `GET /guide-entries` con `GUEST_PUBLIC_TOKEN`: 200
- `GET /prisms/coverage/CN1` con `GUEST_PUBLIC_TOKEN`: 200
- `PATCH /prisms/:prismId/photo` sin token: 401, no 404
- `POST /uploads/photos/sign` sin token: 401, no 404
- Interpretacion: Render ya sirve backend nuevo. Si la foto de prisma falla en Galaxy, ya no es por ruta inexistente; revisar token/rol, firma de subida o payload.

### Estado actual tras nuevos commits

- GitHub `main`: contiene commits posteriores a `3e721a1`
- Render `GET /health`: todavía `3e721a14a713fb2dc609c519305df3cfaeff757e`
- Pendiente: redeploy Render para publicar mensajes de estación, incidencias/propuestas provisionales, hardening de incidencias y lockfile de backend.

### Nota tras hardening backend `10c91b8`

- Después del redeploy de `10c91b8` o posterior, las rutas `GET /stations`, `GET /projects`, `GET /guide-entries` y `GET /prisms/coverage/CN1` deben probarse con `Authorization: Bearer $GUEST_PUBLIC_TOKEN`.
- Sin token deben responder 401. Esto es correcto.
- El APK actual incluye token visitante público, por lo que la prueba normal desde la app no debería cambiar.

## Resultado QA real en Galaxy — 2026-05-31

- Dispositivo: `SM_S938B`, ADB id `R5CY21X6FLE`.
- APK `cc43f0f1` reinstalado por ADB y abierto correctamente.
- `Obras` carga en modo visitante.
- Obra `Sarrià` abre con 4 estacionamientos.
- Detalle `Estacionamiento Norte Sarria E02` abre correctamente.
- Croquis de prismas visible con puntos PN/PS/RS; seleccionar PN1 y PN2 cambia la ficha.
- El modo visitante bloquea correctamente fotos de estación, memoria visual y foto de prisma.
- `Guía` muestra manuales y abre `Guía Leica de estación` con páginas offline.
- `Mapa` funciona en fallback sin Google Maps API key, con filtros por obra y coordenadas.
- `Perfil` vuelve a modo visitante y queda sin token visible tras reinicio.
- `logcat` filtrado por PID de TopoField: sin `FATAL EXCEPTION`, sin `AndroidRuntime`, sin `ReactNativeJS`.

## Resultado QA APK `247704f1` en Galaxy — 2026-05-31

- Dispositivo: `SM_S938B`, ADB id `R5CY21X6FLE`.
- APK `247704f1` instalado por ADB con resultado `Success`.
- La app abre y el proceso queda activo sin cierre.
- `Guía` muestra `GUÍA DE CAMPO`, campo `Buscar`, agrupación `ESTACIÓN TOTAL` y `NIVEL DIGITAL`, tarjetas `Guía Leica de estación` y `Nivel Leica LS10`, y acción `ABRIR MANUAL`.
- Búsqueda en guía acepta texto (`LS10`) sin crash.
- `Obras -> Campus Nord` carga la obra y sus 2 estacionamientos.
- `Campus Nord Estacionamiento CN2` abre correctamente.
- En detalle de estación aparecen las secciones `Mensajes del equipo`, `Estacionamientos provisionales` y `Croquis de prismas`.
- `logcat` filtrado por PID de TopoField: sin `FATAL EXCEPTION`, sin `AndroidRuntime`, sin `ReactNativeJS`, sin `TypeError` y sin `ReferenceError`.
- Limitación: no se probó escritura real de mensajes/provisionales/foto de prisma porque Render público sigue en `3e721a1`.

### Pendiente de QA móvil

- Nueva build Android preview tras cambios de Guías/Mapas/Conversación/croquis: intento con `npx eas-cli build -p android --profile preview --non-interactive` bloqueado por cuota mensual Android del plan Free. Expo indicó reinicio de cuota en unas 6 horas, lunes 2026-06-01.
- Probar sesión real `admin`/`topografo` pegando token manualmente o con una build nueva que incluya el campo de token corregido.
- Probar subida real de foto de prisma desde Galaxy.
- Probar `Mensajes del equipo` creando un mensaje real cuando Render esté redeployado.
- Probar `Estacionamientos provisionales` creando una propuesta real cuando Render esté redeployado.
- Confirmar primero que Render ya no sirve `3e721a1`; si sigue en ese commit, mensajes/provisionales fallarán aunque la APK sea correcta.

## Resultado QA backend Render `5c5752c` — 2026-05-31

- `GET /health`: 200 con `commit: 5c5752c9e7d6417e759165c0a45061fb8f10167d`.
- Sin token, `/projects`, `/guide-entries` y `/prisms/coverage/CN1`: 401.
- Con `GUEST_PUBLIC_TOKEN`, `/projects`, `/stations`, `/guide-entries` y `/prisms/coverage/CN1`: 200.
- DTO visitante verificado: estaciones no exponen `createdBy`, guías no exponen `createdBy`, prismas no exponen `sourceFiles`.
- `GET /stations/:stationId/messages`: admin 200, topógrafo 200, visitante 403.
- Tokens técnicos locales generados en `topofield-session-tokens.local`; el archivo queda ignorado por git.

## Instalación en Galaxy

1. Abrir la URL del APK desde el Galaxy.
2. Descargar el archivo `.apk`.
3. Permitir instalación desde navegador o gestor de archivos si Android lo pide.
4. Instalar y abrir `La Libreta del Peón`.

## Prueba mínima como visitante

- La app abre sin pantalla blanca ni cierre.
- La pestaña `Obras` carga tarjetas de obra.
- Tocar una obra abre sus estacionamientos.
- Pull to refresh funciona.
- Abrir una estación desde la lista.
- La pestaña `Mapa` muestra marcadores.
- Un marcador abre el detalle de estación.
- La pestaña `Guía` muestra contenido Leica real.
- Tocar `Guía Leica de estación` abre paginas renderizadas con texto e imagenes.
- Tocar `Nivel Leica LS10` abre paginas renderizadas con texto e imagenes.
- El perfil visitante no muestra lenguaje técnico de backend/proveedor.
- Desde una obra, `Ver mapa de esta obra` mantiene el filtro por obra.
- La pestaña `Perfil` muestra rol `visitante`.

## Prueba con token técnico

- Pegar bearer token Supabase en `Perfil`.
- Validar token.
- Confirmar rol `admin` o `topografo`.
- Si es `admin`, aparece `Gestionar guía de campo`.
- Si es `admin` o `topografo`, aparece `Ver historial de cambios`.

## Prueba de guía admin

- Abrir `Gestionar guía de campo`.
- Crear entrada temporal.
- Editar título o categoría.
- Borrar entrada temporal.
- Volver a `Guía` y confirmar que no queda basura.

## Prueba de guía visitante

- Abrir `Guía`.
- Confirmar que los manuales muestran acción clara `Abrir manual`.
- Buscar texto como `nivel`, `prisma` o `foto`.
- Confirmar que las fichas rápidas se agrupan por instrumento y no parecen botones de navegación.

## Prueba de fotos

- Abrir una estación.
- En `Foto de campo`, añadir foto desde cámara.
- Confirmar permiso de cámara.
- Confirmar que la imagen aparece.
- Cambiar foto desde galería.
- Quitar foto principal.

## Prueba de croquis de prismas

- Abrir una estación con prismas asociados.
- Ver tarjeta `Croquis de prismas`.
- Confirmar texto: `Vista operativa por ángulo y distancia desde esta estación. No es coordenada geográfica absoluta.`
- Tocar varios puntos del croquis.
- Confirmar que cambia la ficha del prisma y aparece el codigo correcto.
- Revisar distancia, angulo H, observaciones, ultima observacion y constante de prisma.
- Con rol `admin` o `topografo`, probar `Añadir foto del prisma`.
- Si la subida falla, anotar codigo HTTP y mensaje exacto. Render ya no deberia responder 404 en esta ruta.

## Prueba de obras

- Abrir `Obras`.
- Ver tarjetas con contador de estacionamientos.
- Entrar en `Campus Nord`, `Sanllehy` o `Sarrià`.
- Confirmar que solo aparecen estacionamientos de esa obra.
- Con rol `admin` o `topografo`, añadir/cambiar imagen de obra.

## Prueba de memoria visual

- Abrir una estación.
- En `Memoria visual del estacionamiento`, añadir foto.
- Elegir tipo: `Referencia`, `Acceso` u `Obstáculo`.
- Añadir título corto y nota.
- Marcar una foto como principal y confirmar que cambia la foto principal.
- Borrar una foto de memoria.

## Prueba de mensajes y provisionales

- Abrir una estación con rol `admin` o `topografo`.
- En `Mensajes del equipo`, dejar un mensaje corto.
- Confirmar que el mensaje aparece con autor y fecha.
- Volver a visitante y confirmar que los mensajes internos no se muestran.
- En `Estacionamientos provisionales`, crear una propuesta con nombre y motivo.
- Confirmar que la propuesta queda como `Abierta`.
- Confirmar que se pueden tener varias propuestas abiertas.
- Volver a visitante y confirmar que las propuestas internas no se muestran.

## Prueba de historial

- Abrir `Perfil` > `Ver historial de cambios`.
- Confirmar que aparecen cambios de guía, foto o memoria visual.
- Confirmar que visitante no ve historial.

## Señales de fallo importantes

- Pantalla blanca al abrir.
- Lista o guía no cargan contra Render.
- Mapa se queda vacío pese a tener estaciones.
- Cámara/galería no piden permisos o fallan.
- Foto sube pero no aparece después.
- Foto de prisma falla con 404 en `PATCH /prisms/:id/photo`.
- Lecturas visitantes fallan con 401 dentro de la app tras redeploy; indicaría que el APK no está enviando `GUEST_PUBLIC_TOKEN`.
- Token técnico no cambia el rol.
- Historial no refleja acciones recientes.
