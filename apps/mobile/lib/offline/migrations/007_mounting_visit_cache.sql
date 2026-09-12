-- Migration 007: persist mounting visits by technical session and station.
-- Pending local visits are merged with the server list until the outbox syncs.
CREATE TABLE IF NOT EXISTS mounting_visit_cache (
  cache_key TEXT NOT NULL,
  station_id TEXT NOT NULL,
  visits_json TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  PRIMARY KEY (cache_key, station_id)
);
