import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getDateRangeForPeriod, getPreviousPeriodRange, isDateInRange, calculatePercentageChange, DateRange, PeriodType } from '@/lib/dateUtils';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  user_id?: string;
  receipt_url?: string | null;
}

interface BudgetCategory {
  category: string;
  allocated: number;
  spent: number;
  last_reset?: string;
}

interface Refund {
  id: string;
  source: string;
  amount: number;
  date: string;
  status: 'pending' | 'received';
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  goal_name: string | null;
  added_amount: number;
  added_by: 'user' | 'ai';
  recorded_at: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
  status: string;
}

export const useFinanceData = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [goalContributions, setGoalContributions] = useState<GoalContribution[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data) {
      setTransactions(data as Transaction[]);
    }
  };

  const fetchBudgetCategories = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('budget_categories')
      .select('*');

    if (!error && data) {
      setBudgetCategories(data);
    }
  };

  const fetchRefunds = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data) {
      setRefunds(data as Refund[]);
    }
  };

  const fetchGoalContributions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('goal_progress_history')
      .select('id, goal_id, goal_name, added_amount, added_by, recorded_at')
      .gt('added_amount', 0)
      .order('recorded_at', { ascending: false });

    if (!error && data) {
      setGoalContributions(data as GoalContribution[]);
    }
  };

  const fetchSavingsGoals = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('savings_goals')
      .select('id, name, current_amount, target_amount, status');

    if (!error && data) {
      setSavingsGoals(data as SavingsGoal[]);
    }
  };

  const filterTransactionsByRange = (range: DateRange) => {
    return transactions.filter(t => isDateInRange(t.date, range));
  };

  const calculateFinancialStats = (period: PeriodType = 'month', customRange?: DateRange) => {
    const currentRange = customRange || getDateRangeForPeriod(period);
    const previousRange = customRange 
      ? getPreviousCustomRange(customRange)
      : getPreviousPeriodRange(period);

    const currentTransactions = filterTransactionsByRange(currentRange);
    const previousTransactions = filterTransactionsByRange(previousRange);

    const currentIncome = currentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const previousIncome = previousTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const currentExpenses = currentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const previousExpenses = previousTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalBudget = budgetCategories.reduce((sum, cat) => sum + Number(cat.allocated), 0);
    const totalSpent = budgetCategories.reduce((sum, cat) => sum + Number(cat.spent), 0);

    const currentBalance = currentIncome - currentExpenses;
    const previousBalance = previousIncome - previousExpenses;
    
    // Calculate real savings from savings_goals
    const totalSavings = savingsGoals
      .filter(g => g.status === 'active')
      .reduce((sum, g) => sum + Number(g.current_amount), 0);

    // Calculate savings contributions in current vs previous period
    const currentContributions = goalContributions
      .filter(c => isDateInRange(c.recorded_at, currentRange))
      .reduce((sum, c) => sum + Number(c.added_amount), 0);
    
    const previousContributions = goalContributions
      .filter(c => isDateInRange(c.recorded_at, previousRange))
      .reduce((sum, c) => sum + Number(c.added_amount), 0);

    const incomeChange = calculatePercentageChange(currentIncome, previousIncome);
    const expenseChange = calculatePercentageChange(currentExpenses, previousExpenses);
    const balanceChange = calculatePercentageChange(currentBalance, previousBalance);
    const savingsChange = calculatePercentageChange(currentContributions, previousContributions);

    return {
      balance: currentBalance,
      savings: totalSavings,
      savingsContributions: currentContributions,
      totalIncome: currentIncome,
      totalExpenses: currentExpenses,
      totalBudget,
      totalSpent,
      incomeChange,
      expenseChange,
      balanceChange,
      savingsChange,
      currentTransactions,
      previousIncome,
      previousExpenses,
      dateRange: currentRange
    };
  };

  // Helper to get previous range for custom date ranges
  const getPreviousCustomRange = (range: DateRange): DateRange => {
    const duration = range.end.getTime() - range.start.getTime();
    const previousEnd = new Date(range.start.getTime() - 1);
    previousEnd.setHours(23, 59, 59, 999);
    const previousStart = new Date(previousEnd.getTime() - duration);
    previousStart.setHours(0, 0, 0, 0);
    return { start: previousStart, end: previousEnd };
  };

  const checkAndResetBudgets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('check_and_reset_user_budgets', {
        p_user_id: user.id,
        user_tz: 'America/Chicago' // You could get this from user profile
      });

      if (error) {
        console.error('Error checking budget reset:', error);
        return;
      }

      // If reset occurred, refetch budget categories
      if (data && data.length > 0 && data[0].reset_occurred) {
        console.log(`Monthly budget reset: ${data[0].affected_count} categories reset`);
        await fetchBudgetCategories();
      }
    } catch (error) {
      console.error('Error in budget reset check:', error);
    }
  };

  useEffect(() => {
    if (user) {
      const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([
          fetchTransactions(),
          fetchBudgetCategories(),
          fetchRefunds(),
          fetchGoalContributions(),
          fetchSavingsGoals()
        ]);
        // Check and reset budgets if needed after loading data
        await checkAndResetBudgets();
        setLoading(false);
      };

      fetchAllData();
    }
  }, [user]);

  return {
    transactions,
    budgetCategories,
    refunds,
    goalContributions,
    savingsGoals,
    loading,
    stats: calculateFinancialStats(),
    filterByPeriod: (period: PeriodType) => calculateFinancialStats(period),
    filterByCustomRange: (range: DateRange) => calculateFinancialStats('month', range),
    filterTransactionsByRange,
    refetch: {
      transactions: fetchTransactions,
      budgetCategories: fetchBudgetCategories,
      refunds: fetchRefunds,
      goalContributions: fetchGoalContributions,
      savingsGoals: fetchSavingsGoals
    }
  };
};