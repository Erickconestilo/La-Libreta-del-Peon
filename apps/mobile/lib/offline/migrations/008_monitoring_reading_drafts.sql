-- Documentation copy of the local SQLite migration.
-- Applied by apps/mobile/lib/offline/database.ts, never by Supabase.
CREATE TABLE IF NOT EXISTS monitoring_reading_drafts (
  session_id TEXT NOT NULL,
  round_point_id TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (session_id, round_point_id)
);
