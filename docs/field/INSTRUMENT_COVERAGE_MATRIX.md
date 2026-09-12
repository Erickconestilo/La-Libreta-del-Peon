<!-- doc-status
estado: vivo
verificado: 2026-09-13
rol: inventory
-->

# Matriz De Cobertura De Instrumentos

Esta matriz separa tres cosas que no deben confundirse: que un instrumento
aparezca en el catálogo, que la aplicación pueda guardar una captura y que el
formulario represente el procedimiento técnico completo. La etiqueta
`confirmado` de esta tabla describe solo la cobertura del MVP indicada, no una
integración con el fabricante ni una validación metrológica.

| Instrumento | Cobertura móvil actual | Estado del protocolo en TopoField | Límite conocido |
|---|---|---|---|
| Nivel digital (`digital_level`) | Valor escalar, unidad, nota y foto opcional | Confirmado para captura genérica del MVP | No interpreta ficheros CST/ASC/TXT ni sustituye el análisis del equipo |
| Piezómetro (`piezometer`) | Valor escalar, unidad, nota y foto opcional | Provisional | Falta confirmar modelo, método y unidades de campo |
| Distanciómetro (`distometer`) | Valor escalar, unidad, nota y foto opcional | Provisional | No guarda todavía las referencias adicionales del procedimiento |
| Linómetro (`linometer`) | Valor escalar, unidad, nota y foto opcional | Provisional | Identificación y método pendientes |
| Inclinómetro (`inclinometer`) | Valor escalar, unidad, nota y foto opcional | Provisional | No representa un perfil ni lecturas por profundidad |
| Regla de peralte (`cant_rule`) | Valor escalar, unidad, nota y foto opcional | Provisional | No representa las referencias de ambos carriles |
| Fisurómetro testigo (`fissure_witness`) | Foto obligatoria, fecha y nota | Confirmado para evidencia fotográfica | No guarda un valor numérico inventado |
| Fisurómetro digital (`fissure_gauge`) | Valor escalar, unidad, nota y foto opcional | Confirmado para captura genérica del MVP | El procedimiento exacto y sus criterios siguen siendo externos |
| Potenciómetro (`potentiometer`) | Tres pares amarillo-azul, amarillo-marrón y azul-marrón, unidad, escala, posición y foto opcional | Confirmado para captura estructurada del MVP | No convierte resistencia en desplazamiento |
| Clinómetro (`clinometer`) | Valor escalar, unidad, nota y foto opcional | Provisional | Falta confirmar modelo y procedimiento |
| Cinta de convergencia (`convergence_tape`) | Valor escalar, unidad, nota y foto opcional | Provisional | No representa todavía par de referencias, sección, tensión ni temperatura |
| Estación total (`total_station`) | Flujo separado de prismas/observaciones | Fuera de este formulario | No se registra como lectura genérica de auscultación |

## Regla De Uso

Las capturas provisionales no se presentan como un protocolo certificado ni
como sustituto del controlador o del procedimiento del equipo. Se conservan
para no perder contexto cuando el campo necesite una anotación temporal, pero
la ampliación de cada formulario requiere confirmar primero el modelo, las
unidades, las referencias y la forma de cálculo. Los históricos existentes no
se reinterpretan.
