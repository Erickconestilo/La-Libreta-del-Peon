-- F5 Mi jornada: prioridad explícita entre rondas asignadas.
-- Esta migración no se aplica automáticamente. Requiere autorización explícita.
-- No modifica las migraciones 019/020 ya aplicadas.

ALTER TABLE monitoring_rounds
  ADD COLUMN IF NOT EXISTS execution_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_monitoring_rounds_operator_queue
  ON monitoring_rounds(operator_id, round_date, execution_order, created_at)
  WHERE status IN ('draft', 'active');
