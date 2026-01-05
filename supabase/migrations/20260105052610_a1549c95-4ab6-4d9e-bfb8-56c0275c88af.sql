-- Create payment settings table for storing Cashfree configuration
CREATE TABLE public.payment_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Only allow read access (edge functions use service role)
CREATE POLICY "Allow read for authenticated users"
ON public.payment_settings
FOR SELECT
TO authenticated
USING (true);

-- Insert default settings
INSERT INTO public.payment_settings (setting_key, setting_value) VALUES
  ('cashfree_mode', 'sandbox'),
  ('cashfree_app_id', ''),
  ('cashfree_secret_key', '');

-- Add trigger for updated_at
CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();