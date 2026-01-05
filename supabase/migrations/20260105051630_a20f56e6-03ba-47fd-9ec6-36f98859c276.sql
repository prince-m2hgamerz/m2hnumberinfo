-- Add is_featured column to credit_packs
ALTER TABLE public.credit_packs ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;

-- Create help_requests table for user support
CREATE TABLE public.help_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_reply TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own help requests
CREATE POLICY "Users can view own help requests"
ON public.help_requests
FOR SELECT
USING (true);

-- Users can create help requests
CREATE POLICY "Users can create help requests"
ON public.help_requests
FOR INSERT
WITH CHECK (true);

-- Service role can manage all help requests
CREATE POLICY "Service role can manage help requests"
ON public.help_requests
FOR ALL
USING (true)
WITH CHECK (true);

-- Add timestamp trigger
CREATE TRIGGER update_help_requests_updated_at
BEFORE UPDATE ON public.help_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();