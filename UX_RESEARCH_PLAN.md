<!-- doc-status
estado: vivo
verificado: 2026-08-02
-->

# UX_RESEARCH_PLAN.md — Plan de Investigación UX y Usabilidad

## Objetivo
Validar si TopoField sirve de verdad en contexto de obra y convertir los hallazgos en decisiones de producto y desarrollo. Este documento evita que “se ve bien” sustituya a “se usa bien”.

## Hipótesis de trabajo
1. Un usuario de campo puede entrar a una obra y encontrar una estación concreta sin ayuda larga.
2. La memoria visual aporta valor solo si las fotos y notas se entienden rápido.
3. El flujo de foto fallará en adopción si hay dudas sobre qué pasó, dónde quedó guardada o cómo volver.
4. La app tendrá mejor adopción si el usuario puede actuar desde pocas pantallas y pocas decisiones.
5. Los roles deben sentirse claros en la interfaz, no solo existir en backend.

## Tareas críticas a validar
- entrar a una obra;
- localizar una estación;
- revisar foto principal y memoria visual;
- añadir una foto útil;
- editar una nota;
- abrir ubicación externa;
- identificar qué puede hacer según su rol;
- consultar prismas y croquis sin confusión.
- entrar a una ronda de auscultación;
- encontrar puntos pendientes;
- registrar una lectura;
- entender si una lectura quedó pendiente, confirmada o con alerta;
- revisar errores de sincronización cuando haya offline.

## Condiciones reales de prueba
Las pruebas deben intentar parecerse al uso real:
- móvil Android real;
- luz exterior o entorno no ideal;
- cobertura variable si se puede reproducir;
- tiempo limitado;
- persona que no ha visto el flujo explicado paso a paso justo antes.

## Muestra mínima recomendada
- 3 a 5 compañeros de trabajo para primera ronda.
- 1 admin o encargado para validar lectura de valor operativo.
- Repetir con al menos 2 personas tras los primeros arreglos importantes.

## Escenarios mínimos
### Escenario 1 — Encontrar estación
- abrir la app;
- entrar en una obra concreta;
- encontrar una estación dada;
- confirmar visualmente que es la correcta.

### Escenario 2 — Memoria visual
- revisar si la memoria visual de una estación sirve para reconocerla;
- añadir una foto nueva o confirmar que la actual es válida.

### Escenario 3 — Nota rápida
- editar o añadir una nota útil;
- confirmar si el usuario entiende cuándo se guardó.

### Escenario 4 — Ubicación externa
- abrir el enlace externo de mapa;
- confirmar que entiende qué aplicación se abrirá y por qué.

### Escenario 5 — Permisos por rol
- comprobar si el usuario distingue qué puede ver y qué puede modificar.

### Escenario 6 — Ronda de auscultación
- entrar a una obra;
- abrir una ronda activa;
- localizar el siguiente punto pendiente;
- registrar una lectura;
- comprobar si entiende el estado final de la lectura.

### Escenario 7 — Catálogo de códigos
- seleccionar o consultar un código de itinerario;
- confirmar si el topógrafo lo puede trasladar al instrumento sin escribirlo manualmente;
- detectar errores de nomenclatura o confusión por zona/color.

## Métricas a recoger
- tiempo hasta completar la tarea;
- número de errores;
- bloqueos totales;
- dudas verbales repetidas;
- pasos de más;
- elementos ignorados;
- necesidad de ayuda del observador;
- percepción de esfuerzo o confusión.

## Plantilla de hallazgo
Cada hallazgo debe registrarse con este formato:

- `id`: identificador corto;
- `fecha`;
- `dispositivo`;
- `rol`;
- `escenario`;
- `problema observado`;
- `impacto`;
- `frecuencia`;
- `evidencia`;
- `causa probable`;
- `propuesta de cambio`;
- `severidad`.

## Severidad
- `P0`: bloquea tarea crítica o pone en duda el piloto.
- `P1`: genera error frecuente o pérdida clara de confianza.
- `P2`: fricción importante pero con salida.
- `P3`: mejora deseable sin impacto fuerte.

## Reglas de decisión
- Un hallazgo repetido por más de una persona no se trata como anécdota.
- Un problema de flujo crítico pesa más que una preferencia visual aislada.
- No se abre una mejora grande solo porque “queda mejor” si no resuelve un hallazgo relevante.
- Los hallazgos deben convertirse en backlog con propietario, prioridad y criterio de cierre.

## Salida esperada de cada ronda
- top 10 fricciones ordenadas;
- lista de tareas bloqueadas;
- lista de mejoras rápidas;
- lista de ideas fuera de fase;
- decisión explícita:
  - corregir antes del piloto;
  - aceptar para piloto;
  - posponer.

## Criterios de usabilidad para el MVP
- usuario nuevo entra a una obra sin explicación larga;
- encuentra una estación en menos de un minuto;
- entiende el valor de la memoria visual;
- sabe cuándo una acción falló;
- no se pierde entre pantallas;
- percibe la app como ligera y práctica.

## Cadencia recomendada
- una ronda breve antes de cerrar cada build importante para piloto;
- síntesis de hallazgos el mismo día;
- revisión quincenal del backlog UX con producto y desarrollo.
