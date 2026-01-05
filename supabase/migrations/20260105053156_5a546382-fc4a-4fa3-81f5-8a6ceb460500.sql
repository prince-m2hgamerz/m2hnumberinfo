-- Drop the restrictive policy and create a permissive one
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.payment_settings;
DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.payment_settings;

-- Create permissive policies
CREATE POLICY "Allow read for authenticated users"
ON public.payment_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow update for authenticated users"
ON public.payment_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);