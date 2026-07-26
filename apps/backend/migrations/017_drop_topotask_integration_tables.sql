-- =====================================================
-- Migración 017: Eliminar tablas de integración TopoTask
-- =====================================================
-- Contexto:
-- 4 tablas de integración con infraestructura externa (telegram, correo
-- operativo TopoTask) que no forman parte del core de TopoField.
-- ADR 001 y FASE_1_RECOMENDACIONES.md confirman descarte.
--
-- Verificaciones previas (2026-07-26):
-- - incidencias: 0 filas (COUNT(*) confirmado)
-- - incidencia_fotos: 0 filas (COUNT(*) confirmado)
-- - obra_destinatarios: 0 filas (COUNT(*) confirmado)
-- - envios_correo: 0 filas (COUNT(*) confirmado)
-- - No hay referencias en código TypeScript (grep confirmado)
--
-- Decisión: DROP de las 4 tablas sin pérdida de datos.
-- =====================================================

-- Verificación previa: confirmar que las 4 tablas están vacías
DO $$
DECLARE
  incidencias_count INTEGER;
  incidencia_fotos_count INTEGER;
  obra_destinatarios_count INTEGER;
  envios_correo_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO incidencias_count FROM public.incidencias;
  SELECT COUNT(*) INTO incidencia_fotos_count FROM public.incidencia_fotos;
  SELECT COUNT(*) INTO obra_destinatarios_count FROM public.obra_destinatarios;
  SELECT COUNT(*) INTO envios_correo_count FROM public.envios_correo;

  IF incidencias_count > 0 OR incidencia_fotos_count > 0 OR
     obra_destinatarios_count > 0 OR envios_correo_count > 0 THEN
    RAISE EXCEPTION 'Migración abortada: una o más tablas TopoTask contienen datos. incidencias: %, incidencia_fotos: %, obra_destinatarios: %, envios_correo: %',
      incidencias_count, incidencia_fotos_count, obra_destinatarios_count, envios_correo_count;
  END IF;

  RAISE NOTICE 'Verificación exitosa: las 4 tablas TopoTask están vacías (0 filas)';
END $$;

-- DROP de tablas en orden de dependencias (fotos depende de incidencias)
DROP TABLE IF EXISTS public.incidencia_fotos CASCADE;
DROP TABLE IF EXISTS public.incidencias CASCADE;
DROP TABLE IF EXISTS public.obra_destinatarios CASCADE;
DROP TABLE IF EXISTS public.envios_correo CASCADE;

-- Registro de eliminación para auditoría
COMMENT ON SCHEMA public IS 'Esquema principal de TopoField. Tablas TopoTask eliminadas en migración 017 (2026-07-26): incidencias, incidencia_fotos, obra_destinatarios, envios_correo. Razón: integración con infraestructura externa (telegram, correo operativo) fuera del core.';

-- =====================================================
-- Resultado esperado:
-- - 4 tablas eliminadas sin pérdida de datos (estaban vacías)
-- - Esquema limpio de referencias a infraestructura TopoTask
-- =====================================================
