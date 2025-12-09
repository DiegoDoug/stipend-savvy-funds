import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  type: string;
  title: string;
  message: string;
  link_path?: string;
  link_label?: string;
  reference_id?: string;
  reference_type?: string;
  priority?: string;
  expires_at?: string;
}

export async function generateNotifications(userId: string) {
  const notifications: NotificationData[] = [];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  try {
    // 1. Subscription Reminders (within 3 days)
    const reminderThreshold = new Date();
    reminderThreshold.setDate(reminderThreshold.getDate() + 3);

    const { data: subscriptions } = await supabase
      .from('tracked_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .not('reminder_date', 'is', null)
      .lte('reminder_date', reminderThreshold.toISOString().split('T')[0]);

    subscriptions?.forEach(sub => {
      const reminderDate = new Date(sub.reminder_date!);
      const isOverdue = reminderDate < today;
      const isToday = sub.reminder_date === todayStr;

      notifications.push({
        type: 'subscription_reminder',
        title: isOverdue 
          ? `⚠️ Overdue: ${sub.name} reminder`
          : isToday 
            ? `🔔 Today: ${sub.name} reminder`
            : `🔔 ${sub.name} reminder in ${Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days`,
        message: sub.reminder_note || `Reminder for ${sub.name} subscription ($${sub.amount}/${sub.frequency})`,
        link_path: '/subscriptions',
        link_label: 'View Subscriptions',
        reference_id: sub.id,
        reference_type: 'subscription',
        priority: isOverdue ? 'high' : isToday ? 'high' : 'normal',
      });
    });

    // 2. Budget Warnings (80%+ spent)
    const { data: budgets } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId);

    budgets?.forEach(budget => {
      if (budget.expense_allocation > 0) {
        const percentSpent = (Number(budget.expense_spent) / Number(budget.expense_allocation)) * 100;
        
        if (percentSpent >= 100) {
          notifications.push({
            type: 'budget_warning',
            title: `🚨 ${budget.name} budget exceeded!`,
            message: `You've spent $${Number(budget.expense_spent).toFixed(0)} of $${Number(budget.expense_allocation).toFixed(0)} (${percentSpent.toFixed(0)}%)`,
            link_path: '/budget',
            link_label: 'View Budget',
            reference_id: budget.id,
            reference_type: 'budget',
            priority: 'urgent',
          });
        } else if (percentSpent >= 80) {
          notifications.push({
            type: 'budget_warning',
            title: `⚠️ ${budget.name} at ${percentSpent.toFixed(0)}%`,
            message: `Only $${(Number(budget.expense_allocation) - Number(budget.expense_spent)).toFixed(0)} remaining in this budget`,
            link_path: '/budget',
            link_label: 'View Budget',
            reference_id: budget.id,
            reference_type: 'budget',
            priority: 'high',
          });
        }
      }
    });

    // 3. Goal Milestones
    const { data: goals } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    goals?.forEach(goal => {
      const percentComplete = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
      const remaining = Number(goal.target_amount) - Number(goal.current_amount);

      if (percentComplete >= 100) {
        notifications.push({
          type: 'goal_achieved',
          title: `🎉 ${goal.name} achieved!`,
          message: `Congratulations! You've reached your savings goal of $${Number(goal.target_amount).toFixed(0)}`,
          link_path: '/goals',
          link_label: 'View Goals',
          reference_id: goal.id,
          reference_type: 'goal',
          priority: 'high',
        });
      } else if (percentComplete >= 90) {
        notifications.push({
          type: 'goal_milestone',
          title: `🎯 ${goal.name} at 90%!`,
          message: `Almost there! Only $${remaining.toFixed(0)} more to reach your goal`,
          link_path: '/goals',
          link_label: 'View Goals',
          reference_id: goal.id,
          reference_type: 'goal',
          priority: 'normal',
        });
      } else if (percentComplete >= 75) {
        notifications.push({
          type: 'goal_milestone',
          title: `🎯 ${goal.name} at 75%!`,
          message: `Great progress! $${remaining.toFixed(0)} to go`,
          link_path: '/goals',
          link_label: 'View Goals',
          reference_id: goal.id,
          reference_type: 'goal',
          priority: 'low',
        });
      }

      // Goal at risk (target date approaching with low progress)
      if (goal.target_date) {
        const targetDate = new Date(goal.target_date);
        const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining <= 30 && daysRemaining > 0 && percentComplete < 80) {
          notifications.push({
            type: 'goal_milestone',
            title: `⚠️ ${goal.name} deadline approaching`,
            message: `${daysRemaining} days left to save $${remaining.toFixed(0)} (currently at ${percentComplete.toFixed(0)}%)`,
            link_path: '/goals',
            link_label: 'View Goals',
            reference_id: goal.id,
            reference_type: 'goal',
            priority: 'high',
          });
        }
      }
    });

    // 4. Recurring Expense Due (within 3 days)
    const futureThreshold = new Date();
    futureThreshold.setDate(futureThreshold.getDate() + 3);

    const { data: recurringExpenses } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('is_recurring', true)
      .eq('status', 'active')
      .gte('date', todayStr)
      .lte('date', futureThreshold.toISOString().split('T')[0]);

    recurringExpenses?.forEach(expense => {
      const dueDate = new Date(expense.date);
      const isToday = expense.date === todayStr;

      notifications.push({
        type: 'recurring_expense',
        title: isToday 
          ? `📅 ${expense.description} due today`
          : `📅 ${expense.description} due in ${Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days`,
        message: `Recurring expense of $${Number(expense.amount).toFixed(2)}`,
        link_path: '/expenses',
        link_label: 'View Expenses',
        reference_id: expense.id,
        reference_type: 'transaction',
        priority: isToday ? 'high' : 'normal',
      });
    });

    // Insert notifications (with deduplication)
    for (const notification of notifications) {
      // Check for existing notification with same reference_id and type today
      if (notification.reference_id) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('reference_id', notification.reference_id)
          .eq('type', notification.type)
          .eq('is_dismissed', false)
          .maybeSingle();

        if (existing) continue; // Skip duplicate
      }

      await supabase.from('notifications').insert({
        user_id: userId,
        ...notification,
      });
    }

    return notifications.length;
  } catch (error) {
    console.error('Error generating notifications:', error);
    return 0;
  }
}
