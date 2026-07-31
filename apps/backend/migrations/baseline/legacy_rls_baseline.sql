-- SNAPSHOT DOCUMENTAL - NO APLICAR COMO MIGRACION
--
-- Extraído en modo solo lectura de Supabase `topofield` el 2026-07-31 desde
-- pg_policies. Estas políticas YA existen en producción. Ejecutar este archivo
-- sobre esa base fallará por nombres duplicados y no forma parte del historial
-- de migraciones aplicable. Sirve para reconstrucción/auditoría del estado RLS.
--
-- La consulta actual devolvió 24 tablas public con "legacy deny all", no las
-- 37 citadas en documentación antigua. No se inventan las 13 tablas ausentes.

CREATE POLICY "legacy deny all" ON public.capture_logs
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.change_logs
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.control_point_thresholds
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.control_points
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.guide_entries
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.incidents
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.instrument_readings
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.instrument_types
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.monitoring_round_points
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.monitoring_rounds
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.prism_observations
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.prisms
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.project_code_catalog
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.project_memberships
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.project_rules
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.projects
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.reading_attachments
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.schema_migrations
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.station_messages
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.station_photos
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.station_readings
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.stations
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.users
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "legacy deny all" ON public.work_sessions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
