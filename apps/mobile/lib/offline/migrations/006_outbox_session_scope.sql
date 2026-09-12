-- Migration 006: bind every new outbox operation to the local technical session.
-- Existing rows are quarantined because their original account cannot be
-- determined safely after an app upgrade.
ALTER TABLE outbox ADD COLUMN session_id TEXT NOT NULL DEFAULT '__unassigned__';

UPDATE outbox
SET session_id = '__unassigned__'
WHERE session_id IS NULL OR trim(session_id) = '';

CREATE INDEX IF NOT EXISTS idx_outbox_session_status_created
  ON outbox(session_id, status, created_at ASC);
