import { useState, useEffect, useMemo } from "react";
import { DollarSign, TrendingUp, PiggyBank, AlertCircle, CreditCard, Target } from "lucide-react";
import { DateRange } from "react-day-picker";
import StatCard from "@/components/UI/StatCard";
import ProgressBar from "@/components/UI/ProgressBar";
import CategoryBadge from "@/components/UI/CategoryBadge";
import { useFinanceData, GoalContribution } from "@/hooks/useFinanceData";
import { mockBudget } from "@/lib/mockData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/spotlight-card";
import ExportPDFButton from "@/components/UI/ExportPDFButton";
import { DateRangePicker } from "@/components/UI/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCustomDateRange, formatDateRange, PeriodType, isDateInRange } from "@/lib/dateUtils";
import { PageOnboarding, usePageOnboarding } from "@/components/UI/PageOnboarding";
import { dashboardOnboarding } from "@/components/UI/onboardingConfigs";

type DashboardPeriod = PeriodType | 'custom';

type ActivityItem = {
  id: string;
  type: 'income' | 'expense' | 'savings';
  amount: number;
  description: string;
  category?: string;
  date: string;
  addedBy?: 'user' | 'ai';
  budgetId?: string;
  budgetName?: string;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [userTimezone] = useState<string>("America/Chicago");
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const { showOnboarding, completeOnboarding } = usePageOnboarding('dashboard');
  
  const { transactions, budgetCategories, budgets, refunds, goalContributions, loading, filterByPeriod, filterByCustomRange } = useFinanceData();

  // Create a budget name lookup map
  const budgetNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    budgets.forEach(b => {
      map[b.id] = b.name;
    });
    return map;
  }, [budgets]);

  // Calculate stats based on selected period or custom range
  const periodStats = useMemo(() => {
    if (selectedPeriod === 'custom' && customDateRange?.from && customDateRange?.to) {
      const range = getCustomDateRange(customDateRange.from, customDateRange.to);
      return filterByCustomRange(range);
    }
    return filterByPeriod(selectedPeriod === 'custom' ? 'month' : selectedPeriod);
  }, [selectedPeriod, customDateRange, filterByPeriod, filterByCustomRange]);

  const totalBudget =
    budgetCategories.length > 0
      ? budgetCategories.reduce((sum, cat) => sum + Number(cat.allocated), 0)
      : Object.values(mockBudget).reduce((sum, cat) => sum + cat.allocated, 0);
  const totalSpent =
    budgetCategories.length > 0
      ? budgetCategories.reduce((sum, cat) => sum + Number(cat.spent), 0)
      : Object.values(mockBudget).reduce((sum, cat) => sum + cat.spent, 0);

  // Get today's date in user's timezone
  const getUserLocalDate = () => {
    const now = new Date();
    const localDateStr = now.toLocaleDateString("en-US", {
      timeZone: userTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const [month, day, year] = localDateStr.split("/");
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const todayLocal = getUserLocalDate();
  todayLocal.setHours(0, 0, 0, 0);

  // Next refund (always looks at future regardless of period)
  const nextRefund = transactions
    .filter((t) => {
      const transactionDate = new Date(t.date);
      transactionDate.setHours(0, 0, 0, 0);
      return t.type === "income" && t.category === "refund" && transactionDate > todayLocal;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const [profileData, setProfileData] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();
      if (data) setProfileData(data);
    };
    fetchProfile();
  }, [user]);

  // Recent Activity: combine transactions and savings contributions
  const recentActivity = useMemo(() => {
    // Filter transactions by period
    const filteredTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      transactionDate.setHours(0, 0, 0, 0);
      
      // Must be in the past or today
      if (transactionDate > todayLocal) return false;
      
      // If custom range or period selected, filter by date range
      if (periodStats.dateRange) {
        return isDateInRange(t.date, periodStats.dateRange);
      }
      return true;
    });

    // Map transactions to activity items
    const transactionItems: ActivityItem[] = filteredTransactions.map((t) => ({
      id: t.id,
      type: t.type as 'income' | 'expense',
      amount: Number(t.amount),
      description: t.description,
      category: t.category,
      date: t.date,
      budgetId: t.budget_id || undefined,
      budgetName: t.budget_id ? budgetNameMap[t.budget_id] : undefined,
    }));

    // Filter and map savings contributions
    const savingsItems: ActivityItem[] = goalContributions
      .filter((c) => {
        const recordDate = new Date(c.recorded_at);
        recordDate.setHours(0, 0, 0, 0);
        if (recordDate > todayLocal) return false;
        if (periodStats.dateRange) {
          return isDateInRange(c.recorded_at, periodStats.dateRange);
        }
        return true;
      })
      .map((c) => ({
        id: c.id,
        type: 'savings' as const,
        amount: c.added_amount,
        description: c.goal_name || 'Savings Goal',
        date: c.recorded_at,
        addedBy: c.added_by,
      }));

    // Combine and sort by date
    return [...transactionItems, ...savingsItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, goalContributions, todayLocal, periodStats.dateRange]);

  // Upcoming: future scheduled transactions (always shows future regardless of period)
  const upcomingTransactions = transactions
    .filter((t) => {
      const transactionDate = new Date(t.date);
      transactionDate.setHours(0, 0, 0, 0);
      return transactionDate > todayLocal && !(t.type === "income" && t.category === "refund");
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const handlePeriodChange = (period: DashboardPeriod) => {
    setSelectedPeriod(period);
    if (period !== 'custom') {
      setCustomDateRange(undefined);
    }
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from && range?.to) {
      setSelectedPeriod('custom');
    }
  };

  const getPeriodLabel = (): string => {
    switch (selectedPeriod) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'Last 3 Months';
      case 'custom': 
        if (customDateRange?.from && customDateRange?.to) {
          return formatDateRange(getCustomDateRange(customDateRange.from, customDateRange.to));
        }
        return 'Custom Range';
      default: return 'This Month';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {showOnboarding && (
        <PageOnboarding config={dashboardOnboarding} onComplete={completeOnboarding} />
      )}
      
      <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Welcome back{profileData ? `, ${profileData.name}` : ""}! 👋</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Here's your financial overview for {getPeriodLabel().toLowerCase()}</p>
        </div>
        <ExportPDFButton
          userName={profileData?.name || "User"}
          periodLabel={getPeriodLabel()}
          dateRangeText={periodStats.dateRange ? formatDateRange(periodStats.dateRange) : getPeriodLabel()}
          availableBalance={Math.max(0, periodStats.balance)}
          balanceChange={periodStats.balanceChange}
          totalSavings={Math.max(0, periodStats.savings)}
          periodIncome={periodStats.totalIncome}
          incomeChange={periodStats.incomeChange}
          totalBudget={totalBudget}
          totalSpent={totalSpent}
          recentTransactions={recentActivity.filter(a => a.type !== 'savings').map(a => ({
            id: a.id,
            type: a.type as 'income' | 'expense',
            amount: a.amount,
            description: a.description,
            category: a.category || '',
            date: a.date,
          }))}
          upcomingTransactions={upcomingTransactions}
          budgetCategories={budgetCategories}
          nextRefund={nextRefund ? {
            amount: Number(nextRefund.amount),
            date: nextRefund.date,
            source: nextRefund.description || "Refund"
          } : undefined}
        />
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={selectedPeriod === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePeriodChange('week')}
        >
          This Week
        </Button>
        <Button
          variant={selectedPeriod === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePeriodChange('month')}
        >
          This Month
        </Button>
        <Button
          variant={selectedPeriod === 'quarter' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePeriodChange('quarter')}
        >
          3 Months
        </Button>
        <DateRangePicker
          dateRange={customDateRange}
          onDateRangeChange={handleCustomDateChange}
          className="w-auto"
        />
      </div>

      {/* Net Worth Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Available Balance"
          value={`$${Math.max(0, periodStats.balance).toLocaleString()}`}
          change={periodStats.balanceChange.text}
          changeType={periodStats.balanceChange.type}
          icon={<DollarSign size={24} />}
          glowColor="blue"
        />
        <StatCard
          title="Total Savings"
          value={`$${Math.max(0, periodStats.savings).toLocaleString()}`}
          change={periodStats.savingsChange?.text || '+$0 this period'}
          changeType={periodStats.savingsChange?.type || 'neutral'}
          icon={<PiggyBank size={24} />}
          glowColor="purple"
        />
        <StatCard
          title={`${selectedPeriod === 'week' ? 'Weekly' : selectedPeriod === 'quarter' ? 'Quarterly' : selectedPeriod === 'custom' ? 'Period' : 'Monthly'} Income`}
          value={`$${periodStats.totalIncome.toLocaleString()}`}
          change={periodStats.incomeChange.text}
          changeType={periodStats.incomeChange.type}
          icon={<TrendingUp size={24} />}
          glowColor="green"
        />
      </div>

      {/* Budget Overview */}
      <GlowCard glowColor="purple" customSize={true} className="budget-card rounded-md w-full h-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold">Budget Status</h2>
          <span className="text-xs sm:text-sm text-muted-foreground">
            {budgets.length} budget{budgets.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-4">
          {budgets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgets.map((budget) => {
                const remaining = budget.expense_allocation - budget.expense_spent;
                const percentSpent = budget.expense_allocation > 0 
                  ? (budget.expense_spent / budget.expense_allocation) * 100 
                  : 0;
                const isOverBudget = budget.expense_spent > budget.expense_allocation;
                
                return (
                  <div key={budget.id} className="p-4 bg-accent/20 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm">{budget.name}</h3>
                      {isOverBudget && (
                        <span className="text-xs text-destructive font-medium">Over budget</span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {/* Expense allocation */}
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Expenses</span>
                          <span>${budget.expense_spent.toFixed(0)} / ${budget.expense_allocation.toFixed(0)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOverBudget ? 'bg-destructive' : percentSpent > 80 ? 'bg-secondary' : 'bg-primary'
                            }`}
                            style={{ width: `${Math.min(percentSpent, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Savings allocation */}
                      {budget.savings_allocation > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Savings</span>
                          <span className="text-success">${budget.savings_allocation.toFixed(0)}/mo</span>
                        </div>
                      )}
                      
                      {/* Remaining */}
                      <div className="flex justify-between text-sm pt-1 border-t border-border/30">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className={remaining >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                          ${remaining.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>No budgets created yet</p>
              <p className="text-sm">Create budgets to track your spending</p>
            </div>
          )}
        </div>
      </GlowCard>

      {/* Recent Activity & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Transactions */}
        <div className="budget-card">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Recent Activity</h3>
            <span className="text-xs text-muted-foreground">{recentActivity.length} items</span>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <div key={item.id} className="expense-item">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        item.type === "income" ? "bg-success" : 
                        item.type === "savings" ? "bg-secondary" : 
                        "bg-primary"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{item.description}</p>
                        {item.type === 'savings' && item.addedBy && (
                          <Badge variant="outline" className="text-xs py-0 px-1.5">
                            {item.addedBy === 'ai' ? '🤖 AI' : '👤 You'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.type === 'savings' ? 'Savings contribution' : new Date(item.date).toLocaleDateString()}
                        {item.type === 'expense' && item.budgetName && (
                          <span className="ml-2 text-primary/70">• {item.budgetName}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        item.type === "income" ? "text-success" : 
                        item.type === "savings" ? "text-secondary" : 
                        "text-destructive"
                      }`}
                    >
                      {item.type === "expense" ? "-" : "+"}${item.amount.toLocaleString()}
                    </p>
                    {item.type === "savings" && (
                      <span className="text-xs text-secondary flex items-center justify-end gap-1">
                        <Target className="w-3 h-3" /> Goal
                      </span>
                    )}
                    {item.type === "expense" && item.category && (
                      <CategoryBadge category={item.category as keyof typeof mockBudget} size="sm" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No activity in this period</p>
                <p className="text-sm">Try selecting a different date range</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming & Alerts */}
        <div className="space-y-4">
          {/* Next Refund */}
          <div className="budget-card">
            <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2">
              <CreditCard size={16} className="sm:w-[18px] sm:h-[18px]" />
              Next Refund Check
            </h3>
            {nextRefund ? (
              <div className="bg-accent/30 rounded-lg p-3">
                <p className="text-2xl font-bold text-success mt-1">${Number(nextRefund.amount).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Expected: {new Date(nextRefund.date).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="bg-accent/30 rounded-lg p-3 text-center">
                <p className="text-muted-foreground">No pending refunds</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first refund check</p>
              </div>
            )}
          </div>

          {/* Upcoming Transactions */}
          <div className="budget-card">
            <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
              Upcoming
            </h3>
            <div className="space-y-2">
              {upcomingTransactions.length > 0 ? (
                upcomingTransactions.map((transaction) => (
                  <div key={transaction.id} className="expense-item">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${transaction.type === "income" ? "bg-success" : "bg-primary"}`}
                      />
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${transaction.type === "income" ? "text-success" : "text-destructive"}`}
                      >
                        {transaction.type === "income" ? "+" : "-"}${Number(transaction.amount)}
                      </p>
                      {transaction.type === "expense" && (
                        <CategoryBadge category={transaction.category as keyof typeof mockBudget} size="sm" />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No upcoming transactions</p>
                  <p className="text-sm">Schedule future expenses and income</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
