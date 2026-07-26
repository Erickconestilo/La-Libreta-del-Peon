-- =====================================================
-- Migración 016: Unificar profiles → users
-- =====================================================
-- Contexto:
-- profiles (11 filas) es una tabla paralela a users (4 filas) que contiene
-- usuarios históricos de TopoTask con flags de integración obsoletos.
-- ADR 001 y FASE_1_RECOMENDACIONES.md recomiendan unificar en users.
--
-- Verificaciones previas (2026-07-26):
-- - profiles: 11 filas confirmadas con COUNT(*)
-- - No hay FKs activas apuntando hacia profiles.id
-- - No hay referencias en código TypeScript (grep confirmado)
-- - Campos operador/topografo en campanas/jornadas son TEXT, no FKs
--
-- Decisión: Migrar los 11 registros de profiles a users, preservando
-- legacy_usuario_id para auditoría, descartando flags TopoTask.
-- =====================================================

-- Paso 1: Añadir columna legacy_usuario_id a users para preservar trazabilidad
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS legacy_usuario_id BIGINT;

COMMENT ON COLUMN public.users.legacy_usuario_id IS 'ID de usuario en sistema TopoTask legacy (para auditoría, nullable)';

-- Paso 2: Insertar usuarios de profiles que NO existan ya en users (por email)
-- Mapeo: profiles.nombre → users.full_name, profiles.rol → users.role,
--        profiles.activo → users.is_active, profiles.legacy_usuario_id → users.legacy_usuario_id
-- Nota: users.role acepta ('admin', 'topografo', 'visitante') según CHECK constraint en 001
INSERT INTO public.users (id, email, full_name, role, is_active, legacy_usuario_id, created_at, updated_at)
SELECT
  p.id,
  p.email,
  p.nombre AS full_name,
  CASE
    WHEN p.rol = 'admin' THEN 'admin'
    WHEN p.rol = 'topografo' THEN 'topografo'
    WHEN p.rol = 'operativo' THEN 'topografo'  -- operativo → topografo (rol más cercano)
    ELSE 'visitante'  -- default a visitante en lugar de 'user'
  END AS role,
  p.activo AS is_active,
  p.legacy_usuario_id,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.email = p.email
)
ON CONFLICT (email) DO NOTHING;

-- Paso 3: Actualizar legacy_usuario_id en users existentes que coincidan por email
UPDATE public.users u
SET legacy_usuario_id = p.legacy_usuario_id
FROM public.profiles p
WHERE u.email = p.email
  AND u.legacy_usuario_id IS NULL
  AND p.legacy_usuario_id IS NOT NULL;

-- Paso 4: Verificación de que no quedan usuarios sin migrar
-- (Esta query debería retornar 0 si todo se migró correctamente)
DO $$
DECLARE
  unmigrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmigrated_count
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = p.email OR u.id = p.id
  );

  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Migración incompleta: % usuarios de profiles no se migraron a users', unmigrated_count;
  END IF;

  RAISE NOTICE 'Verificación exitosa: todos los usuarios de profiles migrados a users';
END $$;

-- Paso 5: DROP TABLE profiles (tras confirmar migración)
DROP TABLE IF EXISTS public.profiles CASCADE;

COMMENT ON TABLE public.users IS 'Usuarios del sistema. Unificado con profiles legacy (migración 016, 2026-07-26). Campo legacy_usuario_id preserva trazabilidad con sistema TopoTask.';

-- =====================================================
-- Resultado esperado:
-- - users: 4 + N filas (donde N es cantidad de profiles no duplicados por email)
-- - profiles: tabla eliminada
-- - users.legacy_usuario_id: poblado donde corresponda
-- =====================================================
