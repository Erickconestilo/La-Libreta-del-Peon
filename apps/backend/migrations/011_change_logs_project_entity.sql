ALTER TABLE change_logs
DROP CONSTRAINT IF EXISTS change_logs_entity_type_check;

ALTER TABLE change_logs
ADD CONSTRAINT change_logs_entity_type_check
CHECK (entity_type IN ('station', 'prism', 'guide_entry', 'project'));
