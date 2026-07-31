# Fase 3 móvil: rondas de auscultación

**Fecha:** 2026-07-31  
**Rama:** `codex/phase-3-mobile-monitoring`  
**Alcance:** `apps/mobile`, sin cambios de backend, migraciones ni Supabase.

## Decisión offline

Las lecturas se implementan como offline-first. Cada intento genera un
`clientRequestId`; con conectividad se intenta el POST para obtener el umbral
de inmediato y, sin red o ante un error transitorio, se persiste en SQLite con
`entity_type = 'medicion'`. El sync engine reutiliza ese UUID al recuperar
conexión.

Se reutiliza `medicion` porque ya es un valor válido en el CHECK de la outbox.
Así no se recrea ni transforma la tabla SQLite ya instalada en dispositivos.

## Pantallas implementadas

- Entrada desde el detalle de obra: `Rondas de auscultación`.
- Lista de rondas con filtros por estado y alta de ronda.
- Detalle de ronda con conteo de puntos pendientes/tomados.
- Selección de punto de control e instrumento para una ronda.
- Captura de lectura numérica o textual, unidad y notas.
- Feedback inmediato de `normal`, `warning`, `alarm` o `unknown` cuando el
  backend responde; feedback pendiente cuando la lectura queda en outbox.
- Lista, alta, histórico y activación/desactivación de puntos de control.
- Restricción de escritura en interfaz para visitante; solo `admin` y
  `topografo` ven las acciones mutables.

Los instrumentos visibles son exactamente: `digital_level`, `piezometer`,
`distometer`, `linometer`, `inclinometer` y `cant_rule`. La estación total no
aparece en este flujo.

## Límite de contrato

La tabla `reading_attachments` existe, pero el backend no expone un endpoint
para crear ni vincular adjuntos. No se implementó una foto falsa en
`rawPayload`: la foto opcional queda pendiente de un endpoint backend que
guarde el adjunto y permita sincronizarlo de forma trazable.

## Verificación literal

```text
npx tsc --noEmit --project apps/mobile/tsconfig.json
Exit code: 0

npm run test --workspace apps/mobile -- --runInBand
Test Suites: 4 passed, 4 total
Tests:       30 passed, 30 total
Snapshots:   0 total

npx expo export --platform android --output-dir C:\Users\guill\AppData\Local\Temp\topofield-phase3-export
Android Bundled 20784ms node_modules\expo-router\entry.js (1978 modules)
Exported: C:\Users\guill\AppData\Local\Temp\topofield-phase3-export
```

## Bloqueo de integración pública

La configuración móvil actual apunta a:

```text
https://la-libreta-del-peon-1.onrender.com/api/v1
```

La comprobación sin credenciales del endpoint de rondas devolvió:

```text
ROUNDS_WITHOUT_AUTH_STATUS=404
```

Una ruta desplegada exigiría autenticación y devolvería `401` sin bearer. Por
tanto Render todavía no contiene las rutas Express de Fase 3. Supabase tiene
el esquema, pero no sustituye el despliegue del backend Express que consume el
móvil.

## Próximo paso

1. Publicar el backend de Fase 3 en Render o iniciar el backend local y usar
   `adb reverse` para QA.
2. Ejecutar E2E en Galaxy: crear ronda/punto, enviar lectura online, repetir
   en modo avión, cerrar/reabrir y confirmar una sola fila por
   `client_request_id`.
3. Añadir el endpoint de `reading_attachments` antes de ofrecer foto en la
   captura.
