-- 1) Replace the overly permissive message insert policy
DROP POLICY IF EXISTS "anyone can write a message" ON public.messages;

CREATE POLICY "anon writes anonymous message"
ON public.messages FOR INSERT TO anon
WITH CHECK (
  user_id IS NULL
  AND char_length(body) BETWEEN 1 AND 4000
  AND char_length(email) BETWEEN 3 AND 255
  AND kind = ANY (ARRAY['dm','issue'])
  AND status = 'new'
  AND admin_reply IS NULL
);

CREATE POLICY "user writes own message"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND (
    user_id IS NULL
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
  AND char_length(body) BETWEEN 1 AND 4000
  AND char_length(email) BETWEEN 3 AND 255
  AND kind = ANY (ARRAY['dm','issue'])
  AND status = 'new'
  AND admin_reply IS NULL
);

-- 2) The new-user setup function is a trigger helper; nobody should call it via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role must stay executable by authenticated: RLS policies evaluate it as the caller
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;