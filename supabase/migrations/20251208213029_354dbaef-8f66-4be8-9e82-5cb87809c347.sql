-- Create table to track savings goal progress history
CREATE TABLE public.goal_progress_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_goal_progress_goal_id ON public.goal_progress_history(goal_id);
CREATE INDEX idx_goal_progress_recorded_at ON public.goal_progress_history(recorded_at);

-- Enable RLS
ALTER TABLE public.goal_progress_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own goal progress"
ON public.goal_progress_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goal progress"
ON public.goal_progress_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goal progress"
ON public.goal_progress_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to record progress when goal is updated
CREATE OR REPLACE FUNCTION public.record_goal_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only record if current_amount changed
  IF OLD.current_amount IS DISTINCT FROM NEW.current_amount THEN
    INSERT INTO public.goal_progress_history (goal_id, user_id, amount, recorded_at)
    VALUES (NEW.id, NEW.user_id, NEW.current_amount, now());
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-record progress on update
CREATE TRIGGER trigger_record_goal_progress
AFTER UPDATE ON public.savings_goals
FOR EACH ROW
EXECUTE FUNCTION public.record_goal_progress();

-- Also record initial amount when goal is created
CREATE OR REPLACE FUNCTION public.record_initial_goal_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.goal_progress_history (goal_id, user_id, amount, recorded_at)
  VALUES (NEW.id, NEW.user_id, NEW.current_amount, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_record_initial_goal_progress
AFTER INSERT ON public.savings_goals
FOR EACH ROW
EXECUTE FUNCTION public.record_initial_goal_progress();