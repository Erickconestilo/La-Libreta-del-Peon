# Diseño del Motor Offline — TopoField Fase 2

**Fecha:** 2026-07-26  
**Estado:** DISEÑO (implementación pendiente)  
**Referencia:** MEMORIA.md §8, Plan Maestro Fase 2

---

## Objetivo

Permitir que TopoField funcione completamente sin conexión (modo avión) con sincronización automática al recuperar conectividad, garantizando:
- Sin pérdida de datos
- Sin duplicados (idempotencia via `client_request_id`)
- Resolución de conflictos explícita
- Estados claros: local → pending → syncing → synced | error | conflict

---

## Arquitectura

### 1. SQLite Versionado Local

**Base de datos:** `topofield.db` (expo-sqlite)

**Tablas principales:**

```sql
-- Control de esquema
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Outbox persistente (cola de escritura)
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY, -- UUID local
  client_request_id TEXT NOT NULL UNIQUE, -- UUID para idempotencia
  entity_type TEXT NOT NULL, -- 'station_message', 'incident', 'station_photo', etc.
  operation TEXT NOT NULL, -- 'insert', 'update', 'delete'
  payload TEXT NOT NULL, -- JSON del objeto a sincronizar
  status TEXT NOT NULL DEFAULT 'pending', -- pending | syncing | synced | error | conflict
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at TEXT, -- timestamp de sincronización exitosa
  last_sync_attempt_at TEXT, -- último intento
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  conflict_data TEXT -- JSON con datos del servidor en caso de conflicto
);

CREATE INDEX idx_outbox_status ON outbox(status) WHERE status IN ('pending', 'error');
CREATE INDEX idx_outbox_entity_type ON outbox(entity_type);

-- Cache local de datos leídos (opcional, para queries offline)
-- Solo para entidades que necesitan búsqueda offline
-- Por ahora: omitido, se cachea en memoria via react-query
```

**Migraciones versionadas:**
- `lib/offline/migrations/001_initial_schema.sql`
- `lib/offline/migrations/002_...sql` (futuras)
- Aplicadas secuencialmente al abrir la app via `applyMigrations()`

### 2. Estados y Transiciones

```
LOCAL (solo en RAM)
  ↓ onSubmit
PENDING (en outbox)
  ↓ conectividad detectada
SYNCING (intento en progreso)
  ↓ éxito → SYNCED
  ↓ error red → PENDING (retry con backoff)
  ↓ error 409 conflict → CONFLICT (requiere intervención manual)
  ↓ error 422 validation → ERROR (no retry automático)
```

**Políticas de retry:**
- Errores de red (timeout, no connection): backoff exponencial hasta 5 minutos
- Errores 5xx servidor: backoff exponencial hasta 30 minutos
- Errores 4xx (excepto 409): no retry automático, marcar ERROR
- Conflictos 409: marcar CONFLICT, mostrar UI de resolución

### 3. Client Request ID (Idempotencia)

Cada mutación genera un `client_request_id` UUID v4 único ANTES de escribir en outbox.

**Backend debe:**
- Aceptar header `X-Client-Request-ID` o campo `clientRequestId` en payload
- Deduplicar: si ya procesó ese ID, retornar 200 con el resultado original (no 409)
- Almacenar mapping `client_request_id → server_id` por 30 días mínimo

**Ejemplo:**
```typescript
const clientRequestId = crypto.randomUUID();
await outbox.enqueue({
  entityType: 'station_message',
  operation: 'insert',
  payload: { ...message, clientRequestId },
  clientRequestId,
});
```

### 4. Detección de Conectividad

**Estrategias combinadas:**
- `expo-network`: estado de red (wifi, cellular, none)
- Heartbeat cada 30s: HEAD /api/health (timeout 5s)
- Retry inmediato al cambio wifi/cellular → conectado
- Flush manual via botón "Sincronizar ahora"

**No usar:**
- `navigator.onLine` (poco fiable en móvil)
- Polling agresivo (consume batería)

### 5. Resolución de Conflictos

**Tipos de conflicto:**
- **Escritura concurrente:** Otro usuario modificó el mismo registro
- **Borrado remoto:** El recurso fue eliminado en servidor
- **Validación fallida:** Datos locales violan constraints del servidor

**UI de resolución:**
- Pantalla `/offline/conflicts` (lista de conflictos pendientes)
- Por cada conflicto: mostrar diff local vs. servidor
- Opciones: "Usar mío" | "Usar servidor" | "Resolver manualmente"
- Botón "Descartar cambio local" (elimina de outbox sin sincronizar)

---

## Implementación por Slices Verticales

