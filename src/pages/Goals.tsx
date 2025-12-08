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
import { Target, Plus, Trash2 } from 'lucide-react';
import FinancialAdvisorChat, { FinancialContext, SuggestedGoal } from '@/components/UI/FinancialAdvisorChat';
import AIInsightsCard from '@/components/UI/AIInsightsCard';

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
  const { transactions, budgetCategories, stats, refunds } = useFinanceData();
  const { customCategories } = useCategories();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getProgress = (current: number, target: number) => {
    return target > 0 ? (current / target) * 100 : 0;
  };

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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="ml-2 h-8 w-8 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
            <FinancialAdvisorChat financialContext={financialContext} onCreateGoal={handleCreateSuggestedGoal} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Goals;
