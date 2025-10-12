import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, PiggyBank, AlertCircle, CreditCard } from "lucide-react";
import StatCard from "@/components/UI/StatCard";
import ProgressBar from "@/components/UI/ProgressBar";
import CategoryBadge from "@/components/UI/CategoryBadge";
import { useFinanceData } from "@/hooks/useFinanceData";
import { mockBudget } from "@/lib/mockData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/spotlight-card";

export default function Dashboard() {
  const { user } = useAuth();
  const [userTimezone] = useState<string>("America/Chicago");
  const { transactions, budgetCategories, refunds, loading, stats } = useFinanceData();
  const totalBudget =
    budgetCategories.length > 0
      ? budgetCategories.reduce((sum, cat) => sum + Number(cat.allocated), 0)
      : Object.values(mockBudget).reduce((sum, cat) => sum + cat.allocated, 0);
  const totalSpent =
    budgetCategories.length > 0
      ? budgetCategories.reduce((sum, cat) => sum + Number(cat.spent), 0)
      : Object.values(mockBudget).reduce((sum, cat) => sum + cat.spent, 0);
  const nextRefund = refunds.find((r) => r.status === "pending") || refunds[0];

  // Get today's date in user's timezone
  const getUserLocalDate = () => {
    const now = new Date();
    // Convert to user's timezone and get just the date part
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
  const [profileData, setProfileData] = useState<{ name: string } | null>(null);
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();

      if (data) setProfileData(data);
    };

    fetchProfile();
  }, [user]);
  // Recent Activity: past and today's transactions (most recent first)
  const recentTransactions = transactions
    .filter((t) => {
      const transactionDate = new Date(t.date);
      transactionDate.setHours(0, 0, 0, 0);
      return transactionDate <= todayLocal;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Upcoming: future scheduled transactions (chronological order)
  const upcomingTransactions = transactions
    .filter((t) => {
      const transactionDate = new Date(t.date);
      transactionDate.setHours(0, 0, 0, 0);
      return transactionDate > todayLocal;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Welcome back{profileData ? `, ${profileData.name}` : ""}! 👋</h1>
        <p className="text-muted-foreground">Here's your financial overview for this month</p>
      </div>

      {/* Net Worth Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Available Balance"
          value={`$${Math.max(0, stats.balance).toLocaleString()}`}
          change={transactions.length > 0 ? "+$47.50 this week" : "Add transactions to see changes"}
          changeType="positive"
          icon={<DollarSign size={24} />}
          glowColor="blue"
        />
        <StatCard
          title="Total Savings"
          value={`$${Math.max(0, stats.savings).toLocaleString()}`}
          change={transactions.length > 0 ? "+12% this month" : "Start saving today"}
          changeType="positive"
          icon={<PiggyBank size={24} />}
          glowColor="purple"
        />
        <StatCard
          title="Monthly Income"
          value={`$${stats.totalIncome.toLocaleString()}`}
          subtitle="Stipend + Refunds"
          icon={<TrendingUp size={24} />}
          glowColor="green"
        />
      </div>

      {/* Budget Overview */}
      <GlowCard glowColor="purple" customSize={true} className="budget-card rounded-md w-full h-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Monthly Budget Status</h2>
          <span className="text-sm text-muted-foreground">
            ${totalSpent.toFixed(0)} / ${totalBudget.toFixed(0)}
          </span>
        </div>

        <div className="space-y-4">
          <ProgressBar value={totalSpent} max={totalBudget} showLabel={true} label="Overall Progress" size="lg" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">...</div>
        </div>
      </GlowCard>

      {/* Recent Activity & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="budget-card">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
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
                <p>No transactions yet</p>
                <p className="text-sm">Start by adding your first transaction</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming & Alerts */}
        <div className="space-y-4">
          {/* Next Refund */}
          <div className="budget-card">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CreditCard size={18} />
              Next Refund Check
            </h3>
            {nextRefund ? (
              <div className="bg-accent/30 rounded-lg p-3">
                <p className="font-medium">{nextRefund.source}</p>
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
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertCircle size={18} />
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
