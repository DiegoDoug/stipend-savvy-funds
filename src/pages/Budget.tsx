import { useState } from "react";
import { PieChart, Edit3, Plus, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProgressBar from "@/components/UI/ProgressBar";
import CategoryBadge from "@/components/UI/CategoryBadge";
import { mockBudget, categoryLabels } from "@/lib/mockData";

export default function Budget() {
  const [budget, setBudget] = useState(mockBudget);
  const [editMode, setEditMode] = useState<string | null>(null);

  const totalAllocated = Object.values(budget).reduce((sum, cat) => sum + cat.allocated, 0);
  const totalSpent = Object.values(budget).reduce((sum, cat) => sum + cat.spent, 0);
  const remaining = totalAllocated - totalSpent;

  const handleBudgetUpdate = (category: string, newAmount: number) => {
    setBudget(prev => ({
      ...prev,
      [category]: { ...prev[category as keyof typeof prev], allocated: newAmount }
    }));
    setEditMode(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Budget Planner</h1>
          <p className="text-muted-foreground">Manage your monthly allocations</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-primary-glow">
          <Plus size={18} className="mr-2" />
          Add Category
        </Button>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Allocated</p>
              <p className="text-xl font-bold">${totalAllocated.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <PieChart size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-xl font-bold">${totalSpent.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-xl font-bold text-success">${remaining.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Overall Budget Progress</h2>
        <ProgressBar 
          value={totalSpent} 
          max={totalAllocated} 
          showLabel={true}
          label="Monthly Progress"
          size="lg"
        />
      </div>

      {/* Category Details */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-6">Category Breakdown</h2>
        <div className="space-y-6">
          {Object.entries(budget).map(([category, data]) => {
            const percentage = data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0;
            const isEditing = editMode === category;
            
            return (
              <div key={category} className="p-4 bg-accent/20 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <CategoryBadge category={category as keyof typeof budget} />
                  <button
                    onClick={() => setEditMode(isEditing ? null : category)}
                    className="p-2 hover:bg-accent/50 rounded-lg transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Allocated</p>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          defaultValue={data.allocated}
                          className="text-lg font-bold"
                          onBlur={(e) => handleBudgetUpdate(category, Number(e.target.value))}
                          onKeyDown={(e) => e.key === 'Enter' && handleBudgetUpdate(category, Number(e.currentTarget.value))}
                        />
                      </div>
                    ) : (
                      <p className="text-lg font-bold">${data.allocated.toLocaleString()}</p>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Spent</p>
                    <p className="text-lg font-bold">${data.spent.toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                    <p className={`text-lg font-bold ${
                      data.allocated - data.spent >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      ${(data.allocated - data.spent).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={data.spent} max={data.allocated} />
                </div>

                {percentage > 90 && (
                  <div className="mt-3 p-2 bg-warning-light rounded-lg">
                    <p className="text-sm text-warning-foreground font-medium">
                      ⚠️ Approaching budget limit for {categoryLabels[category as keyof typeof categoryLabels]}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Budget Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-success-light rounded-lg">
            <h3 className="font-semibold text-success mb-2">💡 Smart Tip</h3>
            <p className="text-sm text-success-foreground">
              You have ${remaining} remaining this month. Consider moving some to your emergency fund!
            </p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <h3 className="font-semibold text-primary mb-2">📊 Spending Pattern</h3>
            <p className="text-sm">
              Your largest expense category is Essentials at ${budget.essentials.spent} this month.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}