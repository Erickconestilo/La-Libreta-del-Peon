# API_CANDIDATES.md — APIs públicas útiles para TopoField

Fecha de revisión: 2026-06-07

Este documento resume APIs públicas o free tier que pueden aportar valor real a TopoField. No es una lista de APIs "interesantes"; es una selección filtrada por utilidad en obra, coste, riesgo, compatibilidad con offline-first y facilidad de mantener en free tier.

Corrección de criterio tras feedback del usuario: **clima no es prioridad**. El clima ya se puede consultar fácilmente desde el móvil y no diferencia TopoField. Las APIs realmente interesantes para este producto son las que aportan cartografía, catastro, ortofoto, contexto urbano, rutas de acceso, elevación aproximada o datos geográficos que ayuden a trabajar una obra.

## Estado de decisión actual

No hubo cambio de prioridad funcional desde la revisión anterior. La necesidad inmediata sigue siendo operativa:

- cerrar flujo real de usuarios y membresías,
- consolidar ruta de build Android sin depender de cuota EAS,
- y solo después retomar integraciones externas.

Interpretación: este documento sigue vigente como backlog de APIs, pero no entra en el siguiente bloque de trabajo inmediato.

## Criterio de decisión

- Aporta información útil en campo: mapa, cartografía, catastro, ortofoto, rutas, contexto municipal o datos oficiales.
- No rompe el flujo principal si la API externa cae.
- No obliga a pagar pronto.
- No expone claves privadas dentro de la app móvil.
- Permite caché en backend o importación previa.
- No sustituye datos propios de obra, estaciones, prismas, fotos o mensajes.

## Recomendación corta

| Prioridad | API | Uso recomendado | Decisión |
| --- | --- | --- | --- |
| P1 | ICGC WMS/WMTS | Cartografía, ortofoto y mapa base Catalunya | Prueba técnica prioritaria para `Mapas` |
| P1 | PNOA/IGN-CNIG WMS/WMTS | Ortofotos oficiales España | Buena alternativa nacional a Google Maps |
| P1 | Catastro INSPIRE/WMS | Parcelas y referencia catastral | Muy útil como capa contextual, no como verdad topográfica |
| P2 | CartoCiudad | Geocodificación oficial de direcciones España | Crear obra desde dirección o ubicar dirección aproximada |
| P2 | Overpass API / OSM | Accesos, viales, puertas, servicios cercanos | Usar desde backend con caché, no directo en móvil |
| P2 | openrouteservice | Rutas, distancias, isocronas, POI y elevación | Útil para logística de acceso a obra |
| P2 | Open Topo Data / Open-Elevation | Elevación aproximada por coordenada | Solo apoyo visual; no usar como cota topográfica |
| P2 | Open Data Barcelona / AMB / Diputació | Contexto municipal, movilidad, calles, equipamientos | Usar como importación/admin, no runtime móvil directo |
| P3 | Mapillary API | Imágenes a pie de calle para reconocer accesos | Investigar términos y cobertura antes de integrar |
| P3 | datos.gob.es | Buscar datasets oficiales españoles | Usar para investigación/importación, no runtime móvil |
| P4 | Open-Meteo / AEMET / RainViewer | Clima y radar | Descartado por ahora; no diferencia la app |
| P3 | Geoapify | Geocoding/búsqueda por dirección | Solo si CartoCiudad no cubre bien el caso |
| P4 | Nominatim público | Geocoding OpenStreetMap | Evitar en móvil; usar solo con backend/caché y muy bajo volumen |
| P4 | OSM public tiles | Teselas base de mapa | No usar directamente en producción móvil |

## APIs no climáticas más interesantes

### A. ICGC WMS/WMTS

Valor: mapa base, ortofoto y cartografía oficial en Catalunya. Para obras en Barcelona/Catalunya es probablemente la API/capa más alineada con TopoField.

Uso propuesto: capa opcional de `Mapas`, vista de obra o pantalla técnica. Mantener fallback actual si la capa no carga.

Fuente: https://www.icgc.cat/ca/Geoinformacio-i-mapes/Servei-de-Mapa-Base

### B. PNOA / IGN-CNIG

Valor: ortofotos oficiales de España por servicios WMS/WMTS. Es más serio para obra que un mapa genérico.

Uso propuesto: vista de ortofoto nacional como capa base. Para Catalunya comparar con ICGC y elegir la que cargue mejor en móvil.

Fuente: https://pnoa.ign.es/pnoa-imagen/visualizadores-y-servicios-web

### C. Catastro INSPIRE/WMS

Valor: parcelas catastrales, referencia catastral y contexto de límites. Puede ayudar a ubicar una obra respecto a fincas/parcela sin convertir TopoField en herramienta legal.

