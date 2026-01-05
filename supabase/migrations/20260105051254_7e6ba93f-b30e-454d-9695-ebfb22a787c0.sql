-- Create credit_packs table
CREATE TABLE public.credit_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credits INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;

-- Anyone can read active credit packs
CREATE POLICY "Anyone can read active credit packs"
ON public.credit_packs
FOR SELECT
USING (is_active = true);

-- Service role can manage credit packs (for admin operations via edge functions)
CREATE POLICY "Service role can manage credit packs"
ON public.credit_packs
FOR ALL
USING (true)
WITH CHECK (true);

-- Add timestamp trigger
CREATE TRIGGER update_credit_packs_updated_at
BEFORE UPDATE ON public.credit_packs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default credit packs
INSERT INTO public.credit_packs (credits, price, is_popular) VALUES
(10, 5, false),
(25, 10, true),
(50, 18, false),
(100, 30, false);