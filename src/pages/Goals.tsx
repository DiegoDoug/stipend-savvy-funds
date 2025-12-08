import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets } from '@/hooks/useBudgets';
import { Target, Plus, Trash2, Pencil, DollarSign, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import FinancialAdvisorChat, { FinancialContext, SuggestedGoal } from '@/components/UI/FinancialAdvisorChat';
import AIInsightsCard from '@/components/UI/AIInsightsCard';
import EditGoalDialog from '@/components/UI/EditGoalDialog';
import GoalProgressChart from '@/components/UI/GoalProgressChart';
import AddFundsDialog from '@/components/UI/AddFundsDialog';

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

const Goals: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { transactions, budgetCategories, stats, refunds, budgets } = useFinanceData();
  const { customCategories } = useCategories();
  const { 
    createBudget, 
    updateBudget, 
    deleteBudget, 
    refetch: budgetRefetch 
  } = useBudgets();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showEditGoal, setShowEditGoal] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [selectedGoalForFunds, setSelectedGoalForFunds] = useState<SavingsGoal | null>(null);
  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    target_date: '',
    description: ''
  });

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load goals',
        variant: 'destructive',
      });
    } else {
      setGoals(data || []);
    }
    setLoading(false);
  };

  const handleAddGoal = async () => {
    if (!user || !newGoal.name || !newGoal.target_amount) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('savings_goals')
      .insert([{
        user_id: user.id,
        name: newGoal.name,
        target_amount: parseFloat(newGoal.target_amount),
        current_amount: parseFloat(newGoal.current_amount) || 0,
        target_date: newGoal.target_date || null,
        description: newGoal.description || null,
        status: 'active'
      }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create goal',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Goal created successfully',
      });
      setNewGoal({ name: '', target_amount: '', current_amount: '', target_date: '', description: '' });
      setShowAddGoal(false);
      fetchGoals();
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete goal',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Goal deleted successfully',
      });
      fetchGoals();
    }
  };

  // Handle editing a goal
  const handleEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setShowEditGoal(true);
  };

  // Handle adding funds to a goal
  const handleOpenAddFunds = (goal: SavingsGoal) => {
    setSelectedGoalForFunds(goal);
    setShowAddFunds(true);
  };

  const handleAddFunds = async (goalId: string, amount: number, addedBy: 'user' | 'ai' = 'user') => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal || !user) return;

    const newAmount = goal.current_amount + amount;
    
    const { error } = await supabase
      .from('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', goalId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add funds',
        variant: 'destructive',
      });
      return;
    }

    // Record the contribution in goal_progress_history
    await supabase
      .from('goal_progress_history')
      .insert({
        goal_id: goalId,
        user_id: user.id,
        amount: newAmount,
        added_amount: amount,
        added_by: addedBy,
        goal_name: goal.name,
      });

    toast({
      title: 'Success',
      description: `Added $${amount.toFixed(2)} to "${goal.name}"`,
    });
    fetchGoals();
  };

  // Handle AI suggested goal creation
  const handleCreateSuggestedGoal = useCallback((goal: SuggestedGoal) => {
    setNewGoal({
      name: goal.name,
      target_amount: goal.targetAmount.toString(),
      current_amount: goal.currentAmount?.toString() || '0',
      target_date: goal.targetDate || '',
      description: goal.description || '',
    });
    setShowAddGoal(true);
  }, []);

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
    }
  }, [user, toast]);

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
    }
  }, [user, toast]);

  // Handle AI-suggested goal edit
  const handleEditGoalFromAI = useCallback(async (id: string, data: { name?: string; currentAmount?: number; targetAmount?: number; targetDate?: string; description?: string }) => {
    if (!user) return;
    
    // Find the goal to check for amount changes
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
    
    // If currentAmount was updated and increased, record the contribution
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
    fetchGoals();
  }, [user, toast, fetchGoals, goals]);

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
    }
  }, [user, toast]);

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
    }
  }, [user, toast]);

  // Handle AI-suggested budget creation
  const handleCreateBudgetFromAI = useCallback(async (budget: { 
    name: string; 
    expenseAllocation: number; 
    savingsAllocation: number; 
    description?: string; 
    linkedGoalName?: string 
  }) => {
    if (!user) return;
    
    // Find goal ID by name if provided
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
    
    // Find goal ID by name if provided
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
    
    // Find goal by name
    const goal = goals.find(g => g.name.toLowerCase() === goalName.toLowerCase());
    if (!goal) {
      toast({
        title: 'Goal not found',
        description: `Could not find a goal named "${goalName}"`,
        variant: 'destructive',
      });
      return;
    }
    
    // Find budget by name
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getProgress = (current: number, target: number) => {
    return target > 0 ? (current / target) * 100 : 0;
  };

  // Create a lookup from goal ID to linked budget(s)
  const goalToBudgetMap = React.useMemo(() => {
    const map: Record<string, { id: string; name: string; savingsAllocation: number }[]> = {};
    budgets.forEach(b => {
      if (b.linked_savings_goal_id) {
        if (!map[b.linked_savings_goal_id]) {
          map[b.linked_savings_goal_id] = [];
        }
        map[b.linked_savings_goal_id].push({
          id: b.id,
          name: b.name,
          savingsAllocation: b.savings_allocation,
        });
      }
    });
    return map;
  }, [budgets]);

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

  if (loading) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-48 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
            <div className="h-[500px] bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Savings Goals</h1>
          <p className="text-muted-foreground text-sm lg:text-base">Track your financial goals with AI insights</p>
        </div>
        <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
          <DialogTrigger asChild>
            <Button size="sm" className="lg:size-default">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Goal</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Goal Name *</Label>
                <Input
                  id="name"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="Emergency Fund"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Target Amount *</Label>
                <Input
                  id="target"
                  type="number"
                  value={newGoal.target_amount}
                  onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                  placeholder="5000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current">Current Amount</Label>
                <Input
                  id="current"
                  type="number"
                  value={newGoal.current_amount}
                  onChange={(e) => setNewGoal({ ...newGoal, current_amount: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Target Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newGoal.target_date}
                  onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="For unexpected expenses"
                />
              </div>
              <Button onClick={handleAddGoal} className="w-full">Create Goal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Insights & Goals */}
        <div className="space-y-6">
          {/* AI Insights Card */}
          <AIInsightsCard
            stats={{
              balance: stats.balance,
              monthlyIncome: stats.totalIncome,
              monthlyExpenses: stats.totalExpenses,
            }}
            transactions={transactions}
            budgets={budgetCategories}
            goals={goals}
          />

          {/* Progress Chart */}
          {goals.length > 0 && (
            <GoalProgressChart goals={goals} />
          )}

          {/* Savings Goals */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Goals</h2>
            
            {goals.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <Target className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-2">No Goals Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create your first savings goal to get started</p>
                  <Button onClick={() => setShowAddGoal(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Goal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {goals.map(goal => {
                  const progress = getProgress(goal.current_amount, goal.target_amount);
                  const isCompleted = progress >= 100;

                  return (
                    <Card key={goal.id} className={isCompleted ? 'border-primary' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{goal.name}</CardTitle>
                            {goal.description && (
                              <CardDescription className="mt-1 text-xs truncate">{goal.description}</CardDescription>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenAddFunds(goal)}
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              title="Add Funds"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditGoal(goal)}
                              className="h-8 w-8"
                              title="Edit Goal"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              title="Delete Goal"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progress.toFixed(1)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Current</p>
                            <p className="font-semibold">{formatCurrency(goal.current_amount)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Target</p>
                            <p className="font-semibold">{formatCurrency(goal.target_amount)}</p>
                          </div>
                        </div>

                        {goal.target_date && (
                          <div className="text-xs text-muted-foreground">
                            Target: {new Date(goal.target_date).toLocaleDateString()}
                          </div>
                        )}

                        {/* Linked Budget Indicator */}
                        {goalToBudgetMap[goal.id] && goalToBudgetMap[goal.id].length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {goalToBudgetMap[goal.id].map(linkedBudget => (
                              <Badge 
                                key={linkedBudget.id} 
                                variant="outline" 
                                className="text-xs gap-1 bg-secondary/10 border-secondary/30 text-secondary-foreground"
                              >
                                <Wallet className="w-3 h-3" />
                                {linkedBudget.name}
                                <span className="text-muted-foreground">
                                  +${linkedBudget.savingsAllocation}/mo
                                </span>
                              </Badge>
                            ))}
                          </div>
                        )}

                        {isCompleted && (
                          <div className="text-xs font-medium text-primary text-center py-1.5 bg-primary/10 rounded">
                            🎉 Goal Completed!
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - AI Chat */}
        <div className="lg:sticky lg:top-6 h-fit">
          <div className="h-[500px] lg:h-[calc(100vh-12rem)]">
            <FinancialAdvisorChat 
              financialContext={financialContext} 
              onCreateGoal={handleCreateSuggestedGoal}
              onCreateExpense={handleCreateExpenseFromAI}
              onCreateIncome={handleCreateIncomeFromAI}
              onEditGoal={handleEditGoalFromAI}
              onEditExpense={handleEditExpenseFromAI}
              onEditIncome={handleEditIncomeFromAI}
              onAddFundsToGoal={(goalName, amount) => {
                const goal = goals.find(g => g.name.toLowerCase() === goalName.toLowerCase());
                if (goal) handleAddFunds(goal.id, amount, 'ai');
              }}
              onCreateBudget={handleCreateBudgetFromAI}
              onEditBudget={handleEditBudgetFromAI}
              onDeleteBudget={handleDeleteBudgetFromAI}
              onLinkGoalToBudget={handleLinkGoalToBudgetFromAI}
            />
          </div>
        </div>
      </div>

      {/* Edit Goal Dialog */}
      <EditGoalDialog
        open={showEditGoal}
        onOpenChange={setShowEditGoal}
        goal={editingGoal}
        onGoalUpdated={fetchGoals}
      />

      {/* Add Funds Dialog */}
      <AddFundsDialog
        open={showAddFunds}
        onOpenChange={setShowAddFunds}
        goal={selectedGoalForFunds}
        onAddFunds={handleAddFunds}
      />
    </div>
  );
};

export default Goals;
