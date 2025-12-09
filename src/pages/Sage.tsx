import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets } from '@/hooks/useBudgets';
import { Sparkles, ArrowLeft } from 'lucide-react';
import FinancialAdvisorChat, { FinancialContext, SuggestedGoal } from '@/components/UI/FinancialAdvisorChat';

type SavingsGoal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const Sage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { transactions, budgetCategories, stats, refunds, budgets, savingsGoals, refetch } = useFinanceData();
  const { customCategories } = useCategories();
  const { 
    createBudget, 
    updateBudget, 
    deleteBudget, 
    refetch: budgetRefetch 
  } = useBudgets();

  const goals = savingsGoals as SavingsGoal[];

  // Handle AI suggested goal creation - navigate to goals page with pre-filled data
  const handleCreateSuggestedGoal = useCallback((goal: SuggestedGoal) => {
    // Store goal data in sessionStorage and navigate to goals page
    sessionStorage.setItem('pendingGoal', JSON.stringify(goal));
    navigate('/goals?createGoal=true');
  }, [navigate]);

  // Handle AI-suggested expense creation
  const handleCreateExpenseFromAI = useCallback(async (expense: { description: string; amount: number; category: string; date: string }) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('transactions')
      .insert([{
        user_id: user.id,
        type: 'expense',
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
      }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create expense',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Expense Added',
        description: `Created expense: ${expense.description} ($${expense.amount.toFixed(2)})`,
      });
      refetch.transactions();
    }
  }, [user, toast, refetch]);

  // Handle AI-suggested income creation
  const handleCreateIncomeFromAI = useCallback(async (income: { description: string; amount: number; category: string; date: string }) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('transactions')
      .insert([{
        user_id: user.id,
        type: 'income',
        description: income.description,
        amount: income.amount,
        category: income.category,
        date: income.date,
      }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create income',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Income Added',
        description: `Created income: ${income.description} ($${income.amount.toFixed(2)})`,
      });
      refetch.transactions();
    }
  }, [user, toast, refetch]);

  // Handle AI-suggested goal edit
  const handleEditGoalFromAI = useCallback(async (id: string, data: { name?: string; currentAmount?: number; targetAmount?: number; targetDate?: string; description?: string }) => {
    if (!user) return;
    
    const existingGoal = goals.find(g => g.id === id);
    if (!existingGoal) return;
    
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.currentAmount !== undefined) updateData.current_amount = data.currentAmount;
    if (data.targetAmount !== undefined) updateData.target_amount = data.targetAmount;
    if (data.targetDate !== undefined) updateData.target_date = data.targetDate || null;
    if (data.description !== undefined) updateData.description = data.description || null;
    
    const { error } = await supabase
      .from('savings_goals')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update goal',
        variant: 'destructive',
      });
      return;
    }
    
    if (data.currentAmount !== undefined && data.currentAmount > existingGoal.current_amount) {
      const addedAmount = data.currentAmount - existingGoal.current_amount;
      await supabase
        .from('goal_progress_history')
        .insert({
          goal_id: id,
          user_id: user.id,
          amount: data.currentAmount,
          added_amount: addedAmount,
          added_by: 'ai',
          goal_name: data.name || existingGoal.name,
        });
    }

    toast({
      title: 'Goal Updated',
      description: `Updated goal: ${data.name || existingGoal.name}`,
    });
    refetch.savingsGoals();
  }, [user, toast, goals, refetch]);

  // Handle AI-suggested expense edit
  const handleEditExpenseFromAI = useCallback(async (id: string, data: { description?: string; amount?: number; category?: string; date?: string }) => {
    if (!user) return;
    
    const updateData: Record<string, any> = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.date !== undefined) updateData.date = data.date;
    
    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update expense',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Expense Updated',
        description: `Updated expense: ${data.description || 'Expense'}`,
      });
      refetch.transactions();
    }
  }, [user, toast, refetch]);

  // Handle AI-suggested income edit
  const handleEditIncomeFromAI = useCallback(async (id: string, data: { description?: string; amount?: number; category?: string; date?: string }) => {
    if (!user) return;
    
    const updateData: Record<string, any> = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.date !== undefined) updateData.date = data.date;
    
    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update income',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Income Updated',
        description: `Updated income: ${data.description || 'Income'}`,
      });
      refetch.transactions();
    }
  }, [user, toast, refetch]);

  // Handle AI-suggested budget creation
  const handleCreateBudgetFromAI = useCallback(async (budget: { 
    name: string; 
    expenseAllocation: number; 
    savingsAllocation: number; 
    description?: string; 
    linkedGoalName?: string 
  }) => {
    if (!user) return;
    
    let linkedGoalId: string | undefined;
    if (budget.linkedGoalName) {
      const goal = goals.find(g => g.name.toLowerCase() === budget.linkedGoalName!.toLowerCase());
      linkedGoalId = goal?.id;
    }
    
    const success = await createBudget(
      budget.name,
      budget.expenseAllocation,
      budget.savingsAllocation,
      budget.description,
      linkedGoalId
    );
    
    if (success) {
      budgetRefetch.budgets();
    }
  }, [user, goals, createBudget, budgetRefetch]);

  // Handle AI-suggested budget edit
  const handleEditBudgetFromAI = useCallback(async (id: string, data: { 
    name?: string; 
    expenseAllocation?: number; 
    savingsAllocation?: number; 
    description?: string; 
    linkedGoalName?: string 
  }) => {
    if (!user) return;
    
    const updates: Record<string, any> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.expenseAllocation !== undefined) updates.expense_allocation = data.expenseAllocation;
    if (data.savingsAllocation !== undefined) updates.savings_allocation = data.savingsAllocation;
    if (data.description !== undefined) updates.description = data.description;
    
    if (data.linkedGoalName !== undefined) {
      if (data.linkedGoalName) {
        const goal = goals.find(g => g.name.toLowerCase() === data.linkedGoalName!.toLowerCase());
        updates.linked_savings_goal_id = goal?.id || null;
      } else {
        updates.linked_savings_goal_id = null;
      }
    }
    
    const success = await updateBudget(id, updates);
    if (success) {
      budgetRefetch.budgets();
    }
  }, [user, goals, updateBudget, budgetRefetch]);

  // Handle AI-suggested budget deletion
  const handleDeleteBudgetFromAI = useCallback(async (id: string) => {
    if (!user) return;
    
    const success = await deleteBudget(id);
    if (success) {
      budgetRefetch.budgets();
    }
  }, [user, deleteBudget, budgetRefetch]);

  // Handle AI-suggested goal-to-budget linking
  const handleLinkGoalToBudgetFromAI = useCallback(async (budgetName: string, goalName: string) => {
    if (!user) return;
    
    const goal = goals.find(g => g.name.toLowerCase() === goalName.toLowerCase());
    if (!goal) {
      toast({
        title: 'Goal not found',
        description: `Could not find a goal named "${goalName}"`,
        variant: 'destructive',
      });
      return;
    }
    
    const budget = budgets.find(b => b.name.toLowerCase() === budgetName.toLowerCase());
    if (!budget) {
      toast({
        title: 'Budget not found',
        description: `Could not find a budget named "${budgetName}"`,
        variant: 'destructive',
      });
      return;
    }
    
    const success = await updateBudget(budget.id, { linked_savings_goal_id: goal.id });
    if (success) {
      budgetRefetch.budgets();
      toast({
        title: 'Goal linked',
        description: `Linked "${goal.name}" to "${budget.name}"`,
      });
    }
  }, [user, goals, budgets, updateBudget, budgetRefetch, toast]);

  // Handle adding funds to a goal
  const handleAddFundsToGoal = useCallback(async (goalName: string, amount: number) => {
    if (!user) return;
    
    const goal = goals.find(g => g.name.toLowerCase() === goalName.toLowerCase());
    if (!goal) {
      toast({
        title: 'Goal not found',
        description: `Could not find a goal named "${goalName}"`,
        variant: 'destructive',
      });
      return;
    }

    const newAmount = goal.current_amount + amount;
    
    const { error } = await supabase
      .from('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', goal.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add funds',
        variant: 'destructive',
      });
      return;
    }

    await supabase
      .from('goal_progress_history')
      .insert({
        goal_id: goal.id,
        user_id: user.id,
        amount: newAmount,
        added_amount: amount,
        added_by: 'ai',
        goal_name: goal.name,
      });

    toast({
      title: 'Funds Added',
      description: `Added $${amount.toFixed(2)} to "${goal.name}"`,
    });
    refetch.savingsGoals();
  }, [user, goals, toast, refetch]);

  // Build financial context for the AI
  const financialContext: FinancialContext = {
    transactions: transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.category,
      date: t.date,
      receipt_url: t.receipt_url,
    })),
    budgets: budgetCategories.map(b => ({
      category: b.category,
      allocated: b.allocated,
      spent: b.spent,
      last_reset: b.last_reset,
    })),
    budgetsList: budgets?.map(b => {
      const linkedGoal = goals.find(g => g.id === b.linked_savings_goal_id);
      return {
        id: b.id,
        name: b.name,
        description: null,
        expense_allocation: b.expense_allocation,
        savings_allocation: b.savings_allocation,
        expense_spent: b.expense_spent,
        linked_savings_goal_id: b.linked_savings_goal_id,
        linked_goal_name: linkedGoal?.name || null,
      };
    }) || [],
    goals: goals.map(g => ({
      id: g.id,
      name: g.name,
      target_amount: g.target_amount,
      current_amount: g.current_amount,
      target_date: g.target_date,
      description: g.description,
      status: g.status,
    })),
    refunds: refunds.map(r => ({
      id: r.id,
      source: r.source,
      amount: r.amount,
      date: r.date,
      status: r.status,
    })),
    customCategories: customCategories.map(c => ({
      name: c.name,
      label: c.label,
      type: c.type,
    })),
    stats: {
      balance: stats.balance,
      savings: stats.savings,
      monthlyIncome: stats.totalIncome,
      monthlyExpenses: stats.totalExpenses,
      totalBudget: stats.totalBudget,
      totalSpent: stats.totalSpent,
      incomeChange: stats.incomeChange,
      expenseChange: stats.expenseChange,
    },
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* Branded Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary-glow">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
              Sage
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary">AI</span>
            </h1>
            <p className="text-muted-foreground text-sm">Your personal financial advisor</p>
          </div>
        </div>
      </div>

      {/* Full-page Chat */}
      <div className="flex-1 min-h-0">
        <FinancialAdvisorChat 
          financialContext={financialContext}
          standalone={true}
          onCreateGoal={handleCreateSuggestedGoal}
          onCreateExpense={handleCreateExpenseFromAI}
          onCreateIncome={handleCreateIncomeFromAI}
          onEditGoal={handleEditGoalFromAI}
          onEditExpense={handleEditExpenseFromAI}
          onEditIncome={handleEditIncomeFromAI}
          onAddFundsToGoal={handleAddFundsToGoal}
          onCreateBudget={handleCreateBudgetFromAI}
          onEditBudget={handleEditBudgetFromAI}
          onDeleteBudget={handleDeleteBudgetFromAI}
          onLinkGoalToBudget={handleLinkGoalToBudgetFromAI}
        />
      </div>
    </div>
  );
};

export default Sage;
