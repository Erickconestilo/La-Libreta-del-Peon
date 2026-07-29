# PLAN.md — Plan Maestro de TopoField

## Resumen ejecutivo
TopoField deja de planificarse como una suma de features técnicas y pasa a gestionarse como un producto de campo validado con usuarios reales. El usuario inicial confirmado es el **compañero de trabajo / peón de topografía** dentro de equipos pequeños, así que la prioridad es resolver tareas reales de obra con baja fricción, aprendizaje rápido y estabilidad operativa.

La programación sigue siendo central, pero ya no manda sola. A partir de este punto, cada bloque técnico debe apoyarse en cuatro capas previas o paralelas:

1. definición del problema de usuario;
2. diseño funcional del flujo;
3. validación de usabilidad;
4. criterio explícito de lanzamiento.

## Documentos maestros
Este plan se apoya en cuatro fuentes de verdad complementarias:

- `PLAN.md`: roadmap ejecutivo, fases, prioridades y puertas de salida.
- `PRODUCT_STRATEGY.md`: problema, usuario, propuesta de valor, alcance y decisiones de producto.
- `UX_RESEARCH_PLAN.md`: hipótesis, pruebas de campo, métricas, plantilla de hallazgos y backlog UX.
- `LAUNCH_PLAN.md`: piloto controlado, onboarding, materiales, feedback y activación inicial.

## Decisiones fijadas
- Stack confirmado: React Native + Expo, backend Node.js + Express, PostgreSQL + Supabase.
- Android es la plataforma principal de validación y operación inicial.
- iOS se mantiene como expansión posterior sobre la misma base React Native/Expo.
- El lanzamiento inicial será un **piloto controlado**, no una salida pública amplia.
- El marketing inicial será operativo y demostrativo, no una campaña de marca compleja.
- Se mantiene el criterio de infraestructura contenida y free tier cuando no perjudique el uso real.

## Estado actual que condiciona el plan
- La app ya tiene base funcional real en `Obras -> Estacionamientos`, detalle de estación, memoria visual, notas, guía offline, croquis de prismas y aperturas externas.
- El backend ya tiene base MVP inicial para auscultación: rondas, puntos esperados, lecturas instrumentadas, catálogo de códigos por proyecto y reglas de auto-confirmación calculada.
- La validación Android en Galaxy ya existe y ha permitido detectar problemas reales de sesión, fotos, navegación y ritmo de uso.
- Hay una ruta de build Android local sin coste en Windows.
- La base offline técnica quedó validada el 29-07-2026 en Galaxy real: outbox SQLite, reinicio sin red, sincronización automática global e idempotencia en Supabase. Esto desbloquea el desarrollo de Fase 3, pero todavía requiere integrar la rama y desplegar el backend actual antes del piloto.
- El siguiente salto de valor no es añadir más superficie sin orden, sino conectar la auscultación a flujos móviles simples y validar si sirve en campo.

## Fases del plan

### Fase 1 — Enfoque de producto
**Objetivo**
Definir con precisión qué problema operativo resuelve TopoField mejor que WhatsApp, notas sueltas o memoria informal.

**Trabajo**
- Perfilar el usuario inicial real: peón/topógrafo de campo en equipo pequeño.
- Redactar los tres trabajos principales que la app debe resolver.
- Fijar una propuesta de valor operativa y verificable.
- Cerrar exclusiones del MVP para evitar deriva.

**Salida obligatoria**
- Problemas prioritarios cerrados.
- Promesa de producto verificable.
- Lista de no-objetivos del MVP.

### Fase 2 — Diseño funcional previo al código
**Objetivo**
Diseñar primero los flujos críticos y luego decidir la implementación.

**Trabajo**
- Mapear los flujos reales:
  - entrar a una obra;
  - localizar un estacionamiento;
  - revisar memoria visual;
  - añadir foto o nota;
  - consultar prismas;
  - abrir ubicación externa;
  - registrar incidencia o propuesta.
- Convertir esos flujos en secuencias de pantalla y estados.
- Identificar fricciones de contexto real: sol, manos ocupadas, cobertura pobre, interrupciones y cansancio.

**Salida obligatoria**
- Flujos base aprobados.
- Lista de pantallas y estados necesarios.

### Fase 3 — Diseño UX/UI aplicado a obra
**Objetivo**
Construir un sistema de decisiones UX que guíe el desarrollo y reduzca improvisación visual.

**Trabajo**
- Fijar principios de interfaz:
  - lectura rápida;
  - acciones grandes;
  - navegación superficial;
  - texto mínimo;
  - foco en mapa, foto y estado;
  - tolerancia a interrupciones.
- Diseñar estados clave:
  - carga lenta;
  - offline;
  - sesión caducada;
  - permisos denegados;
  - foto fallida;
  - obra vacía;
  - estación sin datos.
- Normalizar patrones de UI para:
  - listas de obra;
  - ficha de estación;
  - memoria visual;
  - fotos;
  - guía;
  - perfil técnico.

**Salida obligatoria**
- Criterios UX suficientemente estables para guiar implementación.

