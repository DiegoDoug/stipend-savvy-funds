import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useBudgets } from '@/hooks/useBudgets';
import { Target, Plus, Trash2, Pencil, DollarSign, Wallet, Link2, Calendar, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AIInsightsCard from '@/components/UI/AIInsightsCard';
import EditGoalDialog from '@/components/UI/EditGoalDialog';
import GoalProgressChart from '@/components/UI/GoalProgressChart';
import AddFundsDialog from '@/components/UI/AddFundsDialog';
import { PageOnboarding, usePageOnboarding } from '@/components/UI/PageOnboarding';
import { goalsOnboarding } from '@/components/UI/onboardingConfigs';

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { transactions, budgetCategories, stats, budgets } = useFinanceData();
  const { updateBudget, refetch: budgetRefetch } = useBudgets();
  const { showOnboarding, completeOnboarding } = usePageOnboarding('goals');
  
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showEditGoal, setShowEditGoal] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showLinkBudget, setShowLinkBudget] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [selectedGoalForFunds, setSelectedGoalForFunds] = useState<SavingsGoal | null>(null);
  const [selectedGoalForLink, setSelectedGoalForLink] = useState<SavingsGoal | null>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
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

  // Handle pending goal from Sage AI
  useEffect(() => {
    const createGoal = searchParams.get('createGoal');
    if (createGoal === 'true') {
      const pendingGoal = sessionStorage.getItem('pendingGoal');
      if (pendingGoal) {
        try {
          const goal = JSON.parse(pendingGoal);
          setNewGoal({
            name: goal.name || '',
            target_amount: goal.targetAmount?.toString() || '',
            current_amount: goal.currentAmount?.toString() || '0',
            target_date: goal.targetDate || '',
            description: goal.description || '',
          });
          setShowAddGoal(true);
          sessionStorage.removeItem('pendingGoal');
        } catch (e) {
          console.error('Failed to parse pending goal:', e);
        }
      }
    }
  }, [searchParams]);

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

  const handleEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setShowEditGoal(true);
  };

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getProgress = (current: number, target: number) => {
    return target > 0 ? (current / target) * 100 : 0;
  };

  // Calculate projected completion date based on auto-savings rate
  const getProjectedCompletion = (goalId: string, currentAmount: number, targetAmount: number) => {
    const linkedBudgets = goalToBudgetMap[goalId];
    if (!linkedBudgets || linkedBudgets.length === 0) return null;
    
    const monthlyAutoSavings = linkedBudgets.reduce((sum, b) => sum + b.savingsAllocation, 0);
    if (monthlyAutoSavings <= 0) return null;
    
    const remaining = targetAmount - currentAmount;
    if (remaining <= 0) return { completed: true };
    
    const monthsToComplete = Math.ceil(remaining / monthlyAutoSavings);
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + monthsToComplete);
    
    return {
      completed: false,
      months: monthsToComplete,
      date: projectedDate,
      monthlyRate: monthlyAutoSavings,
    };
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

  // Calculate total monthly auto-savings from all linked budgets
  const totalMonthlyAutoSavings = React.useMemo(() => {
    return budgets
      .filter(b => b.linked_savings_goal_id && b.savings_allocation > 0)
      .reduce((sum, b) => sum + b.savings_allocation, 0);
  }, [budgets]);

  // Get budgets that have savings allocation for linking
  const linkableBudgets = React.useMemo(() => {
    return budgets.filter(b => b.savings_allocation > 0);
  }, [budgets]);

  const handleOpenLinkBudget = (goal: SavingsGoal) => {
    setSelectedGoalForLink(goal);
    const linkedBudget = budgets.find(b => b.linked_savings_goal_id === goal.id);
    setSelectedBudgetId(linkedBudget?.id || '');
    setShowLinkBudget(true);
  };

  const handleLinkBudget = async () => {
    if (!selectedGoalForLink || !user) return;

    const currentLinkedBudget = budgets.find(b => b.linked_savings_goal_id === selectedGoalForLink.id);
    if (currentLinkedBudget && currentLinkedBudget.id !== selectedBudgetId) {
      await updateBudget(currentLinkedBudget.id, { linked_savings_goal_id: null });
    }

    if (selectedBudgetId) {
      const success = await updateBudget(selectedBudgetId, { linked_savings_goal_id: selectedGoalForLink.id });
      if (success) {
        const budgetName = budgets.find(b => b.id === selectedBudgetId)?.name;
        toast({
          title: 'Goal linked',
          description: `"${selectedGoalForLink.name}" is now linked to "${budgetName}"`,
        });
      }
    } else if (currentLinkedBudget) {
      toast({
        title: 'Goal unlinked',
        description: `"${selectedGoalForLink.name}" is no longer linked to any budget`,
      });
    }

    budgetRefetch.budgets();
    setShowLinkBudget(false);
    setSelectedGoalForLink(null);
    setSelectedBudgetId('');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="space-y-4">
            <div className="h-48 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showOnboarding && (
        <PageOnboarding config={goalsOnboarding} onComplete={completeOnboarding} />
      )}
      
      <div className="container mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Savings Goals</h1>
          <p className="text-muted-foreground text-sm lg:text-base">Track and manage your financial goals</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/sage')}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Ask Sage</span>
          </Button>
          
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
      </div>

      {/* Content */}
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
          totalMonthlyAutoSavings={totalMonthlyAutoSavings}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                            onClick={() => handleOpenLinkBudget(goal)}
                            className={`h-8 w-8 ${goalToBudgetMap[goal.id] ? 'text-success hover:bg-success/10' : 'hover:bg-secondary/10 hover:text-secondary'}`}
                            title={goalToBudgetMap[goal.id] ? 'Change linked budget' : 'Link to budget'}
                          >
                            <Link2 className="h-4 w-4" />
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
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Target: {new Date(goal.target_date).toLocaleDateString()}
                        </div>
                      )}

                      {/* Projected Completion */}
                      {!isCompleted && (() => {
                        const projection = getProjectedCompletion(goal.id, goal.current_amount, goal.target_amount);
                        if (!projection || projection.completed) return null;
                        
                        const isLate = goal.target_date && projection.date > new Date(goal.target_date);
                        
                        return (
                          <div className={`flex items-center gap-2 p-2 rounded-lg ${
                            isLate 
                              ? 'bg-destructive/10 border border-destructive/30' 
                              : 'bg-primary/5 border border-primary/20'
                          }`}>
                            {isLate ? (
                              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-primary shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs ${isLate ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {isLate ? 'Behind schedule' : 'Projected completion'}
                              </p>
                              <p className={`text-sm font-medium ${isLate ? 'text-destructive' : 'text-primary'}`}>
                                {projection.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                <span className={`text-xs ml-1 ${isLate ? 'text-destructive/80' : 'text-muted-foreground'}`}>
                                  ({projection.months} month{projection.months !== 1 ? 's' : ''}{isLate ? ' late' : ''})
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      })()}

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

      {/* Link Budget Dialog */}
      <Dialog open={showLinkBudget} onOpenChange={setShowLinkBudget}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Link to Budget
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Link <span className="font-medium text-foreground">"{selectedGoalForLink?.name}"</span> to a budget for automatic monthly transfers.
            </p>
            
            {linkableBudgets.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">No budgets with savings allocation found.</p>
                <p className="text-xs text-muted-foreground mt-1">Create a budget with savings allocation first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Budget</Label>
                <Select value={selectedBudgetId || "none"} onValueChange={(val) => setSelectedBudgetId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a budget" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    <SelectItem value="none">No linked budget</SelectItem>
                    {linkableBudgets.map((budget) => (
                      <SelectItem key={budget.id} value={budget.id}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{budget.name}</span>
                          <span className="text-xs text-muted-foreground">+${budget.savings_allocation}/mo</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowLinkBudget(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLinkBudget}
                className="flex-1 bg-gradient-to-r from-primary to-primary-glow"
                disabled={linkableBudgets.length === 0}
              >
                {selectedBudgetId ? 'Link Budget' : 'Unlink'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default Goals;
