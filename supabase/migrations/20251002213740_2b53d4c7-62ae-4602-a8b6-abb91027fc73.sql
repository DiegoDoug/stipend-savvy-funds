-- Add DELETE policy for verification_codes
CREATE POLICY "Users can delete their own verification codes"
ON public.verification_codes
FOR DELETE
USING (auth.uid() = user_id);

-- Add attempt tracking columns for verification code security
ALTER TABLE public.verification_codes
ADD COLUMN verification_attempts integer NOT NULL DEFAULT 0,
ADD COLUMN locked_until timestamp with time zone;

-- Add index for rate limiting queries
CREATE INDEX idx_verification_codes_rate_limit 
ON public.verification_codes(user_id, action_type, created_at);
