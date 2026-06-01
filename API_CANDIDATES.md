# API_CANDIDATES.md — APIs públicas útiles para TopoField

Fecha de revisión: 2026-06-01

Este documento resume APIs públicas o free tier que pueden aportar valor real a TopoField. No es una lista de APIs "interesantes"; es una selección filtrada por utilidad en obra, coste, riesgo, compatibilidad con offline-first y facilidad de mantener en free tier.

## Criterio de decisión

- Aporta información útil en campo: clima, mapa, cartografía, rutas, contexto municipal o datos oficiales.
- No rompe el flujo principal si la API externa cae.
- No obliga a pagar pronto.
- No expone claves privadas dentro de la app móvil.
- Permite caché en backend o importación previa.
- No sustituye datos propios de obra, estaciones, prismas, fotos o mensajes.

## Recomendación corta

| Prioridad | API | Uso recomendado | Decisión |
| --- | --- | --- | --- |
| P1 | Open-Meteo | Clima por obra/estación: lluvia, viento, temperatura | Prototipar primero |
| P1 | AEMET OpenData | Avisos y dato meteorológico oficial España | Integrar después de Open-Meteo si aporta más confianza |
| P1 | ICGC WMS/WMTS | Cartografía/ortofoto Catalunya para mapa | Estudiar como mejora fuerte de mapa |
| P2 | Open Data Barcelona / AMB / Diputació | Contexto municipal, movilidad, calles, equipamientos | Usar como importación/admin, no como dependencia móvil directa |
| P2 | datos.gob.es | Buscar datasets oficiales españoles | Usar para investigación/importación, no runtime móvil |
| P2 | openrouteservice | Rutas, distancias, isocronas, elevación | Solo si se crea módulo de acceso/logística |
| P3 | RainViewer | Radar de lluvia sobre mapa | Opcional visual, no crítico |
| P3 | Geoapify | Geocoding/búsqueda por dirección | Solo si se necesita crear obras desde dirección postal |
| P4 | Nominatim público | Geocoding OpenStreetMap | Evitar en móvil; usar solo con backend/caché y muy bajo volumen |
| P4 | OSM public tiles | Teselas base de mapa | No usar directamente en producción móvil |

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

Primera integración recomendada. Es barata, visible y útil.

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

Recomendada como segunda fase meteorológica.

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

### Paso 1 — Clima por obra con Open-Meteo

Feature pequeña y útil:

- Backend: `GET /api/v1/projects/:projectId/weather`.
- Cache en memoria o tabla simple con TTL de 30-60 minutos.
- Mobile: mostrar resumen en tarjetas de obra y pantalla de obra.
- Fallback: "Clima no disponible".
- Sin escritura en BD de datos críticos.

Es la mejor primera prueba porque aporta valor visible sin tocar permisos sensibles.

### Paso 2 — Prueba técnica ICGC

Objetivo:

- Ver si podemos mostrar una capa base/ortofoto ICGC en `Mapas`.
- Mantener fallback actual si no funciona.
- No prometer precisión topográfica; usarlo como apoyo visual.

### Paso 3 — Exploración de datasets Barcelona/AMB

Objetivo:

- Buscar 3-5 datasets concretos que ayuden a obras reales.
- Crear una tabla de datasets candidatos con URL, formato, licencia, frecuencia y utilidad.
- Integrar solo mediante importación/backend cacheado.

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

La mejor mejora inmediata es **clima por obra con Open-Meteo**, porque:

- no exige clave,
- no rompe el free tier,
- aporta valor real en campo,
- se implementa con poco riesgo,
- se puede cachear fácil,
- y no toca datos sensibles.

La segunda mejora con más valor de producto es **cartografía ICGC**, pero requiere una prueba técnica antes de prometerla.
