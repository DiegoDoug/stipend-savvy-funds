import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  AlertDialog,
  Button,
  Input,
  Select,
  Progress,
} from '@/components/ui/shadcn'; // Import shadcn/ui components
import { GlowCard, StatCard, CategoryBadge, ProgressBar } from '@/components/custom'; // Custom components
import { useFinanceData, useAuth, useAccountStatus } from '@/hooks';
import supabase from '@/lib/supabase';
import EmojiPicker from '@/components/EmojiPicker'; // Assume a custom emoji picker exists
import { formatCurrency, formatDate, confetti } from '@/utils'; // Utility functions (assumed to exist)

// --- Types ---
type SavingsGoal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  category: string;
  deadline?: string;
  priority: number;
  auto_contribute: boolean;
  contribution_schedule?: string;
  contribution_amount?: number;
  round_up_enabled: boolean;
  created_at: string;
  updated_at: string;
  emoji?: string;
};

type GoalTransaction = {
  id: string;
  goal_id: string;
  amount: number;
  transaction_type: 'contribution' | 'withdrawal' | 'auto' | 'round-up' | 'transfer';
  date: string;
  description?: string;
};

// --- Main Component ---
const GoalsSavings: React.FC = () => {
  // Auth and hooks
  const { user } = useAuth();
  const { financeData, loading: financeLoading } = useFinanceData();
  const { status } = useAccountStatus();

  // State
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [goalTransactions, setGoalTransactions] = useState<GoalTransaction[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showEditGoal, setShowEditGoal] = useState(false);
  const [showDeleteGoal, setShowDeleteGoal] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [showMultiContribute, setShowMultiContribute] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [emptyState, setEmptyState] = useState(false);

  // Fetch goals & transactions
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Fetch goals
    supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setGoals(data || []);
        setEmptyState(!(data && data.length));
        setLoading(false);
      });

    // Fetch transactions
    supabase
      .from('goal_transactions')
      .select('*')
      .in('goal_id', goals.map(g => g.id))
      .then(({ data }) => setGoalTransactions(data || []));
  }, [user, goals.length]);

  // --- Derived Data ---
  const filteredGoals = useMemo(() =>
    categoryFilter === 'all' ? goals : goals.filter(g => g.category === categoryFilter),
    [goals, categoryFilter]
  );

  const totalSaved = useMemo(() =>
    goals.reduce((sum, g) => sum + (g.current_amount || 0), 0),
    [goals]
  );

  const monthlyContributionTotal = useMemo(() => {
    // Sum up goal_transactions of type 'contribution' and 'auto' in current month
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    return goalTransactions
      .filter(t => ['contribution', 'auto'].includes(t.transaction_type) && new Date(t.date).getMonth() + 1 === month && new Date(t.date).getFullYear() === year)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [goalTransactions]);

  const goalsCompletedThisYear = useMemo(() =>
    goals.filter(g => g.current_amount >= g.target_amount && new Date(g.updated_at).getFullYear() === new Date().getFullYear()).length,
    [goals]
  );

  const highestPriorityGoal = useMemo(() =>
    goals.sort((a, b) => b.priority - a.priority)[0], [goals]
  );

  // --- UI Handlers ---
  const handleAddGoal = async (goal: Partial<SavingsGoal>) => {
    const { data, error } = await supabase
      .from('savings_goals')
      .insert([{ ...goal, user_id: user.id }]);
    if (!error) {
      setGoals([...goals, data[0]]);
      setShowAddGoal(false);
      confetti();
    }
  };

  const handleEditGoal = async (goalId: string, updates: Partial<SavingsGoal>) => {
    await supabase
      .from('savings_goals')
      .update(updates)
      .eq('id', goalId);
    setGoals(goals.map(g => (g.id === goalId ? { ...g, ...updates } : g)));
    setShowEditGoal(false);
  };

  const handleDeleteGoal = async (goalId: string, transferGoalId?: string) => {
    // If transferGoalId, transfer funds
    const goal = goals.find(g => g.id === goalId);
    if (goal && transferGoalId) {
      const transferGoal = goals.find(g => g.id === transferGoalId);
      if (transferGoal) {
        await supabase
          .from('savings_goals')
          .update({ current_amount: transferGoal.current_amount + goal.current_amount })
          .eq('id', transferGoalId);
      }
    }
    await supabase
      .from('savings_goals')
      .delete()
      .eq('id', goalId);
    setGoals(goals.filter(g => g.id !== goalId));
    setShowDeleteGoal(false);
  };

  // Contribution dialog
  const handleContribute = async (goalId: string, amount: number, type: GoalTransaction['transaction_type'] = 'contribution') => {
    await supabase.from('goal_transactions').insert([
      {
        goal_id: goalId,
        amount,
        transaction_type: type,
        date: new Date().toISOString(),
      },
    ]);
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      await supabase
        .from('savings_goals')
        .update({ current_amount: goal.current_amount + amount })
        .eq('id', goalId);
      setGoals(goals.map(g => (g.id === goalId ? { ...g, current_amount: goal.current_amount + amount } : g)));
    }
    setShowContribute(false);
  };

  // --- Intelligence ---
  // Analyze spending for predictive suggestion
  const savingsCapacity = useMemo(() => {
    // Use recent transactions and expenses to estimate surplus
    const months = 3;
    const now = new Date();
    const recentTx = financeData?.transactions?.filter(tx =>
      now.getTime() - new Date(tx.date).getTime() < months * 30 * 24 * 3600 * 1000
    );
    const incomeSum = recentTx?.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0) || 0;
    const expenseSum = recentTx?.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0) || 0;
    const avgSurplus = ((incomeSum - expenseSum) / months) || 0;
    return avgSurplus > 0 ? avgSurplus : 0;
  }, [financeData]);

  // --- Render ---
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-3">Goals & Savings</h1>
      {/* Loading Skeleton */}
      {loading && <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array(3).fill(<GlowCard loading />)}</div>}
      {/* Empty State */}
      {emptyState && !loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <img src="/illustrations/goal-empty.svg" alt="" className="w-48 h-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Create Your First Goal</h2>
          <Button onClick={() => setShowAddGoal(true)}>Add Goal</Button>
        </div>
      )}

      {/* Overview Section */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <GlowCard label="Total Saved" value={formatCurrency(totalSaved)} color="primary" />
          <GlowCard label="Monthly Contributions" value={formatCurrency(monthlyContributionTotal)} color="blue" />
          <GlowCard label="Goals Completed" value={goalsCompletedThisYear} color="success" />
          {highestPriorityGoal && (
            <GlowCard
              label={`Priority: ${highestPriorityGoal.name}`}
              value={`${Math.round((highestPriorityGoal.current_amount / highestPriorityGoal.target_amount) * 100)}%`}
              color="warning"
              icon={<CategoryBadge category={highestPriorityGoal.category} emoji={highestPriorityGoal.emoji} />}
            />
          )}
        </div>
      )}

      {/* Aggregate Progress */}
      {!loading && goals.length > 0 && (
        <ProgressBar
          value={goals.reduce((sum, g) => sum + g.current_amount, 0)}
          max={goals.reduce((sum, g) => sum + g.target_amount, 0)}
          label="All Goals Progress"
        />
      )}

      {/* Category Filter */}
      <div className="flex gap-2 mt-4 mb-4">
        {['all', 'emergency', 'vacation', 'tech', 'education', 'custom'].map(cat => (
          <Button variant={categoryFilter === cat ? 'solid' : 'outline'} onClick={() => setCategoryFilter(cat)} key={cat}>
            <CategoryBadge category={cat} />
          </Button>
        ))}
      </div>

      {/* Goal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGoals.map(goal => (
          <GlowCard
            key={goal.id}
            label={goal.name}
            value={`${formatCurrency(goal.current_amount)} / ${formatCurrency(goal.target_amount)}`}
            color={goal.current_amount >= goal.target_amount ? 'success' : goal.priority >= 4 ? 'warning' : 'primary'}
            icon={<CategoryBadge category={goal.category} emoji={goal.emoji} />}
            footer={
              <div className="flex flex-col gap-2">
                <ProgressBar
                  value={goal.current_amount}
                  max={goal.target_amount}
                  color={
                    goal.current_amount / goal.target_amount >= 1
                      ? 'success'
                      : goal.current_amount / goal.target_amount >= 0.67
                      ? 'primary'
                      : goal.current_amount / goal.target_amount >= 0.34
                      ? 'warning'
                      : 'muted'
                  }
                  animated={goal.current_amount >= goal.target_amount}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setSelectedGoal(goal); setShowContribute(true); }}>Contribute</Button>
                  <Button size="sm" variant="outline" onClick={() => { setSelectedGoal(goal); setShowEditGoal(true); }}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => { setSelectedGoal(goal); setShowDeleteGoal(true); }}>Delete</Button>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs">Priority</span>
                  {'★'.repeat(goal.priority)}{'☆'.repeat(5 - goal.priority)}
                  {goal.deadline && (
                    <span className="ml-2 text-xs text-warning">
                      {`Time left: ${Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (24 * 3600 * 1000))} days`}
                    </span>
                  )}
                </div>
                {/* Urgency / suggestion */}
                {goal.deadline && goal.current_amount / goal.target_amount < ((new Date(goal.deadline).getTime() - Date.now()) / (30 * 24 * 3600 * 1000)) ? (
                  <div className="text-xs text-danger">
                    Need to contribute {formatCurrency((goal.target_amount - goal.current_amount) / ((new Date(goal.deadline).getTime() - Date.now()) / (30 * 24 * 3600 * 1000)))} / month to meet deadline!
                  </div>
                ) : null}
              </div>
            }
          />
        ))}
      </div>

      {/* Add/Edit Goal Dialog */}
      <Dialog open={showAddGoal || showEditGoal} onOpenChange={(open) => { setShowAddGoal(false); setShowEditGoal(false); }}>
        {/* Goal Form Fields */}
        {/* ... */}
      </Dialog>

      {/* Delete Goal Dialog */}
      <AlertDialog open={showDeleteGoal} onOpenChange={setShowDeleteGoal}>
        {/* Delete confirmation, transfer option */}
        {/* ... */}
      </AlertDialog>

      {/* Contribute Dialog */}
      <Dialog open={showContribute} onOpenChange={setShowContribute}>
        {/* Manual contribution form for selectedGoal */}
        {/* ... */}
      </Dialog>

      {/* Multi-Goal Contribution Dialog */}
      <Dialog open={showMultiContribute} onOpenChange={setShowMultiContribute}>
        {/* Sliders/inputs for splitting contribution across goals */}
        {/* ... */}
      </Dialog>

      {/* Transaction Log */}
      {selectedGoal && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Transaction History</h3>
          <div className="flex flex-col gap-2">
            {goalTransactions
              .filter(tx => tx.goal_id === selectedGoal.id)
              .map(tx => (
                <StatCard
                  key={tx.id}
                  label={`${tx.transaction_type[0].toUpperCase() + tx.transaction_type.slice(1)} • ${formatDate(tx.date)}`}
                  value={formatCurrency(tx.amount)}
                  description={tx.description}
                  icon={tx.transaction_type === 'contribution' ? '💰' : tx.transaction_type === 'withdrawal' ? '↩️' : tx.transaction_type === 'auto' ? '🔄' : '🪙'}
                />
              ))}
          </div>
        </div>
      )}

      {/* Behavioral Insights */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <GlowCard
          label="Motivation"
          value={`You're viewing ${selectedGoal?.name || 'your goals'} X times this week—ready to contribute?`}
          color="primary"
        />
        <GlowCard
          label="Smart Milestones"
          value={selectedGoal ? `${Math.round((selectedGoal.current_amount / selectedGoal.target_amount) * 100)}% complete` : 'Track your milestones!'}
          color={selectedGoal && selectedGoal.current_amount / selectedGoal.target_amount >= 1 ? 'success' : 'primary'}
          animated={selectedGoal && selectedGoal.current_amount / selectedGoal.target_amount >= 1}
        />
        <GlowCard
          label="Suggestion"
          value="Your Emergency Fund hasn't received a contribution in 30 days—add $50?"
          color="warning"
        />
      </div>

      {/* Advanced Features, Template, Rebalancer, etc. */}
      {/* ...Add other dialogs/panels for goal templates, quarterly review, drag-to-reorder priorities, etc... */}

      {/* Monthly Summary, Budget Integration */}
      {/* ...Show year-over-year progress, impulse buy prevention, link to Budget page... */}

      {/* Confetti animation when goal is completed */}
      {goals.some(g => g.current_amount >= g.target_amount) && confetti()}

    </div>
  );
};

export default GoalsSavings;