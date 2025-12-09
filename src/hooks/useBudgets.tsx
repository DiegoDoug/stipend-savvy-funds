import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getDateRangeForPeriod, isDateInRange } from '@/lib/dateUtils';
import { logError } from '@/lib/errorLogger';

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  expense_allocation: number;
  savings_allocation: number;
  expense_spent: number;
  linked_savings_goal_id: string | null;
  last_reset: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoalOption {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
}

export const useBudgets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalOption[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      logError(error, 'useBudgets:fetchBudgets');
      toast({
        title: 'Error loading budgets',
        description: error.message,
        variant: 'destructive',
      });
    } else if (data) {
      setBudgets(data as Budget[]);
    }
  };

  const fetchSavingsGoals = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('savings_goals')
      .select('id, name, current_amount, target_amount')
      .eq('status', 'active');

    if (error) {
      logError(error, 'useBudgets:fetchSavingsGoals');
    } else if (data) {
      setSavingsGoals(data as SavingsGoalOption[]);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('id, type, amount, date')
      .order('date', { ascending: false });

    if (error) {
      logError(error, 'useBudgets:fetchTransactions');
    } else if (data) {
      setTransactions(data as Transaction[]);
    }
  };

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchBudgets(), fetchSavingsGoals(), fetchTransactions()]);
        setLoading(false);
      };
      loadData();
    }
  }, [user]);

  // Calculate monthly income from transactions
  const monthlyIncome = useMemo(() => {
    const monthRange = getDateRangeForPeriod('month');
    return transactions
      .filter(t => t.type === 'income' && isDateInRange(t.date, monthRange))
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalExpenseAllocation = budgets.reduce((sum, b) => sum + Number(b.expense_allocation), 0);
    const totalSavingsAllocation = budgets.reduce((sum, b) => sum + Number(b.savings_allocation), 0);
    const totalAllocation = totalExpenseAllocation + totalSavingsAllocation;
    const totalExpenseSpent = budgets.reduce((sum, b) => sum + Number(b.expense_spent), 0);
    const remainingToAllocate = monthlyIncome - totalAllocation;
    const isOverAllocated = remainingToAllocate < 0;

    return {
      monthlyIncome,
      totalExpenseAllocation,
      totalSavingsAllocation,
      totalAllocation,
      totalExpenseSpent,
      remainingToAllocate,
      isOverAllocated,
    };
  }, [budgets, monthlyIncome]);

  // Check if adding/updating would exceed income
  const validateAllocation = (expenseAllocation: number, savingsAllocation: number, excludeBudgetId?: string) => {
    const currentTotal = budgets
      .filter(b => b.id !== excludeBudgetId)
      .reduce((sum, b) => sum + Number(b.expense_allocation) + Number(b.savings_allocation), 0);
    
    const newTotal = currentTotal + expenseAllocation + savingsAllocation;
    const remaining = monthlyIncome - newTotal;
    
    return {
      isValid: remaining >= 0,
      remaining,
      exceededBy: remaining < 0 ? Math.abs(remaining) : 0,
    };
  };

  const createBudget = async (
    name: string,
    expenseAllocation: number,
    savingsAllocation: number,
    description?: string,
    linkedSavingsGoalId?: string
  ) => {
    if (!user) return false;

    // Validate allocation
    const validation = validateAllocation(expenseAllocation, savingsAllocation);
    if (!validation.isValid) {
      toast({
        title: 'Allocation exceeds income',
        description: `This allocation would exceed your monthly income by $${validation.exceededBy.toLocaleString()}. Please reduce the amount.`,
        variant: 'destructive',
      });
      return false;
    }

    const { error } = await supabase.from('budgets').insert({
      user_id: user.id,
      name,
      description: description || null,
      expense_allocation: expenseAllocation,
      savings_allocation: savingsAllocation,
      linked_savings_goal_id: linkedSavingsGoalId || null,
    });

    if (error) {
      toast({
        title: 'Error creating budget',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    await fetchBudgets();
    toast({
      title: 'Budget created',
      description: `${name} budget created successfully`,
    });
    return true;
  };

  const updateBudget = async (
    id: string,
    updates: Partial<Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) => {
    if (!user) return false;

    // Validate allocation if changing allocations
    if (updates.expense_allocation !== undefined || updates.savings_allocation !== undefined) {
      const currentBudget = budgets.find(b => b.id === id);
      if (currentBudget) {
        const newExpense = updates.expense_allocation ?? currentBudget.expense_allocation;
        const newSavings = updates.savings_allocation ?? currentBudget.savings_allocation;
        
        const validation = validateAllocation(Number(newExpense), Number(newSavings), id);
        if (!validation.isValid) {
          toast({
            title: 'Allocation exceeds income',
            description: `This allocation would exceed your monthly income by $${validation.exceededBy.toLocaleString()}. Please reduce the amount.`,
            variant: 'destructive',
          });
          return false;
        }
      }
    }

    const { error } = await supabase
      .from('budgets')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error updating budget',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    await fetchBudgets();
    toast({
      title: 'Budget updated',
      description: 'Budget updated successfully',
    });
    return true;
  };

  const deleteBudget = async (id: string) => {
    if (!user) return false;

    const budget = budgets.find(b => b.id === id);
    
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting budget',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    await fetchBudgets();
    toast({
      title: 'Budget deleted',
      description: `${budget?.name || 'Budget'} has been deleted`,
    });
    return true;
  };

  const processMonthlyTransfers = async () => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('process_monthly_savings_transfers', {
        p_user_id: user.id,
        user_tz: 'America/Chicago',
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].transfers_count > 0) {
        await fetchBudgets();
        toast({
          title: 'Monthly transfers processed',
          description: `Transferred $${Number(data[0].total_transferred).toLocaleString()} to savings goals across ${data[0].transfers_count} budget(s).`,
        });
        return true;
      } else {
        toast({
          title: 'No transfers needed',
          description: 'All budgets are already up to date for this month.',
        });
        return true;
      }
    } catch (error: any) {
      logError(error, 'useBudgets:processMonthlyTransfers');
      toast({
        title: 'Error processing transfers',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Get goal name by ID
  const getGoalName = (goalId: string | null) => {
    if (!goalId) return null;
    return savingsGoals.find(g => g.id === goalId)?.name || null;
  };

  return {
    budgets,
    savingsGoals,
    loading,
    totals,
    validateAllocation,
    createBudget,
    updateBudget,
    deleteBudget,
    processMonthlyTransfers,
    getGoalName,
    refetch: {
      budgets: fetchBudgets,
      savingsGoals: fetchSavingsGoals,
      transactions: fetchTransactions,
    },
  };
};
