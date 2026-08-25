DROP POLICY IF EXISTS "user writes own message" ON public.messages;

CREATE POLICY "user writes own message"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  AND char_length(body) >= 1 AND char_length(body) <= 4000
  AND char_length(email) >= 3 AND char_length(email) <= 255
  AND kind = ANY (ARRAY['dm'::text, 'issue'::text])
  AND status = 'new'::text
  AND admin_reply IS NULL
);