-- Drop the unique constraint on referral_code to allow multiple uses of same code
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referral_code_key;