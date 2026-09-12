<!-- doc-status
estado: vivo
rol: field-plan
verificado: 2026-09-12
-->

# TopoField Operativo: Reactivación 2026-09-12

## Decisión de producto

TopoField se reactiva como libreta operativa para campañas manuales de
auscultación: saber qué trabajo toca, reconocer referencias, registrar lo
observado, dejar evidencia y mostrar qué zona quedó terminada. No sustituye el
controlador de la estación total, el software de nivelación ni el análisis
especializado del fabricante.

La ventaja que se debe validar es la continuidad entre campo, supervisor y
entrega. Survey123, QField, Mergin Maps, Fulcrum y las plataformas de
monitorización de fabricantes demuestran que formularios, fotos, mapas y
offline son expectativas razonables; no demuestran por sí solos demanda o
disposición de pago para TopoField. La validación sigue siendo una jornada
observada y entrevistas con profesionales.

## Implementado localmente en este bloque

- Permiso de obra `read/write` derivado de la membresía activa. Se mantienen
  `admin`, `topografo` y `visitante`; `supervisor` es un rol global autenticado
  de consulta, siempre limitado por membresías activas de solo lectura.
- El backend y el móvil separan consultar de modificar. El backend valida el
  proyecto real del recurso y no confía en un `projectId` inventado por el
  cliente.
- Parte de finalización de zona idempotente con `clientRequestId`, estados
  `partial`, `completed` y `blocked`, conteos calculados y motivos pendientes.
- El parte usa el outbox existente para sobrevivir a pérdida de cobertura y
  reinicio; una respuesta del servidor es la única que cuenta como recibida.
- La consulta supervisora en móvil puede abrir una ronda, revisar sus puntos,
  leer el histórico recibido con sus evidencias fotográficas y consultar el
  resumen, pero no muestra controles de escritura para una membresía `read`.
- El resumen puede preparar una entrega autenticada en `CSV` o `XLSX` y abrir
  la hoja nativa de compartir. La aplicación no envía el archivo por su cuenta
  ni lo marca como entregado o revisado: esa confirmación sigue siendo manual.
- La exportación exige permiso efectivo `write`. Una cuenta supervisora con
  membresía `read` puede consultar ronda, puntos, histórico y partes recibidos,
  pero no puede generar ni compartir una exportación.
- Formularios iniciales para testigo fotográfico, fisurómetro digital,
  potenciómetro con pares amarillo-azul, amarillo-marrón y azul-marrón, y
  tipos explícitos para clinómetro/cinta sin afirmar que el protocolo esté
  cerrado.
- Catálogo genérico de instrumentos preparado sin copiar datos de un cliente
  o empleador.

## Cobertura de equipo

| Equipo/procedimiento | Uso en TopoField | Límite actual |
|---|---|---|
| Leica TM60, Trimble S9/Access Monitoring | montaje, referencias, prismas, incidencias y constancia | no duplica el cálculo del controlador |
| Prismas Topcon y miniprismas Leica | identidad, fotos, referencias desde varias estaciones y notas | no deduce constantes |
| Leica LS10/LS15/DNA03 | itinerario, puntos, incidencias y fichero generado | `.cst`, `.asc` y TXT deben conservarse diferenciados |
| Testigo de metacrilato | foto identificada y fechada | no exige valor numérico |
| Fisurómetro digital | valor, unidad, referencia y evidencia | no interpreta el daño |
| Potenciómetro/multímetro | tres pares, unidad, escala y posición | no convierte resistencia a desplazamiento |
| Cinta de convergencia | referencias emparejadas y contexto de sección | formulario depende del modelo confirmado |
| Regla de peralte | referencias de ambos carriles y sección | protocolo pendiente de confirmar |
| Piezómetro, inclinómetro y clinómetro | inventario, contexto y evidencia inicial | no representa un perfil inclinométrico con un escalar |
| Regletas, hitos y arquetas | localización, foto, acceso y estado | sin afirmación de precisión no disponible |
| Linómetro y PicoNode | quedan documentados como referencias | no se inventa integración |

## No confundir estados

- `guardado localmente`: existe en SQLite/outbox del dispositivo;
- `sincronizando`: el dispositivo está intentando enviarlo;
- `recibido`: el servidor confirmó la operación;
- `entrega preparada`: se puede compartir manualmente;
- `entrega confirmada`: Erick confirmó fuera de la app que se entregó;
- `revisión técnica`: un responsable revisó el contenido.

El supervisor solo ve la información recibida por servidor y su fecha de
actualización. Una foto no prueba una medición; un parte parcial no cierra una
ronda; una lectura fuera de umbral es apoyo operativo y no una alerta
certificada de seguridad.

## Validación Galaxy completada el 12-09-2026

La release local `versionCode=4` se instaló en el Galaxy `SM-S938B`, serial
`R5CY21X6FLE`, con `adb install -r`, cuyo resultado literal fue `Success`.

Con la cuenta supervisora se verificó en pantalla:

- Perfil: `Supervisor` y correo `supervisor-piloto@topofield.local`.
- Obras: solo la obra QA autorizada.
- Obra: aviso literal de consulta supervisora y acciones de escritura
  desactivadas.
- Rondas: `E2E-Galaxy-20260731-Atc` abrió correctamente.
- Punto: aparece como `Consulta` y sin formulario de captura.
- Histórico: se muestran lecturas recibidas (`7 mm` y `5 mm`) y una evidencia
  asociada.
- Reinicio: tras `force-stop` y reapertura la app volvió a abrir dentro de la
  obra autorizada, sin mostrar `Sin sesión`.

La validación supervisora está cerrada. No se borró la cuenta temporal ni se
modificaron datos remotos durante esta prueba.

## Pendiente antes de declarar el bloque operativo

1. Validar con una cuenta operadora autorizada el recorrido online/offline:
   montaje, referencia, captura, incidencia, parte parcial, cierre, reinicio,
   reconexión e idempotencia.
2. Confirmar con datos autorizados el formato de exportación y el canal de
   entrega; no enviar automáticamente por WhatsApp o correo.

Las migraciones `022`, `023`, `024` y `026` ya están aplicadas en el proyecto
Supabase `topofield`. La cuenta `supervisor-piloto@topofield.local` tiene rol
global `supervisor` y una única membresía activa `read` en `campus-nord`.
Render sirve el merge commit `6a1b19fa9384e77797b956b6710af9f7a0ec7ff0` y
reconoce el rol supervisor. La instalación física y la consulta supervisora
están verificadas; queda la validación de escritura/offline con el operador.

## Próximas decisiones que no se deben adivinar

- modelo y procedimiento exacto de cinta de convergencia;
- valores/unidades oficiales de la regla de peralte;
- modelo y método de piezómetro, inclinómetro y linómetro;
- si el croquis fotográfico aporta más valor que el croquis orientativo;
- si el supervisor necesita exportación o solo consulta en la app.

## Evidencia técnica de este bloque

En el estado local de esta sesión: backend `tsc` limpio, móvil `tsc` limpio,
backend `78/78` tests, móvil `54/54` tests, paridad CSV/XLSX comprobada con
filas tomadas y pendientes, y `npm run docs:check` sin errores.
La fuente y la release Android quedan en `versionCode=4`; el AAB y el APK
universal están firmados y verificados con `CN=TopoField Android Release`.
Estos resultados se complementan con la validación física supervisora en
Galaxy descrita arriba. La entrega privada de fotos sigue pendiente: las
lecturas exponen el `public_url` heredado del contrato actual y este bloque no
lo convierte en una URL firmada ni modifica Storage.
