import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getDateRangeForPeriod, getPreviousPeriodRange, isDateInRange, calculatePercentageChange, DateRange } from '@/lib/dateUtils';

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
}

interface Refund {
  id: string;
  source: string;
  amount: number;
  date: string;
  status: 'pending' | 'received';
}

export const useFinanceData = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
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

  const filterTransactionsByRange = (range: DateRange) => {
    return transactions.filter(t => isDateInRange(t.date, range));
  };

  const calculateFinancialStats = (period: 'week' | 'month' | 'semester' | 'year' = 'month') => {
    const currentRange = getDateRangeForPeriod(period);
    const previousRange = getPreviousPeriodRange(period);

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
    const savings = currentBalance * 0.3; // Assume 30% goes to savings

    const incomeChange = calculatePercentageChange(currentIncome, previousIncome);
    const expenseChange = calculatePercentageChange(currentExpenses, previousExpenses);
    const balanceChange = calculatePercentageChange(currentBalance, previousBalance);

    return {
      balance: currentBalance,
      savings,
      totalIncome: currentIncome,
      totalExpenses: currentExpenses,
      totalBudget,
      totalSpent,
      incomeChange,
      expenseChange,
      balanceChange,
      currentTransactions,
      previousIncome,
      previousExpenses
    };
  };

  useEffect(() => {
    if (user) {
      const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([
          fetchTransactions(),
          fetchBudgetCategories(),
          fetchRefunds()
        ]);
        setLoading(false);
      };

      fetchAllData();
    }
  }, [user]);

  return {
    transactions,
    budgetCategories,
    refunds,
    loading,
    stats: calculateFinancialStats(),
    filterByPeriod: (period: 'week' | 'month' | 'semester' | 'year') => calculateFinancialStats(period),
    filterTransactionsByRange,
    refetch: {
      transactions: fetchTransactions,
      budgetCategories: fetchBudgetCategories,
      refunds: fetchRefunds
    }
  };
};