ALTER TABLE change_logs
DROP CONSTRAINT IF EXISTS change_logs_entity_type_check;

ALTER TABLE change_logs
ADD CONSTRAINT change_logs_entity_type_check
CHECK (entity_type IN ('station', 'prism', 'guide_entry'));

CREATE INDEX IF NOT EXISTS idx_change_logs_changed_at ON change_logs(changed_at DESC);