Uso propuesto: capa contextual consultable, no editable. Mostrar advertencia: "Dato catastral orientativo; no sustituye levantamiento ni documentación oficial".

Fuentes:

- https://www.catastro.hacienda.gob.es/webinspire/index.html
- https://www.catastro.hacienda.gob.es/es-ES/wms.html

### D. CartoCiudad

Valor: geocodificación oficial de direcciones, topónimos y entidades de población en España.

Uso propuesto: crear obra desde dirección o buscar una dirección cercana a coordenadas. Mejor que Nominatim para España si encaja bien.

Fuente: https://www.cartociudad.es/web/portal/servicios

### E. Overpass API / OpenStreetMap

Valor: consultar elementos cercanos a una obra: viales, accesos, puertas, parkings, estaciones de transporte, barreras, caminos o servicios.

Uso propuesto: botón interno "Contexto alrededor de obra" que el backend calcula y cachea. No llamar desde móvil en cada render.

Fuentes:

- https://dev.overpass-api.de/overpass-doc/en/
- https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL

### F. openrouteservice

Valor: rutas, distancias, isocronas, POIs, matrices y elevación. Aporta más que abrir Google Maps si se quiere planificar acceso de equipo o estimar tiempos.

Uso propuesto: "Cómo llegar a obra", tiempo aproximado, ruta peatonal desde aparcamiento o zona alcanzable en 10-15 minutos.

Fuentes:

- https://openrouteservice.org/dev/
- https://openrouteservice.org/restrictions/
- https://staging.openrouteservice.org/plans/

### G. Open Topo Data / Open-Elevation

Valor: elevación aproximada por coordenada. Puede servir como contexto visual o sanity check, pero no como cota de trabajo.

Uso propuesto: mostrar "elevación aproximada externa" en una sección secundaria. Nunca mezclarla con observaciones topográficas propias.

Fuentes:

- https://www.opentopodata.org/api/
- https://open-elevation.com/

### H. Mapillary API

Valor: imágenes de calle cercanas a accesos, vallas, fachadas o referencias visibles. Puede ayudar antes de ir a obra.

Uso propuesto: abrir imagen externa o mini-panel "vista de acceso" si hay cobertura. Requiere revisar términos, token y atribución.

Fuente: https://help.mapillary.com/hc/en-us/articles/360010234680-Accessing-imagery-and-data-through-the-Mapillary-API

## Candidatas detalladas

### 1. Open-Meteo

**Utilidad para TopoField**

- Mostrar clima actual por obra.
- Avisar de lluvia/viento antes de salir a campo.
- Añadir una banda simple en la tarjeta de obra: `18 C · viento 12 km/h · lluvia probable`.
- Guardar caché por coordenadas y hora para no repetir llamadas.

**Ventajas**

- No necesita API key.
- Respuesta JSON simple.
- Buen encaje con React Query y backend Express.
- Permite empezar sin tocar infraestructura de pago.

**Riesgos**

- Los datos meteorológicos son apoyo operativo, no verdad crítica.
- La licencia exige atribución.
- Para uso comercial o volumen alto hay que revisar plan.

**Forma correcta de integrarla**

- Crear endpoint backend: `GET /api/v1/projects/:projectId/weather`.
- El backend calcula clima por coordenadas de obra y cachea 30-60 minutos.
- El móvil nunca debe bloquear `Obras` si falla la API: mostrar "Clima no disponible".

**Veredicto**

No es prioridad ahora. Es fácil, pero el usuario confirma que el clima ya lo resuelve con el móvil y busca APIs con más valor diferencial.

Fuente: https://open-meteo.com/

### 2. AEMET OpenData

**Utilidad para TopoField**

- Avisos meteorológicos oficiales en España.
- Complementar Open-Meteo con fuente institucional.
- Mostrar advertencias por provincia/zona si aplica.

**Ventajas**

- Fuente oficial española.
- Buena opción para avisos y trazabilidad.

**Riesgos**

- Requiere API key.
- La clave debe vivir en el backend, no en Expo.
- La API tiene patrón de autodescubrimiento/HATEOAS y puede ser menos directa que Open-Meteo.

**Forma correcta de integrarla**

- Variable backend: `AEMET_API_KEY`.
- Endpoint propio cacheado.
- Usarla solo para avisos/consulta oficial, no para pintar cada tarjeta en tiempo real.

**Veredicto**

No prioritaria ahora. Puede servir para avisos oficiales, pero no debe desplazar cartografía, catastro o contexto de obra.

Fuentes:

- https://www.aemet.es/es/datos_abiertos/AEMET_OpenData
- https://opendata.aemet.es/centrodedescargas/AEMETApi

### 3. ICGC WMS/WMTS

**Utilidad para TopoField**

