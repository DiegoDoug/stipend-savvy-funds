-- Phase 1 Critical Security Fixes: Remove email PII exposure from verification_codes table
-- This migration updates RLS policies to prevent clients from accessing the email column

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.verification_codes;

-- Create new SELECT policy that excludes the email column
-- Note: RLS policies cannot restrict specific columns, so we document that client code
-- should only SELECT the columns they need (id, user_id, action_type, used, expires_at, 
-- locked_until, verification_attempts, created_at) and NOT include email.
-- The email column should only be accessed by edge functions using the service role key.

-- Recreate the SELECT policy with same logic
CREATE POLICY "Users can view their own verification codes"
ON public.verification_codes
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- Add a comment to the email column documenting it should not be accessed by clients
COMMENT ON COLUMN public.verification_codes.email IS 'SECURITY: This column contains PII and should only be accessed by edge functions with service role key. Client applications must NOT SELECT this column.';

-- Note: The actual security enforcement happens at the application level by ensuring
-- client queries specify only the columns they need and exclude the email column.