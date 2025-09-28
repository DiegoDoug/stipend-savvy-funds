import { DollarSign, TrendingUp, PiggyBank, AlertCircle, CreditCard, Target } from "lucide-react";
import StatCard from "@/components/UI/StatCard";
import ProgressBar from "@/components/UI/ProgressBar";
import CategoryBadge from "@/components/UI/CategoryBadge";
import QuickActionFAB from "@/components/UI/QuickActionFAB";
import { mockUser, mockBudget, mockTransactions, mockUpcomingTransactions, mockRefunds } from "@/lib/mockData";

export default function Dashboard() {
  const totalBudget = Object.values(mockBudget).reduce((sum, cat) => sum + cat.allocated, 0);
  const totalSpent = Object.values(mockBudget).reduce((sum, cat) => sum + cat.spent, 0);
  const nextRefund = mockRefunds[0];

  const quickActions = [
    {
      label: "Add Expense",
      icon: <CreditCard size={18} />,
      onClick: () => console.log("Add expense"),
    },
    {
      label: "Log Income", 
      icon: <TrendingUp size={18} />,
      onClick: () => console.log("Add income"),
    },
    {
      label: "Set Goal",
      icon: <Target size={18} />,
      onClick: () => console.log("Add goal"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome back, {mockUser.name.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground">
          Here's your financial overview for this month
        </p>
      </div>

      {/* Net Worth Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Available Balance"
          value={`$${mockUser.balance.toLocaleString()}`}
          change="+$47.50 this week"
          changeType="positive"
          icon={<DollarSign size={24} />}
        />
        <StatCard
          title="Total Savings"
          value={`$${mockUser.savings.toLocaleString()}`}
          change="+12% this month"
          changeType="positive"
          icon={<PiggyBank size={24} />}
        />
        <StatCard
          title="Monthly Income"
          value={`$${mockUser.totalIncome.toLocaleString()}`}
          subtitle="Stipend + Refunds"
          icon={<TrendingUp size={24} />}
        />
      </div>

      {/* Budget Overview */}
      <div className="budget-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Monthly Budget Status</h2>
          <span className="text-sm text-muted-foreground">
            ${totalSpent.toFixed(0)} / ${totalBudget.toFixed(0)}
          </span>
        </div>
        
        <div className="space-y-4">
          <ProgressBar 
            value={totalSpent} 
            max={totalBudget} 
            showLabel={true}
            label="Overall Progress"
            size="lg"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {Object.entries(mockBudget).map(([category, data]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <CategoryBadge category={category as keyof typeof mockBudget} size="sm" />
                  <span className="text-sm text-muted-foreground">
                    ${data.spent} / ${data.allocated}
                  </span>
                </div>
                <ProgressBar value={data.spent} max={data.allocated} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="budget-card">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {mockTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="expense-item">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    transaction.type === 'income' ? 'bg-success' : 'bg-primary'
                  }`} />
                  <div>
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">{transaction.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.type === 'income' ? 'text-success' : 'text-foreground'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}${transaction.amount}
                  </p>
                  {transaction.type === 'expense' && (
                    <CategoryBadge 
                      category={transaction.category as keyof typeof mockBudget} 
                      size="sm" 
                    />
                  )}
                </div>
              </div>
            ))}
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
            <div className="bg-accent/30 rounded-lg p-3">
              <p className="font-medium">{nextRefund.source}</p>
              <p className="text-2xl font-bold text-success mt-1">
                ${nextRefund.amount.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Expected: {nextRefund.date}
              </p>
            </div>
          </div>

          {/* Upcoming Transactions */}
          <div className="budget-card">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertCircle size={18} />
              Upcoming
            </h3>
            <div className="space-y-2">
              {mockUpcomingTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">{transaction.date}</p>
                  </div>
                  <p className="font-semibold text-warning">
                    -${transaction.amount}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <QuickActionFAB actions={quickActions} />
    </div>
  );
}