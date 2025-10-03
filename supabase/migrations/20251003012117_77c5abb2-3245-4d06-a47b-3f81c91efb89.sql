-- Add timezone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Chicago';

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone in IANA format (e.g., America/New_York, Europe/London)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_timezone ON public.profiles(timezone);

-- Create a function to get user's current date in their timezone
CREATE OR REPLACE FUNCTION public.get_user_local_date(user_tz TEXT)
RETURNS DATE
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN (NOW() AT TIME ZONE user_tz)::DATE;
END;
$$;

-- Create a function to convert a date to user's timezone
CREATE OR REPLACE FUNCTION public.date_in_user_tz(input_date DATE, user_tz TEXT)
RETURNS DATE
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN (input_date::TIMESTAMPTZ AT TIME ZONE user_tz)::DATE;
END;
$$;