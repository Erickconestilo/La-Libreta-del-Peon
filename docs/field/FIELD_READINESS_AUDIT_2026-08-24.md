<!-- doc-status
estado: vivo
verificado: 2026-08-24
-->

# Auditoría de preparación de TopoField para campo

## Alcance

Revisión de solo lectura para decidir si TopoField puede seguir usándose en
campo antes de añadir nuevas funciones. Se revisaron la app móvil, el backend,
auth/sesión, permisos por obra, offline/outbox, rondas de auscultación,
estaciones, prismas, fotos, documentación, Render, Supabase y el Galaxy
`SM-S938B`.

No se modificó código de negocio, no se aplicaron migraciones, no se tocó
Supabase, Render ni Play Store, y no se crearon rondas, estaciones ni datos de
producción durante esta auditoría.

## Resultado ejecutivo

La base técnica está en condiciones de una **estabilización corta antes del
uso de campo**, pero no conviene abrir nuevas funciones el jueves sin cerrar
primero el flujo de alta y una prueba guiada con una obra asignada.

La app no está bloqueada por un fallo general de login, backend o aislamiento
entre obras. El login técnico se confirmó en el Galaxy y el backend local pasa
sus pruebas. El bloqueo que el usuario experimentó al crear una estación tiene
una causa funcional concreta: el formulario permite seleccionar `Sin obra`, pero
el backend rechaza una estación sin obra para un `topografo` con `403
PROJECT_REQUIRED`. La pantalla debe impedir esa combinación o seleccionar una
obra válida automáticamente.

Las rondas no aparecen porque no hay rondas cargadas en esa obra. La pantalla
ofrece crear la primera ronda cuando el usuario está dentro de una obra que
forma parte de sus membresías. Eso es falta de datos iniciales, no un `404` ni
un fallo de la ruta.

## Hallazgos prioritarios

### P1 — El alta de estación permite una combinación que el backend rechaza

Evidencia:

- El móvil presenta `Sin obra` en `apps/mobile/app/station/new.tsx`.
- El backend llama a `assertProjectAccess(request.user, null)` para un
  topógrafo en `apps/backend/src/controllers/stations.controller.ts`.
- `assertProjectAccess` responde `403 PROJECT_REQUIRED` cuando ese rol no tiene
  un `projectId`.

Impacto: en campo el usuario puede rellenar el formulario correctamente y
recibir un error que no explica que debe elegir una obra. Es la fricción más
urgente porque impide una tarea básica.

Decisión recomendada: para `topografo`, quitar `Sin obra` de la UI y exigir una
obra asignada; para `admin`, mantener la opción si sigue siendo necesaria.
Añadir una prueba de UI o de la función de construcción del payload para que
esta regresión no vuelva.

### P1 — El diagnóstico de soporte aún no está desplegado

Evidencia literal de producción el 24-08-2026:

```text
{"commit":"b5de27f06c82d1c96a0ecb4612ca063a840b3cbe","status":"ok"}
```

La rama local `codex/login-diagnostics` contiene `X-Request-ID` y pruebas
asociadas, pero Render sigue sirviendo `b5de27f`. Por tanto, el móvil local
puede mostrar un código de soporte, pero ese código todavía no se puede
correlacionar de forma fiable con los logs de producción hasta publicar el
commit correspondiente.

La ruta protegida sí tiene el comportamiento esperado:

```text
HTTP/1.1 401 Unauthorized
{"data":null,"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
```

No se publica en esta auditoría. Antes de publicar hay que integrar la rama,
verificar el diff pendiente de `apps/mobile/package.json` y hacer una prueba
de release controlada.

### P1 — El offline no cubre toda la preparación de una obra

El outbox probado cubre mensajes de estación y lecturas de auscultación,
incluyendo `clientRequestId`, reintento e idempotencia. La documentación del
motor indica que la ronda se prepara con conectividad y la lectura se captura
offline.

Consecuencia operativa: antes de entrar en una zona sin cobertura hay que
cargar la obra, crear o revisar la ronda y añadir sus puntos de control. No se
debe prometer que una obra completamente nueva puede prepararse desde cero sin
red.

Esto no exige ampliar el offline antes del jueves. Exige un checklist de
preparación y una señal visible cuando la ronda aún no está descargada.

### P2 — Supabase Free sigue siendo un riesgo operativo

El advisor de seguridad no muestra hallazgos críticos. Mantiene este aviso:

- `auth_leaked_password_protection`: `WARN`, protección contra contraseñas
  filtradas desactivada.

La protección requiere un plan superior y la decisión vigente es permanecer en
Free. Además, el proyecto ya se pausó por inactividad en una sesión anterior.
Antes de una jornada hay que comprobar que el proyecto está activo y hacer una
petición de salud. No se cambia el plan desde código.

### P2 — El croquis de prismas es útil, pero todavía es esquemático

El componente actual dibuja una vista polar usando el último ángulo horizontal
y distancia observados. Tiene zoom, desplazamiento, selección, colores de
estado y ficha del prisma.

Limitaciones reales:

