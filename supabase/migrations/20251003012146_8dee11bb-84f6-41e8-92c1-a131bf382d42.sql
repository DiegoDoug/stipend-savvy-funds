-- Fix security warnings by setting search_path on timezone functions
DROP FUNCTION IF EXISTS public.get_user_local_date(TEXT);
DROP FUNCTION IF EXISTS public.date_in_user_tz(DATE, TEXT);

-- Recreate with proper search_path set
CREATE OR REPLACE FUNCTION public.get_user_local_date(user_tz TEXT)
RETURNS DATE
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (NOW() AT TIME ZONE user_tz)::DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.date_in_user_tz(input_date DATE, user_tz TEXT)
RETURNS DATE
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (input_date::TIMESTAMPTZ AT TIME ZONE user_tz)::DATE;
END;
$$;