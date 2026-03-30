CREATE OR REPLACE FUNCTION upsert_user(
  p_user_id UUID,
  p_email TEXT,
  p_first_name TEXT DEFAULT NULL
)
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result users;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  INSERT INTO public.users (id, email, first_name, updated_at)
  VALUES (p_user_id, p_email, p_first_name, NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(users.first_name, ''), EXCLUDED.first_name),
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$;