### Fase 4 — Validación de usabilidad en campo
**Objetivo**
Medir si la app realmente sirve en contexto de obra antes de considerarla lista para piloto.

**Trabajo**
- Preparar pruebas con compañeros reales usando tareas concretas.
- Validar escenarios mínimos:
  - encontrar una estación;
  - verificar si una foto sirve;
  - editar una nota;
  - abrir navegación externa;
  - entender permisos por rol.
- Medir:
  - tiempo;
  - errores;
  - bloqueos;
  - dudas repetidas;
  - pasos sobrantes;
  - elementos ignorados.
- Registrar hallazgos con plantilla fija y backlog priorizado.

**Salida obligatoria**
- Top 10 fricciones UX.
- Decisiones explícitas sobre qué corregir antes del piloto.

### Fase 5 — Desarrollo guiado por validación
**Objetivo**
Desarrollar según valor real de campo y evidencia de uso, no por comodidad técnica.

**Orden de prioridad técnica**
1. estabilidad de sesión técnica;
2. memoria visual y fotos;
3. edición fiable de notas y datos críticos;
4. detalle de estación y prismas;
5. mapa y aperturas externas;
6. incidencias y bitácora;
7. auscultación MVP móvil:
   - rondas;
   - puntos pendientes;
   - captura de lectura;
   - catálogo de códigos;
   - histórico simple;
8. mejoras offline reales.

**Regla de entrada para cada feature**
Toda feature nueva debe venir con:
- objetivo de usuario;
- flujo esperado;
- estados límite;
- criterio de aceptación funcional;
- criterio de aceptación UX;
- criterio de lanzamiento o no lanzamiento.

**Salida obligatoria**
- MVP coherente y defendible.

### Fase 6 — Preparación de piloto y lanzamiento inicial
**Objetivo**
Pasar de “app que funciona” a “piloto desplegable sin improvisación”.

**Trabajo**
- Definir usuarios piloto.
- Definir dispositivo objetivo Android.
- Preparar build estable.
- Preparar credenciales y roles reales.
- Crear checklist de instalación.
- Crear guía de uso de una página.
- Definir canal de feedback.

**Criterio de listo para piloto**
- sin bloqueos en login;
- sin pérdida de fotos o notas;
- navegación básica estable;
- errores entendibles;
- rendimiento aceptable en campo.

**Salida obligatoria**
- Piloto controlado preparado para uso real.

### Fase 7 — Lanzamiento y marketing proporcional
**Objetivo**
Explicar y activar el uso de TopoField sin inflar el posicionamiento ni prometer más de lo que entrega.

**Trabajo**
- Preparar paquete mínimo:
  - nombre y propuesta corta;
  - problema y solución;
  - capturas reales;
  - vídeo corto o demo guiada;
  - ficha de beneficios para compañero o encargado.
- Mantener el mensaje en clave operativa:
  - menos “suite topográfica completa”;
  - más “herramienta de campo para no perder contexto, fotos y referencias de obra”.
- Canal inicial:
  - compañeros;
  - encargado o jefe;
  - empresa piloto;
  - círculo profesional cercano.

**Salida obligatoria**
- Narrativa simple y reutilizable para enseñar, instalar y justificar uso.

### Fase 8 — Aprendizaje post-lanzamiento
**Objetivo**
Cerrar el bucle de aprendizaje real y convertirlo en backlog fiable.

**Trabajo**
- Medir adopción por comportamiento:
  - qué pantallas sí usan;
  - qué ignoran;
  - dónde abandonan;
  - qué siguen resolviendo fuera de la app.
- Clasificar feedback en cuatro grupos:
  - fallo;
  - fricción UX;
  - necesidad real;
  - idea fuera de fase.
- Revisar quincenalmente si el producto sigue centrado en el peón/topógrafo real.

**Salida obligatoria**
- Backlog de siguiente versión basado en uso real.

## Criterios de aceptación del plan
El plan se considerará aplicado correctamente cuando toda nueva mejora importante del producto tenga:

- problema de usuario identificado;
- flujo diseñado;
- validación con usuario o hipótesis explícita;
- prueba funcional;
- prueba mínima de usabilidad;
- criterio de lanzamiento claro.

Casos obligatorios para el MVP:
- un usuario nuevo entiende cómo entrar a una obra sin explicación larga;
- encuentra una estación en menos de un minuto;
- puede añadir o revisar memoria visual sin perderse;
- entiende qué ha fallado y qué hacer después;
- distingue visitante, topógrafo y admin;
- no percibe la app como pesada o confusa.

## Próximo bloque inmediato
1. Consolidar `PRODUCT_STRATEGY.md`, `UX_RESEARCH_PLAN.md` y `LAUNCH_PLAN.md` como referencia diaria.
2. Revisar el backlog técnico actual contra las prioridades de Fase 5.
3. Elegir el siguiente bloque funcional solo entre los problemas que afecten al piloto controlado.
4. No abrir nuevas líneas grandes sin hipótesis de uso o criterio de salida.
