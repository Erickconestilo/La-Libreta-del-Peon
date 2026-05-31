# QA_ANDROID_GALAXY.md — Prueba APK TopoField

## APK actual

- Build EAS: `cc43f0f1-ff3e-43da-b574-ec09dedfa4e4`
- APK: https://expo.dev/artifacts/eas/rdY4AEzq4WTnj9rCXAD4mG.apk
- APK local instalado por ADB: `C:\Users\guill\Downloads\topofield-cc43f0f1-guides-icon-prisms.apk`
- Backend usado: `https://la-libreta-del-peon-1.onrender.com/api/v1`
- Perfil EAS: `preview`
- Commit incluido en APK: `805fb6197a98ecdb358ff5839d6fbecbfe85b31d`
- Commit backend desplegado en Render: `e5c87d48800b1b564d6828eab9e705c59b65e12a`
- Instalación ADB en Galaxy: `Success`

## Estado backend Render

- `GET /health`: 200 con `commit: e5c87d48800b1b564d6828eab9e705c59b65e12a`
- `GET /stations`: 200
- `GET /projects`: 200
- `GET /guide-entries`: 200
- `GET /prisms/coverage/CN1`: 200
- `PATCH /prisms/:prismId/photo` sin token: 401, no 404
- `POST /uploads/photos/sign` sin token: 401, no 404
- Interpretacion: Render ya sirve backend nuevo. Si la foto de prisma falla en Galaxy, ya no es por ruta inexistente; revisar token/rol, firma de subida o payload.

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
- Foto de prisma falla mientras Render mantenga `PATCH /prisms/:id/photo` en 404.
- Token técnico no cambia el rol.
- Historial no refleja acciones recientes.
