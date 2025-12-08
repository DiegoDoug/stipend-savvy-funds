-- Create new budgets table
CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  expense_allocation numeric NOT NULL DEFAULT 0,
  savings_allocation numeric NOT NULL DEFAULT 0,
  expense_spent numeric NOT NULL DEFAULT 0,
  linked_savings_goal_id uuid REFERENCES public.savings_goals(id) ON DELETE SET NULL,
  last_reset date DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT positive_allocations CHECK (expense_allocation >= 0 AND savings_allocation >= 0)
);

-- Add budget_id to transactions (nullable initially for migration)
ALTER TABLE public.transactions
ADD COLUMN budget_id uuid REFERENCES public.budgets(id) ON DELETE SET NULL;

-- Enable RLS on budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- RLS policies for budgets
CREATE POLICY "Users can view their own budgets"
ON public.budgets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets"
ON public.budgets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
ON public.budgets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
ON public.budgets FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update budget expense_spent when transactions change
CREATE OR REPLACE FUNCTION public.update_budget_expense_spent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_budget_id uuid;
BEGIN
  -- Determine which budget_id to update
  IF TG_OP = 'DELETE' THEN
    affected_budget_id := OLD.budget_id;
  ELSE
    affected_budget_id := NEW.budget_id;
  END IF;

  -- Update the expense_spent in budgets
  IF affected_budget_id IS NOT NULL THEN
    UPDATE public.budgets
    SET expense_spent = COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE budget_id = affected_budget_id 
        AND type = 'expense'
    ), 0)
    WHERE id = affected_budget_id;
  END IF;

  -- Handle old budget if budget changed on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.budget_id IS DISTINCT FROM NEW.budget_id AND OLD.budget_id IS NOT NULL THEN
    UPDATE public.budgets
    SET expense_spent = COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE budget_id = OLD.budget_id 
        AND type = 'expense'
    ), 0)
    WHERE id = OLD.budget_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for budget expense tracking
CREATE TRIGGER update_budget_spent_on_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_budget_expense_spent();

-- Function to process monthly auto-transfers from budgets to linked savings goals
CREATE OR REPLACE FUNCTION public.process_monthly_savings_transfers(p_user_id uuid, user_tz text DEFAULT 'America/Chicago')
RETURNS TABLE(transfers_count integer, total_transferred numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month_start date;
  budget_record record;
  transfers integer := 0;
  total numeric := 0;
BEGIN
  current_month_start := date_trunc('month', (NOW() AT TIME ZONE user_tz)::timestamp)::date;
  
  -- Process each budget with savings_allocation and linked goal that hasn't been reset this month
  FOR budget_record IN 
    SELECT b.id, b.savings_allocation, b.linked_savings_goal_id, sg.name as goal_name
    FROM public.budgets b
    JOIN public.savings_goals sg ON b.linked_savings_goal_id = sg.id
    WHERE b.user_id = p_user_id
      AND b.savings_allocation > 0
      AND b.linked_savings_goal_id IS NOT NULL
      AND (b.last_reset < current_month_start OR b.last_reset IS NULL)
  LOOP
    -- Add to savings goal
    UPDATE public.savings_goals
    SET current_amount = current_amount + budget_record.savings_allocation,
        updated_at = now()
    WHERE id = budget_record.linked_savings_goal_id;
    
    -- Record in goal_progress_history
    INSERT INTO public.goal_progress_history (goal_id, user_id, amount, added_amount, added_by, goal_name, recorded_at)
    SELECT 
      budget_record.linked_savings_goal_id,
      p_user_id,
      sg.current_amount,
      budget_record.savings_allocation,
      'system',
      budget_record.goal_name,
      now()
    FROM public.savings_goals sg
    WHERE sg.id = budget_record.linked_savings_goal_id;
    
    -- Update budget last_reset
    UPDATE public.budgets
    SET last_reset = current_month_start,
        expense_spent = 0,
        updated_at = now()
    WHERE id = budget_record.id;
    
    transfers := transfers + 1;
    total := total + budget_record.savings_allocation;
  END LOOP;
  
  RETURN QUERY SELECT transfers, total;
END;
$$;

-- Migrate existing budget_categories to new budgets table
INSERT INTO public.budgets (user_id, name, expense_allocation, expense_spent, last_reset, created_at, updated_at)
SELECT 
  user_id,
  category as name,
  allocated as expense_allocation,
  spent as expense_spent,
  last_reset,
  created_at,
  updated_at
FROM public.budget_categories;

-- Update existing expense transactions to link to migrated budgets based on category matching
UPDATE public.transactions t
SET budget_id = b.id
FROM public.budgets b
WHERE t.user_id = b.user_id
  AND t.category = b.name
  AND t.type = 'expense'
  AND t.budget_id IS NULL;