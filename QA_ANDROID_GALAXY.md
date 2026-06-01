# QA_ANDROID_GALAXY.md — Prueba APK TopoField

## APK actual

- Build EAS actual: `71a232a3-2f87-4e85-a71e-75ad0681269a`
- Estado actual: `FINISHED`
- Commit incluido: `59878ef93985c4f47070649224100d0e92d8c425`
- URL build: https://expo.dev/accounts/ciudadanoinusual/projects/topofield/builds/71a232a3-2f87-4e85-a71e-75ad0681269a
- APK: https://expo.dev/artifacts/eas/f2RvG2T6oYbB47KVm1cQ4U.apk
- APK local instalado por ADB: `C:\Users\guill\Downloads\topofield-71a232a3-preview.apk`
- Instalación ADB en Galaxy: `Success`
- Arranque inicial: proceso Android activo y `logcat` básico sin `AndroidRuntime` ni error JS; aparece `ReactNativeJS: Running "main"`.
- QA visitante rápida por ADB: `Obras`, `Mapas`, `Guías`, `Perfil` y `Conversación` cargan sin pantalla blanca ni crash.
- Restricción visitante visible: `Conversación` muestra acceso de equipo solo con sesión admin/topógrafo; `Perfil` muestra modo visitante y campo de token técnico.
- QA topógrafo:
  - Token técnico fresco validado en Galaxy; `Perfil` muestra rol `Topógrafo` y cuenta técnica.
  - `Conversación` muestra hilos de estaciones para equipo.
  - Render `0a4f523169d1a64c1a28b2e92ddea8f95fce2d33` probado con rol `topografo`.
  - Mensaje creado y confirmado en `Campus Nord Estacionamiento CN2`: `e1037d58-f6e6-42c2-a222-c8e8fc389003`.
  - Propuesta provisional creada y visible como `Abierta`: `1f8153e3-d956-48c7-9ad6-00c0322c16cf`.
  - Foto de prisma validada con subida firmada + `PATCH /prisms/:id/photo`; se restauró la foto anterior/null para no dejar imagen QA.
  - Foto de obra validada con subida firmada + `PATCH /projects/:id/photo`; se restauró la imagen anterior/null para no dejar portada QA.
  - `logcat` tras la prueba: sin `AndroidRuntime`, sin error JS; solo `ReactNativeJS: Running "main"`.
- Hallazgo corregido durante QA: `GET /incidents?stationId=...&status=open` devolvía `500 INCIDENTS_LIST_FAILED` por columna `id` ambigua en SQL; fix `0a4f523` cualifica columnas con alias `i`.
- Decisión post-QA: se dejan el mensaje `e1037d58-f6e6-42c2-a222-c8e8fc389003` y la propuesta `1f8153e3-d956-48c7-9ad6-00c0322c16cf` como trazabilidad aceptada de prueba. No son visibles para `visitante`.
- Objetivo de esta build: validar en Galaxy las pestañas `Obras`, `Mapas`, `Conversación`, `Guías`, `Perfil`, croquis con pinza, token técnico y escrituras reales contra Render actualizado.

## ADB local

- `adb.exe` disponible en: `C:\Program Files (x86)\Vidmore\Vidmore Screen Recorder\adb\adb.exe`
- Dispositivo detectado: `R5CY21X6FLE`
- Modelo: `SM_S938B`
- Package Android: `com.ciudadanoinusual.topofield`

Comandos preparados:

```powershell
$ADB = "C:\Program Files (x86)\Vidmore\Vidmore Screen Recorder\adb\adb.exe"
& $ADB devices -l
& $ADB install -r "C:\Users\guill\Downloads\topofield-71a232a3-preview.apk"
& $ADB shell am start -n com.ciudadanoinusual.topofield/.MainActivity
& $ADB shell pidof com.ciudadanoinusual.topofield
& $ADB logcat -c
```

Para revisar errores tras abrir la app:

```powershell
$ADB = "C:\Program Files (x86)\Vidmore\Vidmore Screen Recorder\adb\adb.exe"
$AppPid = (& $ADB shell pidof com.ciudadanoinusual.topofield).Trim()
& $ADB logcat --pid=$AppPid ReactNativeJS:V AndroidRuntime:E '*:S'
```

## Checklist rápida próxima APK

### Visitante

- Abrir la app sin pantalla blanca ni cierre.
- Confirmar pestañas visibles: `Obras`, `Mapas`, `Bitácora`, `Guías`, `Perfil`.
- `Obras`: carga tarjetas de obra.
- Entrar en `Campus Nord`, `Sanllehy` o `Sarrià`.
- Abrir una estación y confirmar detalle, foto principal si existe y croquis.
- `Guías`: muestra solo manuales offline Leica estación y Leica LS10 como entradas principales.
- Abrir ambos manuales y pasar páginas.
- `Mapas`: muestra estaciones o fallback operativo sin crash.
- `Bitácora`: visitante no debe poder ver mensajes internos reales ni incidencias internas.
- `Perfil`: rol `visitante`, sin token visible.

