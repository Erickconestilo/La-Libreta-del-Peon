-- Añade client_request_id a station_messages para permitir idempotencia
-- real en la sincronización desde el outbox offline del móvil.
--
-- Sin esto, un reintento de red tras un timeout (el cliente no sabe si el
-- servidor procesó el mensaje o no) crea una fila duplicada en vez de
-- reconocer que ya se sincronizó.
--
-- Índice único parcial (WHERE client_request_id IS NOT NULL): las filas
-- antiguas o creadas fuera del outbox no llevan client_request_id (NULL),
-- y Postgres no considera NULL = NULL para efectos de UNIQUE, así que
-- conviven sin romper nada. Solo se exige unicidad cuando el cliente sí
-- manda uno.
ALTER TABLE station_messages
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_station_messages_client_request_id
  ON station_messages(client_request_id)
  WHERE client_request_id IS NOT NULL;
