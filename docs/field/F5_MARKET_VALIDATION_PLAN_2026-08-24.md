<!-- doc-status
estado: vivo
verificado: 2026-08-24
-->

# F5 — Plan de validación de mercado de TopoField

## Objetivo

Decidir con evidencia si TopoField resuelve un problema suficientemente
frecuente para que otros profesionales de campo quieran probarlo. No se busca
demostrar que la app tiene muchas funciones; se busca demostrar que reduce una
fricción concreta frente al flujo actual.

## Posicionamiento a validar

TopoField no se presenta como sustituto de Leica Captivate, Trimble Access,
QField, Survey123 ni de una plataforma de monitorización automática. Se prueba
como una capa ligera para equipos pequeños que necesitan conservar contexto de
obra, memoria visual, incidencias, rondas y lecturas entre jornadas.

## Plan optimizado por puertas

### Puerta 0 — Congelar el objetivo

- Usuario inicial: peón/topógrafo de campo en equipo pequeño.
- Problema candidato: pérdida de contexto entre obra, fotos, notas y
  mediciones.
- Fuera de esta validación: nuevo instrumento, iOS, dashboard avanzado y
  rediseño visual amplio.
- Evidencia de salida: una frase de problema y tres tareas observables.

### Puerta 1 — Estabilidad mínima en el Galaxy

- Corregir la selección obligatoria de obra al crear estación.
- Probar login, obra asignada, estación, nota, foto, ronda, punto, lectura e
  histórico.
- Probar lectura offline, reinicio y sincronización idempotente.
- Registrar bloqueos sin arreglarlos durante la prueba, salvo bloqueo total.
- Evidencia de salida: jornada reproducible sin P0/P1 abiertos en el flujo.

### Puerta 2 — Observación de uso

Realizar una sesión con una obra y medir:

- tiempo hasta encontrar una estación;
- tiempo hasta reconocerla con memoria visual;
- tiempo hasta registrar una nota/foto;
- tiempo hasta registrar una lectura;
- errores, dudas, pasos sobrantes y acciones ignoradas.

Evidencia de salida: informe `F5_HALLAZGOS_<fecha>.md` con top de fricciones.

### Puerta 3 — Entrevistas de problema

Realizar 5–8 conversaciones de 15–20 minutos con perfiles comparables. No
empezar enseñando la app. Preguntar por el último trabajo real:

1. ¿Qué tuvieron que medir o revisar?
2. ¿Dónde guardaron las fotos, notas y referencias?
3. ¿Qué se perdió, duplicó o costó encontrar?
4. ¿Qué herramientas usaron y qué parte quedó fuera?
5. ¿Qué requisito impediría confiar en una app nueva?

Después se puede enseñar un prototipo o build neutral y pedir una tarea
concreta, no una opinión general.

Evidencia de salida: matriz anonimizada con problema, frecuencia, alternativa,
impacto, interés en probar y objeción principal.

### Puerta 4 — Decisión de producto

Clasificar cada oportunidad:

- **Ahora:** problema repetido, solución pequeña y necesario para el piloto.
- **Después:** problema real, pero requiere modelo o integración mayor.
- **Fuera:** idea atractiva sin frecuencia, comprador o evidencia suficiente.

Solo si una oportunidad aparece repetida y la prueba muestra mejora se abre el
rediseño del croquis de prismas o la siguiente función técnica.

## Dónde pedir opinión profesional

Prioridad recomendada:

1. Cinco conversaciones directas con compañeros y topógrafos de otros equipos.
2. [r/Surveying en Reddit](https://www.reddit.com/r/Surveying/), para preguntas
   abiertas sobre flujos de campo y software.
3. [RPLS.com, antes SurveyorConnect](https://rpls.com/forums/), comunidad
   profesional internacional de land surveying y geomática.
4. [COIGT](https://www.coigt.com/), para localizar actividades y contactos
   profesionales en España. No usar directorios de colegiados para campañas
   comerciales no solicitadas.
5. [Foro de topografía de ConstruAprende](https://www.construaprende.com/foros/viewforum.php?f=34),
   para una segunda ronda en español.

Las comunidades sirven para descubrir patrones, no para validar por número de
comentarios. Una respuesta de internet no sustituye observar a alguien
trabajando.

## IA: uso recomendado y límites

Usar un [Proyecto de ChatGPT](https://help.openai.com/es-419/articles/10169521-using-projects-in-chatgpt)
para mantener juntos estrategia, entrevistas anonimizadas, capturas neutras,
competidores y decisiones. Usar [Investigación profunda](https://help.openai.com/es-419/articles/10500283-deep-research)
para comparar documentación pública de QField, Survey123, Leica, Trimble y
comunidades profesionales con enlaces verificables.

La IA sí puede:

- convertir entrevistas en una matriz común;
- detectar contradicciones y supuestos débiles;
- comparar funciones y costes publicados;
- proponer preguntas de entrevista;
- resumir fricciones por severidad.

La IA no puede demostrar por sí sola:

- que los topógrafos pagarían;
- que abandonarían WhatsApp, Excel o el software del instrumento;
- que una función es necesaria en obra;
- que el modelo de negocio funciona.

No subir nombres de obras, clientes, códigos reales, credenciales, tokens,
contraseñas ni fotografías identificables. Para entrevistas y demos usar datos
inventados.

## Benchmark mínimo a observar

- **QField:** referencia de formularios, mapas, fotos y trabajo offline.
- **Survey123:** referencia de captura form-centric, fotos, ubicación, análisis
  y online/offline.
- **Leica/Trimble:** referencia de integración con instrumentos, flujos de
  medición, datos de campo y oficina.
- **Excel/WhatsApp/papel:** referencia real de sustitución, aunque no sean
  productos competidores.

La pregunta de TopoField no es “¿tenemos más funciones?”. Es “¿qué pérdida de
contexto sigue sin resolverse bien en equipos pequeños y podemos resolverla
con menos fricción?”.

## Criterio de decisión

No abrir una nueva fase técnica hasta tener:

- una tarea repetida por al menos tres entrevistados;
- una fricción observada en campo;
- una solución que pueda probarse en una build pequeña;
- una métrica de mejora;
- una razón clara para que el encargado permita probarla.

