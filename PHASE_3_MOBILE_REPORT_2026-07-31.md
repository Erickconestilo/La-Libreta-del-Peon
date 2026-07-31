# Fase 3 móvil: rondas de auscultación

**Fecha:** 2026-07-31  
**Ramas:** `codex/phase-3-mobile-monitoring` (fusionada) y `codex/phase-3-reading-attachments` (en curso)
**Alcance actualizado:** móvil y contrato backend de adjuntos, sin migraciones ni cambios directos en Supabase.

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

## Foto de lectura

El endpoint `POST /api/v1/round-points/:roundPointId/readings/:readingId/attachments`
crea la fila de `reading_attachments` solo si la lectura pertenece al punto de
ronda y al alcance de obra del actor. La foto se sube antes por el flujo de
firmado existente, usando una ruta determinista por lectura e intento. El
móvil conserva la imagen en almacenamiento persistente y la trata como una
segunda operación de outbox, de modo que una lectura offline y su foto pueden
sobrevivir al reinicio sin usar Base64 ni `rawPayload`.

## Verificación literal

```text
npx tsc --noEmit --project apps/mobile/tsconfig.json
Exit code: 0

npm run test --workspace apps/mobile -- --runInBand
Test Suites: 4 passed, 4 total
Tests:       31 passed, 31 total
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
ROUNDS_ANON_STATUS=404
```

Una ruta desplegada exigiría autenticación y devolvería `401` sin bearer. Por
tanto Render todavía no contiene las rutas Express de Fase 3. Supabase tiene
el esquema, pero no sustituye el despliegue del backend Express que consume el
móvil.

## Próximo paso

1. Disparar el redeploy de Render: GitHub ya contiene `main` hasta `1abf2a1`,
   pero Render sigue sirviendo `2fd2eb2`.
2. Ejecutar E2E en Galaxy: crear ronda/punto, enviar lectura online con foto, repetir
   en modo avión, cerrar/reabrir y confirmar una sola fila por
   `client_request_id` y una fila de `reading_attachments` por foto.
