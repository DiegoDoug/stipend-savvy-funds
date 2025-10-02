import { useState, useEffect } from "react";
import { PieChart, Edit3, Plus, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ProgressBar from "@/components/UI/ProgressBar";
import CategoryBadge from "@/components/UI/CategoryBadge";
import { categoryLabels } from "@/lib/mockData";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function Budget() {
  const { user } = useAuth();
  const { budgetCategories, loading, refetch, stats, transactions } = useFinanceData();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [creatingCategories, setCreatingCategories] = useState(false);

  // Convert budgetCategories array to object format for easier access
  const budget = budgetCategories.reduce((acc, cat) => {
    acc[cat.category] = {
      allocated: Number(cat.allocated),
      spent: Number(cat.spent)
    };
    return acc;
  }, {} as Record<string, { allocated: number; spent: number }>);

  const totalAllocated = budgetCategories.reduce((sum, cat) => sum + Number(cat.allocated), 0);
  const totalSpent = budgetCategories.reduce((sum, cat) => sum + Number(cat.spent), 0);
  const remaining = totalAllocated - totalSpent;

  // Create default categories if none exist
  useEffect(() => {
    if (!user || loading || creatingCategories) return;
    
    const createDefaultCategories = async () => {
      if (budgetCategories.length === 0) {
        setCreatingCategories(true);
        
        try {
          const defaultCategories = [
            { category: 'essentials', allocated: 400 },
            { category: 'savings', allocated: 200 },
            { category: 'personal', allocated: 150 },
            { category: 'extra', allocated: 100 }
          ];

          const { data, error } = await supabase
            .from('budget_categories')
            .upsert(
              defaultCategories.map(cat => ({
                user_id: user.id,
                category: cat.category,
                allocated: cat.allocated,
                spent: 0
              })),
              { 
                onConflict: 'user_id,category',
                ignoreDuplicates: true
              }
            )
            .select();

          if (error) {
            // Only throw error if it's not a duplicate key error
            if (!error.message.includes('duplicate key value violates unique constraint')) {
              throw error;
            }
          } else if (data && data.length > 0) {
            // Only show toast if categories were actually created
            refetch.budgetCategories();
            toast({
              title: "Default categories created",
              description: "Created Essentials, Savings, Personal, and Extra categories",
            });
          }
        } catch (error: any) {
          console.error('Error creating default categories:', error);
          toast({
            title: "Error creating categories",
            description: "Failed to create default categories. Please try refreshing the page.",
            variant: "destructive",
          });
        } finally {
          setCreatingCategories(false);
        }
      }
    };

    createDefaultCategories();
  }, [user?.id, budgetCategories.length, loading, creatingCategories]);

  const handleBudgetUpdate = async (category: string, newAmount: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('budget_categories')
      .update({ allocated: newAmount })
      .eq('user_id', user.id)
      .eq('category', category);

    if (error) {
      toast({
        title: "Error updating budget",
        description: error.message,
        variant: "destructive",
      });
    } else {
      refetch.budgetCategories();
      toast({
        title: "Budget updated",
        description: `${categoryLabels[category as keyof typeof categoryLabels]} budget updated successfully`,
      });
    }
    setEditMode(null);
  };

  const handleAddCategory = async () => {
    if (!user || !newAmount) return;
    
    const categoryKey = isCustomCategory ? customCategoryName.toLowerCase().replace(/\s+/g, '-') : newCategory;
    const displayName = isCustomCategory ? customCategoryName : categoryLabels[newCategory as keyof typeof categoryLabels];
    
    if (!categoryKey || (isCustomCategory && !customCategoryName.trim())) return;

    const { error } = await supabase
      .from('budget_categories')
      .insert({
        user_id: user.id,
        category: categoryKey,
        allocated: Number(newAmount),
        spent: 0
      });

    if (error) {
      toast({
        title: "Error adding category",
        description: error.message,
        variant: "destructive",
      });
    } else {
      refetch.budgetCategories();
      toast({
        title: "Category added",
        description: `${displayName} category added successfully`,
      });
      setNewCategory("");
      setNewAmount("");
      setCustomCategoryName("");
      setIsCustomCategory(false);
      setIsAddDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Budget Planner</h1>
          <p className="text-muted-foreground">Manage your monthly allocations</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-glow">
              <Plus size={18} className="mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Budget Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select 
                  value={newCategory} 
                  onValueChange={(value) => {
                    setNewCategory(value);
                    setIsCustomCategory(value === 'custom');
                    if (value !== 'custom') {
                      setCustomCategoryName("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels)
                      .filter(([key]) => {
                        const exists = budgetCategories.some(cat => cat.category === key);
                        console.log(`Category ${key}: exists=${exists}`);
                        return !exists;
                      })
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    <SelectItem value="custom">Custom Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {isCustomCategory && (
                <div>
                  <label className="text-sm font-medium">Custom Category Name</label>
                  <Input
                    type="text"
                    placeholder="Enter category name"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                  />
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium">Budget Amount</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleAddCategory}
                className="w-full"
                disabled={!newAmount || (!newCategory || (isCustomCategory && !customCategoryName.trim()))}
              >
                Add Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Income</p>
              <p className="text-xl font-bold">${stats.totalIncome.toLocaleString()}</p>
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
              <p className="text-xl font-bold">${stats.totalExpenses.toLocaleString()}</p>
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
          {loading ? (
            <div className="text-center py-8">Loading budget categories...</div>
          ) : budgetCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No budget categories found. Default categories will be created automatically.
            </div>
          ) : (
            budgetCategories
              .filter((categoryData) => Number(categoryData.allocated) > 0)
              .map((categoryData) => {
              const category = categoryData.category;
              const data = { allocated: Number(categoryData.allocated), spent: Number(categoryData.spent) };
            const percentage = data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0;
            const isEditing = editMode === category;
            
            return (
              <div key={category} className="p-4 bg-accent/20 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <CategoryBadge category={category} />
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
            })
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Budget Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-success-light rounded-lg">
            <h3 className="font-semibold text-success mb-2">💡 Smart Tip</h3>
            <p className="text-sm text-success-foreground">
              You have ${remaining.toLocaleString()} remaining this month. Consider moving some to your emergency fund!
            </p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <h3 className="font-semibold text-primary mb-2">📊 Spending Pattern</h3>
            <p className="text-sm">
              {budgetCategories.length > 0 && (
                `Your largest expense category is ${categoryLabels[budgetCategories.reduce((max, cat) => 
                  Number(cat.spent) > Number(max.spent) ? cat : max
                ).category as keyof typeof categoryLabels]} at $${budgetCategories.reduce((max, cat) => 
                  Number(cat.spent) > Number(max.spent) ? cat : max
                ).spent} this month.`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Transactions */}
        <div className="budget-card">
          <h2 className="text-lg font-semibold mb-4">Income Breakdown</h2>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4">Loading income transactions...</div>
            ) : (
              transactions
                .filter(t => t.type === 'income')
                .slice(0, 10) // Show last 10 transactions
                .map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CategoryBadge category={transaction.category} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{transaction.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-success">+${Number(transaction.amount).toLocaleString()}</p>
                    </div>
                  </div>
                ))
            )}
            {transactions.filter(t => t.type === 'income').length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No income transactions found
              </div>
            )}
          </div>
        </div>

        {/* Expense Transactions */}
        <div className="budget-card">
          <h2 className="text-lg font-semibold mb-4">Expense Breakdown</h2>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4">Loading expense transactions...</div>
            ) : (
              transactions
                .filter(t => t.type === 'expense')
                .slice(0, 10) // Show last 10 transactions
                .map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-danger/5 border border-danger/20 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CategoryBadge category={transaction.category} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{transaction.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-danger">-${Number(transaction.amount).toLocaleString()}</p>
                    </div>
                  </div>
                ))
            )}
            {transactions.filter(t => t.type === 'expense').length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No expense transactions found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}