<!-- doc-status
estado: vivo
verificado: 2026-08-02
-->

# PRODUCT_STRATEGY.md — Estrategia de Producto TopoField

## Propósito
Definir qué producto estamos construyendo realmente, para quién y con qué límites. Este documento manda sobre intuiciones dispersas y evita que el roadmap técnico derive hacia complejidad sin valor.

## Usuario inicial
**Usuario primario**
- Peón/topógrafo de campo dentro de equipos pequeños.

**Contexto real**
- trabaja en obra;
- cambia de ubicación;
- sufre cobertura irregular;
- tiene poca paciencia para menús profundos;
- consulta fotos, referencias, notas y contexto operativo con prisa;
- no quiere “gestionar software”, quiere resolver trabajo de campo.

**Usuarios secundarios**
- `admin`: organiza, corrige, aprueba, mantiene contenido y estructura.
- `visitante`: consulta pública o controlada de contenidos visibles.

## Problemas prioritarios
TopoField debe resolver mejor que WhatsApp, notas o memoria informal estos tres trabajos:

1. **Recordar el contexto operativo de una estación en campo**
   - dónde está;
   - qué aspecto tiene;
   - qué referencias visuales sirven;
   - qué notas importan.

2. **Reducir pérdida de información entre personas y días**
   - fotos útiles;
   - notas cortas;
   - incidencias;
   - cambios visibles;
   - trazabilidad mínima.

3. **Permitir localizar y actuar rápido sin navegar demasiado**
   - obra;
   - estación;
   - prisma;
   - guía;
   - ubicación externa.

## Propuesta de valor operativa
**TopoField es una herramienta móvil de campo para no perder contexto, fotos, referencias, rondas de auscultación y decisiones operativas de obra.**

No se presenta como “suite topográfica completa”. Se presenta como una capa operativa simple y útil para trabajar mejor en campo.

## Evolución aprobada — auscultación MVP
TopoField empieza desde estaciones, prismas y memoria visual, pero el rumbo de producto aprobado es evolucionar hacia:

**herramienta móvil de campo para rondas de auscultación, evidencia visual y trazabilidad operativa por punto e instrumento.**

Esta evolución no cambia el stack ni convierte TopoField en una suite tipo GeoMoS, Trimble 4D Control o Topcon Delta Watch. El foco sigue siendo campo móvil: ver qué toca medir, capturar lectura, adjuntar evidencia, guardar y seguir.

## Qué sí entra en el MVP
- Obras y acceso rápido a estaciones.
- Detalle de estación con foto principal, memoria visual y notas.
- Prismas y croquis operativo por estación.
- Apertura externa de ubicación.
- Guía de campo útil y rápida.
- Bitácora/incidencia cuando aporte continuidad operativa.
- Roles claros `admin`, `topografo`, `visitante`.
- Base suficiente para trabajar Android primero.
- Backend MVP de auscultación:
  - rondas;
  - puntos esperados;
  - lecturas reales repetibles;
  - catálogo de códigos por proyecto;
  - delta/estado calculado;
  - umbrales con vigencia.

## Qué no entra ahora
- UTM y observaciones topográficas avanzadas.
- Automatismos complejos que no se hayan validado en campo.
- Marca, marketing o web comercial elaborada antes del piloto.
- iOS como línea principal de validación.
- Complejidad offline profunda no guiada por uso real.
- Nuevos módulos por “interés técnico” sin problema operativo detrás.
- Control directo de instrumentos desde el móvil.
- Dashboard avanzado de monitorización.
- Alarmas multicanal.
- Export PDF como prioridad inicial.

## Diferenciación inicial
TopoField debe diferenciarse por:

- foco en estaciones y prismas como unidad operativa real;
- memoria visual útil, no solo álbum de fotos;
- consulta rápida en móvil;
- contexto de obra y trazabilidad mínima;
- funcionamiento razonable con infraestructura contenida.

No debe intentar diferenciarse ahora por:

- cobertura total del ciclo topográfico;
- analítica compleja;
- mapas sofisticados si no mejoran la operación;
- branding excesivo.

## Principios de producto
- primero utilidad de campo, después ornamentación;
- primero claridad, después amplitud funcional;
- primero comportamiento fiable, después superficie nueva;
- primero flujo crítico cerrado, después extras;
- primero validación con compañeros reales, después promesas amplias.

## Decisiones de alcance para próximas features
Toda propuesta nueva debe responder antes a estas preguntas:

1. ¿Qué problema concreto del peón/topógrafo resuelve?
2. ¿Qué flujo existente mejora o desbloquea?
3. ¿Qué evidencia hay de que hace falta ahora?
4. ¿Qué coste mete en navegación, mantenimiento o formación?
5. ¿Es necesaria para el piloto o puede esperar?

Si no supera estas preguntas, no entra en el siguiente bloque.

## Señales de éxito inicial
- usuarios de campo encuentran una estación rápido;
- consultan memoria visual y notas sin pedir explicación continua;
- añaden o revisan fotos útiles sin perderse;
- el encargado entiende el valor operativo en pocos minutos;
- aparecen menos pérdidas de contexto entre jornadas o entre personas.

## Riesgos principales
- convertir la app en un backlog técnico sin validación;
- añadir módulos que no mejoren el trabajo real;
- cargar demasiado la navegación;
- depender de pruebas internas demasiado complacientes;
- hablar del producto como algo más amplio de lo que hoy entrega.