- No representa una posición planimétrica ni una orientación norte persistida.
- Solo dibuja prismas con observación válida de ángulo y distancia.
- Las etiquetas pueden acercarse entre sí cuando hay muchos prismas.
- No hay filtro visible por estado ni una lista sincronizada con el croquis.
- No distingue explícitamente entre una geometría calculada y una observación
  antigua.

Conclusión: no es un fallo que impida usar la ficha, pero sí una mejora de
producto importante. Debe rediseñarse después de observar un caso real y
confirmar qué referencia necesita el topógrafo: norte, estación, orientación,
PK, tramo o una imagen de croquis.

## Seguridad y backend

Se revisaron las rutas y controladores de proyectos, estaciones, prismas,
incidencias, mensajes, fotos, uploads, change logs y monitoring.

Comprobaciones positivas:

- El backend aplica `getActorProjectScope` en las familias con datos de obra.
- Las operaciones sobre recursos derivados validan primero la obra real del
  recurso, no solo el `projectId` enviado por el cliente.
- Las rutas de auscultación excluyen a `visitante` y tienen regresión de roles.
- Las pruebas de scope cubren separación entre obras y recursos anidados.
- No se detectó una nueva fuga evidente en la lectura estática.
- `npm audit --workspace apps/backend` devuelve 0 vulnerabilidades.
- El advisor de Supabase no reporta RLS desactivado ni otro hallazgo crítico.

Avisos de rendimiento de Supabase:

- Hay varias claves foráneas sin índice de cobertura, sobre todo en tablas de
  monitoring y usuarios de auditoría.
- Hay índices marcados como no usados.

Son avisos de optimización, no un bloqueo funcional para una jornada pequeña.
No se crean índices en producción dentro de esta auditoría.

## Sesión, login y build instalada

La sesión técnica fue verificada contra Supabase y Render, y el perfil del
Galaxy mostró la cuenta técnica activa. La release local quedó instalada en
`R5CY21X6FLE`.

Salida literal del dispositivo:

```text
List of devices attached
R5CY21X6FLE\tdevice

versionCode=1 minSdk=24 targetSdk=36
versionName=1.0.0
lastUpdateTime=2026-08-24 15:53:32
  firstInstallTime=2026-08-07 10:49:51
```

La cuenta QA y su contraseña temporal no se registran en este documento.

## Verificación automática

Resultados obtenidos en la rama `codex/login-diagnostics`:

```text
Backend build: exit 0
Backend tests: tests 55, pass 55, fail 0
Mobile TypeScript: exit 0, sin salida de error
Mobile tests: Test Suites 8 passed, Tests 38 passed, 0 failed
docs:check: 24 documentos revisados. Sin errores ni avisos.
npm audit backend: total 0 vulnerabilidades
```

Estado del árbol al finalizar la auditoría documental:

```text
 M MEMORIA.md
 M apps/mobile/package.json
```

La modificación de `apps/mobile/package.json` es previa y no se revierte.

## Plan de estabilización antes de añadir funciones

### Paso 1 — Cerrar el flujo mínimo de campo

1. Corregir el formulario de nueva estación para que un topógrafo no pueda
   enviar `Sin obra`.
2. Probar en el Galaxy: login explícito, obra asignada, crear estación con y
   sin GPS, guardar nota y abrir la estación.
3. Dentro de esa obra, crear una ronda de prueba, añadir un punto de control y
   registrar una lectura con red.
4. Repetir una lectura sin red, cerrar/reabrir la app y comprobar que el outbox
   la sincroniza una sola vez al recuperar conexión.
5. Registrar los seis escenarios de F5 con tiempo, error, bloqueo y decisión,
   sin añadir funcionalidades nuevas durante la prueba.

### Paso 2 — Hacer el flujo repetible

1. Publicar el commit de diagnóstico solo después de revisar el diff y el
   `package.json` pendiente.
2. Ejecutar un smoke test en Render: login, obra asignada, ronda, punto,
   lectura e histórico.
3. Añadir un checklist visible o documentado para preparar la obra antes de
   entrar en mala cobertura.
4. Mantener Supabase Free, pero comprobar estado activo antes de cada sesión.

### Paso 3 — Rediseñar el croquis de prismas

Se abre después del Paso 1, con datos de una estación real y un objetivo
concreto. Orden recomendado:

1. Definir referencia geométrica: norte/orientación, estación, PK o imagen.
2. Añadir lista y filtros por estado junto al dibujo.
3. Resolver colisiones de etiquetas y selección de muchos prismas.
4. Mostrar antigüedad de observación y advertir cuando el dibujo no representa
   una geometría actual.
5. Probarlo en una pantalla de móvil bajo sol y con prisas antes de añadir más
   instrumentos.

## Decisión de preparación

Recomendación: **sí, se puede seguir trabajando y preparar el jueves**, pero el
primer bloque debe ser la corrección de la selección de obra y una prueba
vertical de una obra asignada. No recomiendo empezar por el croquis ni por
nuevos instrumentos antes de comprobar ese flujo completo. El croquis es una
mejora válida, pero no debe ocultar el bloqueo de alta que ya se ha observado.

