import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, PiggyBank, Wallet, Target, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsightsCardProps {
  stats: {
    balance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
  };
  transactions: any[];
  budgets: any[];
  goals: any[];
}

const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ stats, transactions, budgets, goals }) => {
  // Calculate savings rate
  const savingsRate = stats.monthlyIncome > 0 
    ? ((stats.monthlyIncome - stats.monthlyExpenses) / stats.monthlyIncome) * 100 
    : 0;

  // Find top expense category
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const categoryTotals: Record<string, number> = {};
  expenseTransactions.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  const topCategory = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)[0];

  // Calculate recommended savings (20% of income - 50/30/20 rule)
  const recommendedSavings = stats.monthlyIncome * 0.2;
  const actualSavings = stats.monthlyIncome - stats.monthlyExpenses;

  // Goal progress
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => {
    const progress = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
    return progress >= 100;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const insights = [
    {
      icon: PiggyBank,
      label: 'Monthly Savings Rate',
      value: `${savingsRate.toFixed(1)}%`,
      description: savingsRate >= 20 ? 'Great job!' : savingsRate >= 10 ? 'Good progress' : 'Room to improve',
      color: savingsRate >= 20 ? 'text-success' : savingsRate >= 10 ? 'text-primary' : 'text-warning',
    },
    {
      icon: Wallet,
      label: 'Top Expense Category',
      value: topCategory ? topCategory[0].charAt(0).toUpperCase() + topCategory[0].slice(1) : 'N/A',
      description: topCategory ? formatCurrency(topCategory[1]) + ' this month' : 'No expenses yet',
      color: 'text-muted-foreground',
    },
    {
      icon: actualSavings >= recommendedSavings ? TrendingUp : TrendingDown,
      label: 'Savings vs Target',
      value: formatCurrency(actualSavings),
      description: `Target: ${formatCurrency(recommendedSavings)} (20%)`,
      color: actualSavings >= recommendedSavings ? 'text-success' : 'text-destructive',
    },
    {
      icon: Target,
      label: 'Goal Progress',
      value: `${completedGoals.length}/${goals.length}`,
      description: activeGoals.length > 0 ? `${activeGoals.length} active goals` : 'No active goals',
      color: 'text-primary',
    },
  ];

  // Generate AI tip based on data
  const getAITip = () => {
    if (savingsRate < 10) {
      return {
        icon: AlertCircle,
        tip: "Your savings rate is below 10%. Consider reviewing your largest expense categories to find areas to cut back.",
        type: 'warning' as const,
      };
    }
    if (topCategory && topCategory[1] > stats.monthlyIncome * 0.3) {
      return {
        icon: AlertCircle,
        tip: `Your ${topCategory[0]} spending is over 30% of your income. This might be worth reviewing.`,
        type: 'warning' as const,
      };
    }
    if (savingsRate >= 20) {
      return {
        icon: TrendingUp,
        tip: "Excellent savings rate! Consider putting extra savings toward your goals or investments.",
        type: 'success' as const,
      };
    }
    return {
      icon: PiggyBank,
      tip: "You're on track! Keep monitoring your spending to maintain healthy finances.",
      type: 'info' as const,
    };
  };

  const aiTip = getAITip();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          Financial Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {insights.map((insight, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-1">
              <div className="flex items-center gap-2">
                <insight.icon className={cn("h-4 w-4", insight.color)} />
                <span className="text-xs text-muted-foreground">{insight.label}</span>
              </div>
              <p className={cn("text-lg font-semibold", insight.color)}>{insight.value}</p>
              <p className="text-xs text-muted-foreground">{insight.description}</p>
            </div>
          ))}
        </div>

        {/* AI Tip */}
        <div className={cn(
          "p-3 rounded-lg border",
          aiTip.type === 'warning' ? 'bg-warning/10 border-warning/30' :
          aiTip.type === 'success' ? 'bg-success/10 border-success/30' :
          'bg-primary/10 border-primary/30'
        )}>
          <div className="flex items-start gap-2">
            <aiTip.icon className={cn(
              "h-4 w-4 mt-0.5 shrink-0",
              aiTip.type === 'warning' ? 'text-warning' :
              aiTip.type === 'success' ? 'text-success' :
              'text-primary'
            )} />
            <p className="text-sm text-foreground">{aiTip.tip}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIInsightsCard;
