import { useState } from "react";
import { CreditCard, Plus, Search, Filter, Calendar, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatCard from "@/components/UI/StatCard";
import CategoryBadge from "@/components/UI/CategoryBadge";
import QuickActionFAB from "@/components/UI/QuickActionFAB";
import AddExpenseDialog from "@/components/UI/AddExpenseDialog";
import { useFinanceData } from "@/hooks/useFinanceData";
import { categoryLabels } from "@/lib/mockData";

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("date");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { transactions, loading, refetch } = useFinanceData();

  const expenses = transactions?.filter(t => t.type === 'expense') || [];
  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
  const avgDaily = totalExpenses / 30; // Approximate daily average

  // Get unique categories from expenses
  const availableCategories = [...new Set(expenses.map(e => e.category))].filter(Boolean);

  // Filter and sort expenses
  const filteredExpenses = expenses
    .filter(expense => 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedCategory === null || expense.category === selectedCategory)
    )
    .sort((a, b) => {
      if (sortBy === 'amount') return Number(b.amount) - Number(a.amount);
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      return 0;
    });

  const categoryTotals = expenses.reduce((acc, expense) => {
    const amount = Number(expense.amount);
    acc[expense.category] = (acc[expense.category] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  const largestCategory = Object.entries(categoryTotals).reduce((max, [category, amount]) => 
    amount > max.amount ? { category, amount } : max, { category: '', amount: 0 }
  );

  const quickActions = [
    {
      label: "Quick Expense",
      icon: <CreditCard size={18} />,
      onClick: () => setShowAddDialog(true),
    },
    {
      label: "Add Receipt",
      icon: <Receipt size={18} />,
      onClick: () => console.log("Add receipt"),
    },
    {
      label: "Split Bill",
      icon: <Plus size={18} />,
      onClick: () => console.log("Split bill"),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Expense Tracker</h1>
          <p className="text-muted-foreground">Monitor your spending patterns</p>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-primary to-primary-glow"
        >
          <Plus size={18} className="mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Spent (Month)"
          value={`$${totalExpenses.toLocaleString()}`}
          change="-12% vs last month"
          changeType="positive"
          icon={<CreditCard size={24} />}
        />
        <StatCard
          title="Daily Average"
          value={`$${avgDaily.toFixed(2)}`}
          subtitle="Based on 30 days"
          icon={<Calendar size={24} />}
        />
        <StatCard
          title="Largest Category"
          value={largestCategory.category ? categoryLabels[largestCategory.category as keyof typeof categoryLabels] || largestCategory.category : "None"}
          subtitle={`$${largestCategory.amount.toFixed(2)}`}
          icon={<Filter size={24} />}
        />
      </div>

      {/* Filters and Search */}
      <div className="budget-card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === null 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-accent/50 hover:bg-accent'
              }`}
            >
              All Categories
            </button>
            {availableCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-accent/50 hover:bg-accent'
                }`}
              >
                {categoryLabels[category as keyof typeof categoryLabels] || category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          {['date', 'amount'].map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`px-2 py-1 text-xs rounded ${
                sortBy === sort 
                  ? 'bg-primary/20 text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {sort === 'date' ? 'Date' : 'Amount'}
            </button>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(categoryTotals).map(([category, amount]) => (
            <div key={category} className="p-4 bg-accent/20 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <CategoryBadge category={category} size="sm" />
                <span className="text-sm text-muted-foreground">
                  {totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <p className="text-xl font-bold">${amount.toFixed(2)}</p>
              <div className="mt-2">
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className={`h-full rounded-full bg-category-${category}`}
                    style={{ width: `${totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="budget-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {selectedCategory ? `${categoryLabels[selectedCategory as keyof typeof categoryLabels] || selectedCategory} Expenses` : 'All Expenses'}
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredExpenses.map((expense) => (
            <div key={expense.id} className="expense-item">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-category-${expense.category}/10`}>
                  <CreditCard size={18} className={`text-category-${expense.category}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{expense.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CategoryBadge category={expense.category} size="sm" />
                    <span className="text-xs text-muted-foreground">{expense.date}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">-${Number(expense.amount).toFixed(2)}</p>
                <button className="text-xs text-primary hover:underline mt-1">
                  Add Receipt
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredExpenses.length === 0 && (
          <div className="text-center py-8">
            <CreditCard size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No expenses found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Spending Insights */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Spending Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-success-light rounded-lg">
            <h3 className="font-semibold text-success mb-2">💰 Good News!</h3>
            <p className="text-sm text-success-foreground">
              You're spending 12% less than last month. Keep up the good work!
            </p>
          </div>
          <div className="p-4 bg-warning-light rounded-lg">
            <h3 className="font-semibold text-warning mb-2">⚠️ Watch Out</h3>
            <p className="text-sm">
              Fun expenses are 23% higher than usual. Consider setting a weekly limit.
            </p>
          </div>
        </div>
      </div>

      <QuickActionFAB actions={quickActions} />
      
      <AddExpenseDialog 
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onExpenseAdded={refetch.transactions}
      />
    </div>
  );
}