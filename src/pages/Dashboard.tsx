import { useState, useEffect, useMemo } from "react";
import { DollarSign, TrendingUp, PiggyBank, AlertCircle, CreditCard } from "lucide-react";
import { DateRange } from "react-day-picker";
import StatCard from "@/components/UI/StatCard";
import ProgressBar from "@/components/UI/ProgressBar";
import CategoryBadge from "@/components/UI/CategoryBadge";
import { useFinanceData } from "@/hooks/useFinanceData";
import { mockBudget } from "@/lib/mockData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/spotlight-card";
import ExportPDFButton from "@/components/UI/ExportPDFButton";
import { DateRangePicker } from "@/components/UI/DateRangePicker";
import { Button } from "@/components/ui/button";
import { getCustomDateRange, formatDateRange, PeriodType, isDateInRange } from "@/lib/dateUtils";

type DashboardPeriod = PeriodType | 'custom';

export default function Dashboard() {
  const { user } = useAuth();
  const [userTimezone] = useState<string>("America/Chicago");
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  
  const { transactions, budgetCategories, refunds, loading, filterByPeriod, filterByCustomRange } = useFinanceData();

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

  // Recent Activity: filter by selected period - show ALL transactions in range
  const recentTransactions = useMemo(() => {
    const filtered = transactions.filter((t) => {
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
    
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, todayLocal, periodStats.dateRange]);

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
          recentTransactions={recentTransactions}
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
          change={periodStats.balanceChange.text}
          changeType={periodStats.balanceChange.type}
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
          <h2 className="text-base sm:text-lg font-semibold">Monthly Budget Status</h2>
          <span className="text-xs sm:text-sm text-muted-foreground">
            ${totalSpent.toFixed(0)} / ${totalBudget.toFixed(0)}
          </span>
        </div>

        <div className="space-y-4">
          <ProgressBar value={totalSpent} max={totalBudget} showLabel={true} label="Overall Progress" size="lg" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">...</div>
        </div>
      </GlowCard>

      {/* Recent Activity & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Transactions */}
        <div className="budget-card">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Recent Activity</h3>
            <span className="text-xs text-muted-foreground">{recentTransactions.length} transactions</span>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="expense-item">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${transaction.type === "income" ? "bg-success" : "bg-primary"}`}
                    />
                    <div>
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${transaction.type === "income" ? "text-success" : "text-foreground"}`}
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
              <div className="text-center py-8 text-muted-foreground">
                <p>No transactions in this period</p>
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
                        className={`font-semibold ${transaction.type === "income" ? "text-success" : "text-foreground"}`}
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
  );
}
