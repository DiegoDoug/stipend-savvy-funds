-- Function to update budget category spent amount based on transactions
CREATE OR REPLACE FUNCTION public.update_budget_category_spent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  affected_user_id uuid;
  affected_category text;
BEGIN
  -- Determine which user_id and category to update based on operation
  IF TG_OP = 'DELETE' THEN
    affected_user_id := OLD.user_id;
    affected_category := OLD.category;
  ELSE
    affected_user_id := NEW.user_id;
    affected_category := NEW.category;
  END IF;

  -- Update the spent amount in budget_categories
  UPDATE public.budget_categories
  SET spent = COALESCE((
    SELECT SUM(amount)
    FROM public.transactions
    WHERE user_id = affected_user_id 
      AND category = affected_category 
      AND type = 'expense'
  ), 0)
  WHERE user_id = affected_user_id 
    AND category = affected_category;

  -- If category doesn't exist in budget_categories, create it with 0 allocated
  IF NOT FOUND THEN
    INSERT INTO public.budget_categories (user_id, category, allocated, spent)
    VALUES (
      affected_user_id,
      affected_category,
      0,
      COALESCE((
        SELECT SUM(amount)
        FROM public.transactions
        WHERE user_id = affected_user_id 
          AND category = affected_category 
          AND type = 'expense'
      ), 0)
    )
    ON CONFLICT (user_id, category) DO UPDATE
    SET spent = EXCLUDED.spent;
  END IF;

  -- If this was an UPDATE and the category changed, update the old category too
  IF TG_OP = 'UPDATE' AND OLD.category != NEW.category THEN
    UPDATE public.budget_categories
    SET spent = COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE user_id = OLD.user_id 
        AND category = OLD.category 
        AND type = 'expense'
    ), 0)
    WHERE user_id = OLD.user_id 
      AND category = OLD.category;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for INSERT operations
DROP TRIGGER IF EXISTS update_budget_spent_on_insert ON public.transactions;
CREATE TRIGGER update_budget_spent_on_insert
AFTER INSERT ON public.transactions
FOR EACH ROW
WHEN (NEW.type = 'expense')
EXECUTE FUNCTION public.update_budget_category_spent();

-- Create trigger for UPDATE operations
DROP TRIGGER IF EXISTS update_budget_spent_on_update ON public.transactions;
CREATE TRIGGER update_budget_spent_on_update
AFTER UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_budget_category_spent();

-- Create trigger for DELETE operations
DROP TRIGGER IF EXISTS update_budget_spent_on_delete ON public.transactions;
CREATE TRIGGER update_budget_spent_on_delete
AFTER DELETE ON public.transactions
FOR EACH ROW
WHEN (OLD.type = 'expense')
EXECUTE FUNCTION public.update_budget_category_spent();

-- Recalculate all existing spent amounts to sync current data
DO $$
DECLARE
  budget_rec RECORD;
BEGIN
  FOR budget_rec IN 
    SELECT DISTINCT user_id, category 
    FROM public.budget_categories
  LOOP
    UPDATE public.budget_categories
    SET spent = COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE user_id = budget_rec.user_id 
        AND category = budget_rec.category 
        AND type = 'expense'
    ), 0)
    WHERE user_id = budget_rec.user_id 
      AND category = budget_rec.category;
  END LOOP;
END;
$$;