-- Activa RLS en las 9 tablas creadas por la migracion 019 (monitoring_rounds),
-- que quedaron sin RLS a diferencia de las 37 tablas restantes del proyecto.
-- Politica identica a la usada en el resto de tablas de este proyecto
-- (verificado via pg_policies: "legacy deny all", anon+authenticated, ALL, false):
-- el backend conecta con DATABASE_URL directo (rol con BYPASSRLS), así que
-- esto no cambia el comportamiento de la API; bloquea el acceso publico via
-- la API REST de Supabase (PostgREST) con la anon key.
-- Ver MEMORIA.md, entrada 2026-07-30.

ALTER TABLE public.instrument_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy deny all" ON public.instrument_types
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.control_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy deny all" ON public.control_points
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.monitoring_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy deny all" ON public.monitoring_rounds
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.monitoring_round_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy deny all" ON public.monitoring_round_points
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.instrument_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy deny all" ON public.instrument_readings
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.reading_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy deny all" ON public.reading_attachments
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.control_point_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy deny all" ON public.control_point_thresholds
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.project_code_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy deny all" ON public.project_code_catalog
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.project_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy deny all" ON public.project_rules
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
