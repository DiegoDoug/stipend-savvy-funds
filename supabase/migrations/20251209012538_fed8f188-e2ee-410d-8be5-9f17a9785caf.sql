-- Create tracked_subscriptions table for user-marked subscriptions
CREATE TABLE public.tracked_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  category TEXT,
  reminder_date DATE,
  reminder_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  detected_transaction_ids TEXT[], -- Store IDs of transactions that formed this subscription
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add subscription_group_id to transactions for linking recurring expenses
ALTER TABLE public.transactions 
ADD COLUMN subscription_group_id UUID,
ADD COLUMN is_recurring BOOLEAN DEFAULT false;

-- Enable RLS on tracked_subscriptions
ALTER TABLE public.tracked_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own tracked subscriptions"
ON public.tracked_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tracked subscriptions"
ON public.tracked_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracked subscriptions"
ON public.tracked_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked subscriptions"
ON public.tracked_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_tracked_subscriptions_updated_at
BEFORE UPDATE ON public.tracked_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();