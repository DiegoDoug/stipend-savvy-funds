import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
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
      .order('date', { ascending: false })
      .limit(10);

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

  const calculateFinancialStats = () => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalBudget = budgetCategories.reduce((sum, cat) => sum + Number(cat.allocated), 0);
    const totalSpent = budgetCategories.reduce((sum, cat) => sum + Number(cat.spent), 0);

    const balance = income - expenses;
    const savings = balance * 0.3; // Assume 30% goes to savings

    return {
      balance,
      savings,
      totalIncome: income,
      totalBudget,
      totalSpent
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
    refetch: {
      transactions: fetchTransactions,
      budgetCategories: fetchBudgetCategories,
      refunds: fetchRefunds
    }
  };
};