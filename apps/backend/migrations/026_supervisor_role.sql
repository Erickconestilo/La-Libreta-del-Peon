-- Add the authenticated, project-scoped supervisor role.
-- Supervisors are read-only in the API even if a membership is misconfigured.
-- Apply only to the authorized TopoField Supabase project. Never run blindly.

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'topografo', 'supervisor', 'visitante'));

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  v_role := COALESCE(
    NULLIF(lower(new.raw_user_meta_data ->> 'role'), ''),
    NULLIF(lower(new.raw_user_meta_data ->> 'rol'), ''),
    NULLIF(lower(new.raw_app_meta_data ->> 'role'), ''),
    'topografo'
  );

  IF v_role NOT IN ('admin', 'topografo', 'supervisor', 'visitante') THEN
    v_role := 'topografo';
  END IF;

  v_full_name := COALESCE(
    NULLIF(new.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(new.raw_user_meta_data ->> 'nombre', ''),
    split_part(new.email, '@', 1)
  );

  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    is_active
  )
  VALUES (
    new.id,
    new.email,
    v_full_name,
    v_role,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$function$;
