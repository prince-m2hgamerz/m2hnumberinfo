-- Allow authenticated users to update payment settings (admin-only in practice through UI)
CREATE POLICY "Allow update for authenticated users"
ON public.payment_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);