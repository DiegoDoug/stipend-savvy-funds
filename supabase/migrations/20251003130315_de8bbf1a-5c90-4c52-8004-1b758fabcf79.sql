-- Remove all RLS policies from verification_codes table to make it server-side only
DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Users can create their own verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Users can update their own verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Users can delete their own verification codes" ON public.verification_codes;

-- Keep RLS enabled but with no policies - only edge functions with service role can access
-- This prevents any client-side access while maintaining security
COMMENT ON TABLE public.verification_codes IS 'Server-side only table. Access restricted to edge functions with service role key.';