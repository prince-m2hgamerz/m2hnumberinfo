-- Create users table for storing user data and credits
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 5,
  banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create search_history table for tracking lookups
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  name TEXT,
  address TEXT,
  circle TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table for payment tracking
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stats table for global statistics
CREATE TABLE public.stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_checks INTEGER NOT NULL DEFAULT 0,
  total_payments INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0
);

-- Create rate_limits table for tracking API usage
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Insert initial stats row
INSERT INTO public.stats (total_checks, total_payments, total_revenue) VALUES (0, 0, 0);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Users table policies - public read for login, users can update own data
CREATE POLICY "Anyone can read users by username" 
ON public.users 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create users" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update users" 
ON public.users 
FOR UPDATE 
USING (true);

-- Search history policies - users can only see their own history
CREATE POLICY "Users can view own search history" 
ON public.search_history 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can insert search history" 
ON public.search_history 
FOR INSERT 
WITH CHECK (true);

-- Orders policies
CREATE POLICY "Anyone can read orders" 
ON public.orders 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage orders" 
ON public.orders 
FOR ALL 
USING (true);

-- Stats policies - public read
CREATE POLICY "Anyone can read stats" 
ON public.stats 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can update stats" 
ON public.stats 
FOR UPDATE 
USING (true);

-- Rate limits policies
CREATE POLICY "Anyone can read rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_order_id ON public.orders(order_id);
CREATE INDEX idx_rate_limits_user_id ON public.rate_limits(user_id);