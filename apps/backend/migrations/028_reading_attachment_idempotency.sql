-- Refuerza la idempotencia de adjuntos de lecturas ante reintentos
-- concurrentes. NO aplicar en Supabase sin autorización explícita.
--
-- La API ya evita duplicados en el flujo secuencial, pero un SELECT seguido
-- de INSERT no es suficiente si dos reintentos llegan a la vez. Esta
-- migración no borra ni modifica filas: si existen duplicados históricos,
-- falla deliberadamente para que se revisen antes de crear el índice.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM reading_attachments
    GROUP BY reading_id, storage_path
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot add reading attachment idempotency index while duplicate reading_id/storage_path rows exist';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_attachments_reading_storage
  ON reading_attachments(reading_id, storage_path);
