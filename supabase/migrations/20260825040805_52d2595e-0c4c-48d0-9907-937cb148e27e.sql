-- 1) Link e-mail-only purchases on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'reader')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.invites WHERE lower(email) = lower(COALESCE(NEW.email, ''))) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'friend')
      ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.invites SET accepted_at = now() WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL;
  END IF;

  UPDATE public.purchases
     SET user_id = NEW.id
   WHERE user_id IS NULL
     AND lower(email) = lower(COALESCE(NEW.email, ''));

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2) Buyers can read a purchase recorded only against their verified e-mail
DROP POLICY IF EXISTS "own purchases read" ON public.purchases;
CREATE POLICY "own purchases read" ON public.purchases
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (user_id IS NULL AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

-- 3) Backfill existing unlinked purchases
UPDATE public.purchases p
   SET user_id = pr.id
  FROM public.profiles pr
 WHERE p.user_id IS NULL
   AND lower(p.email) = lower(COALESCE(pr.email, ''));