import { DollarSign, TrendingUp, PiggyBank, AlertCircle, CreditCard, LogOut } from "lucide-react";
import StatCard from "@/components/UI/StatCard";
import ProgressBar from "@/components/UI/ProgressBar";
import CategoryBadge from "@/components/UI/CategoryBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useFinanceData } from "@/hooks/useFinanceData";
import { mockBudget } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const {
    user,
    signOut
  } = useAuth();
  const [userName, setUserName] = useState<string>('');
  const {
    transactions,
    budgetCategories,
    refunds,
    loading,
    stats
  } = useFinanceData();

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', user.id)
          .single();
        
        if (!error && data) {
          setUserName(data.name || user.email?.split('@')[0] || 'User');
        } else {
          setUserName(user.email?.split('@')[0] || 'User');
        }
      } catch {
        setUserName(user.email?.split('@')[0] || 'User');
      }
    };
    
    fetchUserName();
  }, [user]);
  const totalBudget = budgetCategories.length > 0 ? budgetCategories.reduce((sum, cat) => sum + Number(cat.allocated), 0) : Object.values(mockBudget).reduce((sum, cat) => sum + cat.allocated, 0);
  const totalSpent = budgetCategories.length > 0 ? budgetCategories.reduce((sum, cat) => sum + Number(cat.spent), 0) : Object.values(mockBudget).reduce((sum, cat) => sum + cat.spent, 0);
  const nextRefund = refunds.find(r => r.status === 'pending') || refunds[0];
  const recentTransactions = transactions.slice(0, 5);
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>;
  }
  return <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center md:text-left flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's your financial overview for this month
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut} className="flex items-center gap-2">
          <LogOut size={16} />
          Sign Out
        </Button>
      </div>

      {/* Net Worth Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Available Balance" value={`$${Math.max(0, stats.balance).toLocaleString()}`} change={transactions.length > 0 ? "+$47.50 this week" : "Add transactions to see changes"} changeType="positive" icon={<DollarSign size={24} />} />
        <StatCard title="Total Savings" value={`$${Math.max(0, stats.savings).toLocaleString()}`} change={transactions.length > 0 ? "+12% this month" : "Start saving today"} changeType="positive" icon={<PiggyBank size={24} />} />
        <StatCard title="Monthly Income" value={`$${stats.totalIncome.toLocaleString()}`} subtitle="Stipend + Refunds" icon={<TrendingUp size={24} />} />
      </div>

      {/* Budget Overview */}
      <div className="budget-card rounded-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Monthly Budget Status</h2>
          <span className="text-sm text-muted-foreground">
            ${totalSpent.toFixed(0)} / ${totalBudget.toFixed(0)}
          </span>
        </div>
        
        <div className="space-y-4">
          <ProgressBar value={totalSpent} max={totalBudget} showLabel={true} label="Overall Progress" size="lg" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {(budgetCategories.length > 0 ? budgetCategories : Object.entries(mockBudget)).map(item => {
            const isRealData = budgetCategories.length > 0;
            const category = isRealData ? (item as any).category : item[0];
            const data = isRealData ? item as any : item[1];
            return <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <CategoryBadge category={category as keyof typeof mockBudget} size="sm" />
                    <span className="text-sm text-muted-foreground">
                      ${Number(data.spent || 0)} / ${Number(data.allocated || 0)}
                    </span>
                  </div>
                  <ProgressBar value={Number(data.spent || 0)} max={Number(data.allocated || 0)} />
                </div>;
          })}
          </div>
        </div>
      </div>

      {/* Recent Activity & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="budget-card">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentTransactions.length > 0 ? recentTransactions.map(transaction => <div key={transaction.id} className="expense-item">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-success' : 'bg-primary'}`} />
                    <div>
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${Number(transaction.amount)}
                    </p>
                    {transaction.type === 'expense' && <CategoryBadge category={transaction.category as keyof typeof mockBudget} size="sm" />}
                  </div>
                </div>) : <div className="text-center py-8 text-muted-foreground">
                <p>No transactions yet</p>
                <p className="text-sm">Start by adding your first transaction</p>
              </div>}
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
            {nextRefund ? <div className="bg-accent/30 rounded-lg p-3">
                <p className="font-medium">{nextRefund.source}</p>
                <p className="text-2xl font-bold text-success mt-1">
                  ${Number(nextRefund.amount).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Expected: {new Date(nextRefund.date).toLocaleDateString()}
                </p>
              </div> : <div className="bg-accent/30 rounded-lg p-3 text-center">
                <p className="text-muted-foreground">No pending refunds</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first refund check</p>
              </div>}
          </div>

          {/* Upcoming Transactions */}
          <div className="budget-card">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertCircle size={18} />
              Upcoming
            </h3>
            <div className="space-y-2">
              <div className="text-center py-4 text-muted-foreground">
                <p>No upcoming transactions</p>
                <p className="text-sm">Set up recurring payments and reminders</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
}