- Cartografía oficial de Catalunya.
- Ortofotos y mapas base útiles para obras en Barcelona/Catalunya.
- Alternativa seria a depender de Google Maps o tiles OSM públicos.

**Ventajas**

- Mucho más alineado con topografía que APIs genéricas.
- Puede mejorar `Mapas` sin convertirlo en módulo avanzado UTM.
- En Catalunya tiene más sentido que muchas APIs globales.

**Riesgos**

- Hay que probar soporte real en React Native/Expo.
- WMS/WMTS requiere cuidar atribución, caché y rendimiento.
- No conviene prometer precisión topográfica si solo se usa como fondo visual.

**Forma correcta de integrarla**

- Prototipo pequeño en `Mapas`.
- Si no encaja con `react-native-maps`, evaluar vista web controlada o teselas cacheadas.
- Mantener fallback actual si no hay red o falla la capa.

**Veredicto**

Alta prioridad para mapa, pero primero requiere prueba técnica.

Fuentes:

- https://www.icgc.cat/en/Geoinformation-and-Maps/Online-services-Geoservices
- https://www.icgc.cat/es/Mapes-i-geoinformacio/Dades-i-productes/Servicios-en-linea-Geoservicios/WMS-y-teselas-Cartografia-de-referencia/WMSWMTS-rapidos-de-cartografia-raster

### 4. Open Data Barcelona / AMB / Diputació

**Utilidad para TopoField**

- Contexto local: calles, equipamientos, movilidad, municipio, incidencias urbanas si existe dataset concreto.
- Puede enriquecer obras en Barcelona sin pagar proveedores.
- Puede alimentar catálogos internos o capas auxiliares.

**Ventajas**

- Fuentes públicas locales.
- Encajan con obras reales en Barcelona/AMB.
- Útiles para importaciones puntuales.

**Riesgos**

- Muchos datasets son heterogéneos: CSV, JSON, API, OData o descargas.
- No todos sirven para app móvil.
- Hay que evaluar dataset por dataset.

**Forma correcta de integrarla**

- No llamar desde móvil en cada pantalla.
- Crear scripts de importación o endpoints backend cacheados.
- Guardar solo lo útil para TopoField, con fecha de actualización y fuente.

**Veredicto**

Buena línea de investigación, pero no primera feature.

Fuentes:

- https://opendata-ajuntament.barcelona.cat/
- https://opendata.amb.cat/help_es.html
- https://do.diba.cat/

### 5. datos.gob.es

**Utilidad para TopoField**

- Catálogo nacional para localizar datasets útiles.
- Sirve para investigar fuentes oficiales por provincia, municipio, movilidad, cartografía o medio ambiente.

**Ventajas**

- Punto central de datos abiertos españoles.
- Tiene API y SPARQL para consultar metadatos.

**Riesgos**

- Es más catálogo que API operativa para la app.
- No conviene meter SPARQL en la app móvil.

**Forma correcta de integrarla**

- Usarlo como herramienta de exploración.
- Si encontramos un dataset útil, integrar la fuente original o importarlo al backend.

**Veredicto**

Útil para investigación, no para runtime móvil.

Fuente: https://datos.gob.es/es/apidata

### 6. openrouteservice

**Utilidad para TopoField**

- Calcular ruta hasta una obra.
- Distancia/tiempo desde ubicación del topógrafo.
- Isocronas o elevación si luego se crea módulo logístico.

**Ventajas**

- APIs de rutas, geocoding, POI, matrices y elevación.
- Tiene plan gratuito con límites publicados.

**Riesgos**

- Requiere API key.
- Puede duplicar algo que ya resolvemos abriendo Google Maps externo.
- No es imprescindible para el MVP actual.

**Forma correcta de integrarla**

- Mantener por ahora enlace externo a mapas.
- Solo integrar si se define una feature concreta: "planificar ruta de obra" o "ver tiempo de llegada".
- Si se integra, pasar por backend/caché.

**Veredicto**

Interesante, pero no urgente.

Fuentes:

- https://openrouteservice.org/
- https://openrouteservice.org/dev/
- https://staging.openrouteservice.org/plans/

### 7. RainViewer

**Utilidad para TopoField**

- Radar de lluvia como capa visual.
- Útil para decidir si salir o esperar.

**Ventajas**

- No requiere API key.
- Puede aportar valor visual rápido.

**Riesgos**

- Servicio best-effort, sin garantía fuerte.
- Uso gratuito orientado a personal, educativo y pequeña comunidad.
- Requiere atribución.

**Forma correcta de integrarla**

- Solo como capa opcional.
- Nunca bloquear la pantalla de mapa por esta API.
- Cachear metadatos y ocultar capa si falla.

**Veredicto**

Interesante, pero menos prioritario que Open-Meteo/AEMET.

