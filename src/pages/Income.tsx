import { useState } from "react";
import { TrendingUp, Plus, Calendar, DollarSign, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/UI/StatCard";
import CategoryBadge from "@/components/UI/CategoryBadge";
import { mockTransactions, mockUser } from "@/lib/mockData";

export default function Income() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  const incomeData = mockTransactions.filter(t => t.type === 'income');
  const totalIncome = incomeData.reduce((sum, t) => sum + t.amount, 0);
  const stipendIncome = incomeData.filter(t => t.description.includes('Stipend')).reduce((sum, t) => sum + t.amount, 0);
  const refundIncome = incomeData.filter(t => t.description.includes('refund')).reduce((sum, t) => sum + t.amount, 0);

  const incomeCategories = [
    { type: 'Stipend', amount: stipendIncome, recurring: true, next: '2024-02-01' },
    { type: 'Scholarships', amount: refundIncome, recurring: false, next: 'Variable' },
    { type: 'Side Gigs', amount: 0, recurring: false, next: 'None scheduled' },
    { type: 'Gifts/Family', amount: 0, recurring: false, next: 'None scheduled' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Income Manager</h1>
          <p className="text-muted-foreground">Track all your income sources</p>
        </div>
        <Button className="bg-gradient-to-r from-success to-success/80">
          <Plus size={18} className="mr-2" />
          Add Income
        </Button>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {['week', 'month', 'semester'].map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === period
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent/50 hover:bg-accent'
            }`}
          >
            This {period}
          </button>
        ))}
      </div>

      {/* Income Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Income (Month)"
          value={`$${totalIncome.toLocaleString()}`}
          change="+$650 vs last month"
          changeType="positive"
          icon={<TrendingUp size={24} />}
        />
        <StatCard
          title="Regular Income"
          value={`$${mockUser.monthlyStipend}`}
          subtitle="Monthly stipend"
          icon={<Calendar size={24} />}
        />
        <StatCard
          title="Variable Income"
          value={`$${refundIncome.toLocaleString()}`}
          subtitle="Refunds & extras"
          icon={<Gift size={24} />}
        />
      </div>

      {/* Income Forecast */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Income Forecast
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3">If no new refunds arrive:</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Current savings duration:</span>
                <span className="font-semibold">{Math.round(mockUser.savings / mockUser.monthlyStipend)} months</span>
              </div>
              <div className="flex justify-between">
                <span>With current spending:</span>
                <span className="font-semibold text-warning">8.5 months</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <h3 className="font-medium text-primary mb-2">💡 Recommendation</h3>
            <p className="text-sm">
              Your stipend covers 87% of your monthly expenses. Consider a small side gig for extra security.
            </p>
          </div>
        </div>
      </div>

      {/* Income Sources */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Income Sources Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incomeCategories.map((category, index) => (
            <div key={index} className="p-4 bg-accent/20 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{category.type}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  category.recurring 
                    ? 'bg-success/10 text-success' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {category.recurring ? 'Recurring' : 'Variable'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">This month:</span>
                  <span className="font-bold text-success">
                    +${category.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next expected:</span>
                  <span className="text-sm font-medium">{category.next}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Income */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Recent Income</h2>
        <div className="space-y-3">
          {incomeData.map((income) => (
            <div key={income.id} className="expense-item">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <DollarSign size={18} className="text-success" />
                </div>
                <div>
                  <p className="font-medium">{income.description}</p>
                  <p className="text-sm text-muted-foreground">{income.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-success text-lg">
                  +${income.amount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {income.category === 'refund' ? 'Refund' : 'Regular'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Income Goals */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Income Goals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <h3 className="font-semibold mb-2">Monthly Target</h3>
            <p className="text-2xl font-bold mb-1">${totalIncome} / $300</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full"
                style={{ width: `${Math.min((totalIncome / 300) * 100, 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {totalIncome >= 300 ? '🎉 Target exceeded!' : `$${300 - totalIncome} to go`}
            </p>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-success/5 to-success/10 rounded-lg border border-success/20">
            <h3 className="font-semibold mb-2">Emergency Fund Goal</h3>
            <p className="text-2xl font-bold mb-1">$850 / $1,500</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="h-full bg-gradient-to-r from-success to-success/80 rounded-full"
                style={{ width: `${(850 / 1500) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              $650 remaining (3.7 months at current rate)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}