-- Create notifications table for in-app notification center
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL, -- 'subscription_reminder', 'budget_warning', 'goal_milestone', 'goal_achieved', 'recurring_expense', 'system'
  title text NOT NULL,
  message text NOT NULL,
  link_path text, -- Optional: e.g., '/subscriptions', '/budget', '/goals'
  link_label text, -- Optional: e.g., 'View Subscription', 'Check Budget'
  reference_id uuid, -- Optional: ID of related entity
  reference_type text, -- Optional: 'subscription', 'goal', 'budget', 'transaction'
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Add status column to transactions for pause/reactivate functionality
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add columns to tracked_subscriptions for enhanced tracking
ALTER TABLE public.tracked_subscriptions
ADD COLUMN IF NOT EXISTS next_billing_date date,
ADD COLUMN IF NOT EXISTS last_notified_at timestamptz,
ADD COLUMN IF NOT EXISTS notification_days_before integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Create subscription_billing_history table
CREATE TABLE public.subscription_billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.tracked_subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  billing_date date NOT NULL,
  status text NOT NULL DEFAULT 'paid', -- 'paid', 'upcoming', 'skipped'
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_billing_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing history
CREATE POLICY "Users can view their own billing history"
ON public.subscription_billing_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own billing history"
ON public.subscription_billing_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing history"
ON public.subscription_billing_history FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own billing history"
ON public.subscription_billing_history FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;