Fuente: https://www.rainviewer.com/api.html

### 8. Geoapify

**Utilidad para TopoField**

- Buscar direcciones y convertirlas a coordenadas.
- Crear una obra desde dirección postal.
- Reverse geocoding para mostrar calle aproximada.

**Ventajas**

- Free tier generoso para pruebas.
- API moderna y documentada.

**Riesgos**

- Requiere API key.
- Puede generar dependencia innecesaria si las obras se crean con GPS/coordenadas reales.

**Forma correcta de integrarla**

- Solo en backend si se crea flujo "crear obra desde dirección".
- Guardar resultado en BD; no recalcular cada vez.

**Veredicto**

Esperar. No aporta tanto como clima/cartografía.

Fuentes:

- https://www.geoapify.com/geocoding-api/
- https://www.geoapify.com/pricing/

### 9. Nominatim público

**Utilidad para TopoField**

- Geocoding/reverse geocoding basado en OpenStreetMap.

**Ventajas**

- Sin coste directo.
- Útil para consultas puntuales.

**Riesgos**

- El servicio público tiene capacidad limitada.
- Política oficial: máximo 1 petición/segundo y aplicación identificada.
- No es adecuado para uso móvil masivo o sin caché.

**Forma correcta de integrarla**

- No llamar desde la app móvil.
- Si se usa, backend con caché persistente, User-Agent propio y bajo volumen.

**Veredicto**

No recomendado para Fase 1.

Fuente: https://operations.osmfoundation.org/policies/nominatim/

### 10. OSM public tiles

**Utilidad para TopoField**

- Teselas de mapa base.

**Ventajas**

- Mapa familiar y abierto.

**Riesgos**

- Los datos OSM son libres, pero los servidores públicos de teselas no son una infraestructura gratuita para apps móviles de producción.
- No hay SLA.
- Puede bloquearse uso pesado o inadecuado.

**Forma correcta de integrarla**

- Evitar `tile.openstreetmap.org` directo en producción móvil.
- Preferir ICGC para Catalunya, proveedor con free tier controlado o caché propia.

**Veredicto**

No usar como dependencia principal.

Fuente: https://operations.osmfoundation.org/policies/tiles/

## Propuesta de implementación

### Paso 1 — Prueba técnica ICGC / PNOA

Objetivo:

- Ver si podemos mostrar una capa base/ortofoto oficial en `Mapas`.
- Comparar ICGC contra PNOA/IGN-CNIG en carga, legibilidad y compatibilidad Expo.
- Mantener fallback actual si no funciona.
- No prometer precisión topográfica; usarlo como apoyo visual.

Es el camino con más valor real para TopoField porque mejora la lectura espacial de la obra.

### Paso 2 — Catastro como capa contextual

Objetivo:

- Probar consulta/capa WMS/INSPIRE de Catastro cerca de una obra.
- Mostrar parcelas o referencia solo como contexto.
- Evitar que el usuario confunda catastro con levantamiento topográfico.

### Paso 3 — Contexto alrededor de obra

Objetivo:

- Usar Overpass o datos municipales para sacar accesos, viales, transporte, parkings o referencias cercanas.
- Cachear por obra desde backend.
- No llamar APIs externas desde cada render móvil.

### Paso 4 — Rutas/logística si aporta valor

Objetivo:

- Evaluar openrouteservice para rutas a obra, isocronas y distancia.
- Mantener Google Maps externo como fallback simple.

## Reglas técnicas si se integran APIs externas

- Las claves privadas viven en `apps/backend/.env`, nunca en `EXPO_PUBLIC_*`.
- Toda API con key, límite o coste pasa por backend.
- React Query puede cachear en móvil, pero la fuente de control debe ser backend.
- Las respuestas externas deben normalizarse antes de llegar a la app.
- Si falla una API externa, la app debe seguir abriendo `Obras`, `Guías`, `Mapas` y detalles.
- Añadir timeout corto y error controlado.
- Registrar fuente y fecha de datos cuando se muestren datos oficiales.
- No mezclar datos externos con observaciones propias como si tuvieran la misma autoridad.

## Decisión recomendada

La mejor mejora inmediata es **cartografía oficial en Mapas**, empezando por ICGC y comparando PNOA/IGN-CNIG, porque:

- aporta valor diferencial real frente a mirar el tiempo en el móvil,
- encaja con topografía y obra,
- mejora la pantalla central del producto,
- puede funcionar como capa/fallback sin tocar datos propios,
- y mantiene la app orientada a campo, no a información genérica.

La segunda mejora es **Catastro como contexto**, con una advertencia visible de que no sustituye trabajo topográfico ni documentación oficial. La tercera es **Overpass/datos municipales** para detectar accesos y referencias alrededor de la obra.
