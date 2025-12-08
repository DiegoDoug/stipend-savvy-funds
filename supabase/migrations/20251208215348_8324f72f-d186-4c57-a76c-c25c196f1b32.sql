-- Add columns to track savings contributions
ALTER TABLE public.goal_progress_history
ADD COLUMN added_amount numeric DEFAULT 0,
ADD COLUMN added_by text DEFAULT 'user',
ADD COLUMN goal_name text;