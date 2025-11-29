-- Add last_reset column to track when budgets were last reset
ALTER TABLE public.budget_categories 
ADD COLUMN IF NOT EXISTS last_reset date DEFAULT CURRENT_DATE;

-- Create function to reset monthly budgets
CREATE OR REPLACE FUNCTION public.reset_monthly_budgets(user_tz text DEFAULT 'America/Chicago')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month_start date;
BEGIN
  -- Get the start of current month in user's timezone
  current_month_start := date_trunc('month', (NOW() AT TIME ZONE user_tz)::timestamp)::date;
  
  -- Reset spent amounts for categories that haven't been reset this month
  UPDATE public.budget_categories
  SET 
    spent = 0,
    last_reset = current_month_start,
    updated_at = now()
  WHERE last_reset < current_month_start
    OR last_reset IS NULL;
END;
$$;

-- Create function to check and reset budgets for a specific user
CREATE OR REPLACE FUNCTION public.check_and_reset_user_budgets(p_user_id uuid, user_tz text DEFAULT 'America/Chicago')
RETURNS TABLE(reset_occurred boolean, affected_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month_start date;
  affected_rows integer;
BEGIN
  -- Get the start of current month in user's timezone
  current_month_start := date_trunc('month', (NOW() AT TIME ZONE user_tz)::timestamp)::date;
  
  -- Reset spent amounts for this user's categories that haven't been reset this month
  UPDATE public.budget_categories
  SET 
    spent = 0,
    last_reset = current_month_start,
    updated_at = now()
  WHERE user_id = p_user_id
    AND (last_reset < current_month_start OR last_reset IS NULL);
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Return whether reset occurred and how many categories were affected
  RETURN QUERY SELECT (affected_rows > 0), affected_rows;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.reset_monthly_budgets(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_reset_user_budgets(uuid, text) TO authenticated;

-- Add comment explaining the functions
COMMENT ON FUNCTION public.reset_monthly_budgets IS 'Resets all budget spent amounts at the start of each month';
COMMENT ON FUNCTION public.check_and_reset_user_budgets IS 'Checks and resets budgets for a specific user if needed for the current month';