**Principio:** Un slice completo (modelo + outbox + sync + UI) funcionando de principio a fin antes de añadir más entidades.

### Slice 1 (MVP): Station Message

**Razón de elección:**
- Entidad simple (texto + FK station_id)
- No tiene attachments ni dependencias complejas
- Ya existe en backend (`station_messages` tabla)
- Ya existe hook (`use-station-messages.ts`)

**Checklist del slice:**
1. [ ] Migración SQLite 001 (tabla outbox)
2. [ ] `lib/offline/outbox.ts`: API de enqueue/flush/getAll
3. [ ] `lib/offline/sync-engine.ts`: lógica de sincronización
4. [ ] `hooks/use-station-messages.ts`: modificar POST para usar outbox
5. [ ] `lib/offline/__tests__/outbox.test.ts`: tests de enqueue/dequeue
6. [ ] `lib/offline/__tests__/sync-engine.test.ts`: tests de retry/conflict
7. [ ] Probar:
   - Crear mensaje en modo avión
   - Cerrar y reabrir app (persiste en outbox)
   - Activar conexión → sincroniza automáticamente
   - Verificar sin duplicados (mismo client_request_id)

### Slices futuros (orden sugerido):
2. Incident (añade attachments/fotos)
3. Station Photo (añade upload de archivos grandes)
4. Mediciones de faenas (añade batch sync de muchos registros)

---

## Criterio de Salida de Fase 2

Fase 2 se considera CERRADA cuando:
1. ✅ Test runner instalado en apps/mobile (jest + jest-expo)
2. ✅ Diseño documentado (este archivo)
3. ✅ Migración SQLite 001 creada y aplicable
4. ✅ Outbox API implementada (enqueue/flush/getAll)
5. ✅ Sync engine básico implementado (retry con backoff)
6. ✅ Slice 1 (Station Message) funciona de principio a fin:
   - Crear mensaje en modo avión → persiste en outbox
   - Cerrar/reabrir app → mensaje sigue en outbox
   - Activar conexión → sincroniza sin duplicados
   - Tests pasando

**Bloqueadores para Fase 3:**
- Fase 3 (pantallas de faenas) está BLOQUEADA hasta que Fase 2 esté cerrada
- No se pueden construir pantallas "Hoy"/"Semana"/faenas sin motor offline funcional
- Razón: la promesa central de TopoField es funcionar sin cobertura

---

## Notas de Implementación

### Expo SQLite Sync API

Usar `expo-sqlite` versión sync (no async/legacy):

```typescript
import { openDatabaseSync } from 'expo-sqlite';

const db = openDatabaseSync('topofield.db');

// Leer
const rows = db.getAllSync<OutboxRow>('SELECT * FROM outbox WHERE status = ?', ['pending']);

// Escribir
db.runSync('INSERT INTO outbox (id, client_request_id, entity_type, ...) VALUES (?, ?, ?, ...)', 
  [id, clientRequestId, entityType, ...]);

// Transacción
db.withTransactionSync(() => {
  db.runSync('UPDATE outbox SET status = ? WHERE id = ?', ['syncing', id]);
  // ... sync logic
  db.runSync('UPDATE outbox SET status = ?, synced_at = ? WHERE id = ?', ['synced', now, id]);
});
```

### Client Request ID en Backend

**Pendiente:** modificar backend para aceptar `clientRequestId` y deduplicar.

Ejemplo en `apps/backend/src/controllers/station-messages.controller.ts`:

```typescript
// POST /api/projects/:projectId/stations/:stationId/messages
const clientRequestId = req.body.clientRequestId;
if (clientRequestId) {
  const existing = await checkIfAlreadyProcessed(clientRequestId);
  if (existing) {
    return res.status(200).json(existing); // idempotente
  }
}
// ... procesar normalmente y guardar clientRequestId → server_id
```

### Manejo de Fotos Offline

**Problema:** Fotos grandes no caben en payload JSON.

**Solución:**
1. Guardar foto en `FileSystem.documentDirectory + 'pending/' + uuid + '.jpg'`
2. Enqueue en outbox con `payload.localPhotoPath = 'pending/...'`
3. Al sincronizar: leer archivo, hacer upload, actualizar outbox
4. Al confirmar sync: eliminar archivo temporal

---

## Referencias

- MEMORIA.md §8 (Fase 2 corregida)
- Plan Maestro §8 (motor offline como prerequisito)
- `shared/types.ts`: tipo `OfflineQueueStatus`, `OfflineQueueEntityType`
- Backend: `apps/backend/src/models/*.model.ts` (para saber qué campos enviar)