### Topógrafo

- En `Perfil`, pegar token técnico desde `topofield-session-tokens.local` sin mostrarlo en pantalla compartida.
- Validar token y confirmar rol `topografo`.
- Abrir `Ver historial de cambios`; debe responder sin error.
- Abrir `Bitácora`; debe mostrar notas, incidencias y mensajes con fecha/hora.
- Abrir una estación con `Mensajes del equipo`.
- Crear mensaje temporal corto: `QA mensaje Galaxy`.
- Confirmar que aparece con autor/fecha.
- Crear propuesta provisional con nombre/motivo temporal.
- Confirmar que queda `Abierta`.
- Probar foto de prisma desde una estación con croquis.
- Probar foto de obra desde tarjeta/pantalla de obra.
- Volver a visitante y confirmar que mensajes/propuestas internas no se muestran.

### Logcat

- Durante cada bloque, revisar que no aparezca:
  - `FATAL EXCEPTION`
  - `AndroidRuntime`
  - `ReactNativeJS`
  - `TypeError`
  - `ReferenceError`

### Si falla algo

- Anotar pantalla exacta.
- Anotar acción exacta.
- Anotar código HTTP o mensaje visible.
- Guardar las últimas líneas relevantes de `logcat`.

---

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

- `GET /health`: 200 con `commit: 0a4f523169d1a64c1a28b2e92ddea8f95fce2d33`
- `/projects`, `/stations`, `/guide-entries` y `/prisms/coverage/CN1` sin token: 401
- `/projects`, `/stations`, `/guide-entries` y `/prisms/coverage/CN1` con `GUEST_PUBLIC_TOKEN`: 200
- `PATCH /prisms/:prismId/photo` sin token: 401, no 404
- `POST /uploads/photos/sign` sin token: 401, no 404
- Escrituras reales con `topografo` validadas en Galaxy: mensaje, propuesta provisional, foto de prisma y foto de obra.

### Estado actual tras nuevos commits

- GitHub `main`: contiene el fix `0a4f523`.
- Render `GET /health`: `0a4f523169d1a64c1a28b2e92ddea8f95fce2d33`.
- Mensajes de estación, incidencias/propuestas provisionales y fotos reales ya fueron validados en Galaxy con rol `topografo`.

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
- Limitación histórica: esta build no probó escritura real en esa tanda. La APK posterior `71a232a3` sí validó mensajes, propuesta provisional, foto de prisma y foto de obra.

### Pendiente de QA móvil fina

- Build EAS `cdf499a0-0fef-4ccd-856e-2952ded918ee` cancelado porque quedó obsoleto tras añadir Bitácora.
- Build EAS actual: `a8ab7d91-abd4-4d74-a445-641ee09e7b73`, estado `FINISHED`.
- APK: https://expo.dev/artifacts/eas/mQ2DDR7pdsqeyhSDfkhZYg.apk
- APK local: `C:\Users\guill\Downloads\topofield-a8ab7d91-bitacora-guides-prisms.apk`.
- APK `a8ab7d91` no incluye el cambio posterior de iconos.
- Cambio móvil posterior: icono de tab `Bitácora` pasa a brújula (`explore`) y los assets de launcher/splash/favicon pasan a una brújula topográfica generada localmente.
- Verificado para iconos: `npm run generate:icons --workspace apps/mobile`, `npx tsc --noEmit --project apps/mobile/tsconfig.json`, `git diff --check`.
- Backend desplegado con `GET /stations/messages`; smoke test: anónimo 401, visitante 403, topógrafo 200.
- Pendiente: lanzar nueva EAS preview para validar también icono de app en Galaxy.
- Validar lector de guías corregido: una página cada vez, navegación de páginas, zoom y arrastre legible.
- Validar croquis corregido: seleccionar un prisma alejado, por ejemplo `626`, ampliar y arrastrar por todo el croquis sin quedar limitado al centro.
- Validar pestaña `Bitácora`: muestra notas, incidencias y mensajes con fecha/hora para `admin/topografo`, y queda bloqueada para `visitante`.
- Validar icono: Android debe mostrar brújula/topografía, no la libreta antigua.
- Revisar historial visible con rol técnico si se toca esa pantalla.
- Revisar errores manuales de roles/scope si se crean usuarios reales.
- Hay cambio móvil real pendiente de APK; lanzar EAS preview solo después de comprobar TypeScript y decidir que la UX local queda lista.

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
