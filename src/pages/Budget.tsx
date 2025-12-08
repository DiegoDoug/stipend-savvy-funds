import { useState, useMemo } from "react";
import { 
  PieChart, 
  Edit3, 
  Plus, 
  DollarSign, 
  Trash2, 
  RefreshCw, 
  Wallet, 
  PiggyBank, 
  Target,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import ProgressBar from "@/components/UI/ProgressBar";
import { useAuth } from "@/hooks/useAuth";
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { GlowCard } from "@/components/ui/spotlight-card";
import { useBudgets, Budget } from "@/hooks/useBudgets";
import AddBudgetDialog from "@/components/UI/AddBudgetDialog";
import EditBudgetDialog from "@/components/UI/EditBudgetDialog";

export default function BudgetPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isActive, checkAndNotify } = useAccountStatus();
  const { 
    budgets, 
    loading, 
    totals, 
    deleteBudget, 
    processMonthlyTransfers,
    getGoalName,
    refetch 
  } = useBudgets();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleManualReset = async () => {
    if (!user || !checkAndNotify()) return;
    await processMonthlyTransfers();
  };

  const handleDeleteBudget = async () => {
    if (!budgetToDelete || !checkAndNotify()) return;
    
    await deleteBudget(budgetToDelete.id);
    setBudgetToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const handleRefresh = () => {
    refetch.budgets();
    refetch.savingsGoals();
  };

  // Get the last reset date from budgets
  const lastResetDate = useMemo(() => {
    if (budgets.length === 0) return null;
    const dates = budgets
      .map(b => b.last_reset)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
    return dates[0] || null;
  }, [budgets]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Budget Planner</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-muted-foreground text-xs sm:text-sm">
            <p>Allocate your monthly income to budgets</p>
            {lastResetDate && (
              <span>
                • Last reset: {new Date(lastResetDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={handleManualReset}
            variant="outline"
            disabled={!isActive}
            className="flex items-center gap-2 flex-1 sm:flex-none"
          >
            <RefreshCw size={18} />
            <span>Process Month</span>
          </Button>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-gradient-to-r from-primary to-primary-glow flex-1 sm:flex-none" 
            disabled={!isActive}
          >
            <Plus size={18} className="mr-2" />
            Add Budget
          </Button>
        </div>
      </div>

      {/* Income Pool Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <GlowCard glowColor="blue" customSize={true} className="stat-card w-full h-auto">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign size={18} className="sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Monthly Income</p>
              <p className="text-lg sm:text-xl font-bold truncate">${totals.monthlyIncome.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Available pool</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard glowColor="orange" customSize={true} className="stat-card w-full h-auto">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Wallet size={18} className="sm:w-5 sm:h-5 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Expense Budgets</p>
              <p className="text-lg sm:text-xl font-bold truncate">${totals.totalExpenseAllocation.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Spent: ${totals.totalExpenseSpent.toLocaleString()}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard glowColor="purple" customSize={true} className="stat-card w-full h-auto">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <PiggyBank size={18} className="sm:w-5 sm:h-5 text-purple-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Savings Budgets</p>
              <p className="text-lg sm:text-xl font-bold truncate">${totals.totalSavingsAllocation.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Auto-transfers on reset</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard 
          glowColor={totals.isOverAllocated ? "red" : "green"} 
          customSize={true} 
          className="stat-card w-full h-auto"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 ${totals.isOverAllocated ? 'bg-destructive/10' : 'bg-success/10'} rounded-lg flex items-center justify-center flex-shrink-0`}>
              {totals.isOverAllocated ? (
                <AlertTriangle size={18} className="sm:w-5 sm:h-5 text-destructive" />
              ) : (
                <DollarSign size={18} className="sm:w-5 sm:h-5 text-success" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">
                {totals.isOverAllocated ? 'Over-Allocated' : 'Remaining'}
              </p>
              <p className={`text-lg sm:text-xl font-bold truncate ${totals.isOverAllocated ? 'text-destructive' : 'text-success'}`}>
                {totals.isOverAllocated ? '-' : ''}${Math.abs(totals.remainingToAllocate).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {totals.isOverAllocated ? 'Reduce allocations' : 'Available to allocate'}
              </p>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Overall Progress */}
      <GlowCard glowColor="blue" customSize={true} className="budget-card w-full h-auto">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Income Allocation Progress</h2>
        <ProgressBar 
          value={totals.totalAllocation} 
          max={totals.monthlyIncome} 
          showLabel={true} 
          label="Total Allocated" 
          size="lg" 
        />
        {totals.isOverAllocated && (
          <p className="text-sm text-destructive mt-2 flex items-center gap-1">
            <AlertTriangle size={14} />
            You've allocated more than your monthly income. Consider reducing some budgets.
          </p>
        )}
      </GlowCard>

      {/* Budget Cards */}
      <div className="budget-card">
        <h2 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6">Your Budgets</h2>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading budgets...</div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No budgets yet</p>
              <p className="text-sm">Create your first budget to start allocating your income</p>
            </div>
          ) : (
            budgets.map((budget) => {
              const totalAllocation = Number(budget.expense_allocation) + Number(budget.savings_allocation);
              const expenseSpent = Number(budget.expense_spent);
              const expenseRemaining = Number(budget.expense_allocation) - expenseSpent;
              const expensePercentage = budget.expense_allocation > 0 
                ? (expenseSpent / Number(budget.expense_allocation)) * 100 
                : 0;
              const linkedGoalName = getGoalName(budget.linked_savings_goal_id);

              return (
                <div key={budget.id} className="p-4 bg-accent/20 rounded-lg border border-border/50">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{budget.name}</h3>
                      {budget.description && (
                        <p className="text-sm text-muted-foreground">{budget.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 sm:gap-2">
                      <button
                        onClick={() => isActive && setEditingBudget(budget)}
                        disabled={!isActive}
                        className="p-1.5 sm:p-2 hover:bg-accent/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Edit3 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (isActive) {
                            setBudgetToDelete(budget);
                            setIsDeleteDialogOpen(true);
                          } else {
                            checkAndNotify();
                          }
                        }}
                        disabled={!isActive}
                        className="p-1.5 sm:p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Allocations Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    {/* Expense Allocation */}
                    {Number(budget.expense_allocation) > 0 && (
                      <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Wallet size={14} className="text-warning" />
                          <p className="text-xs text-muted-foreground">Expense</p>
                        </div>
                        <p className="text-lg font-bold">${Number(budget.expense_allocation).toLocaleString()}</p>
                      </div>
                    )}

                    {/* Expense Spent */}
                    {Number(budget.expense_allocation) > 0 && (
                      <div className="p-3 bg-background/50 border border-border/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Spent</p>
                        <p className="text-lg font-bold text-warning">${expenseSpent.toLocaleString()}</p>
                      </div>
                    )}

                    {/* Expense Remaining */}
                    {Number(budget.expense_allocation) > 0 && (
                      <div className="p-3 bg-background/50 border border-border/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                        <p className={`text-lg font-bold ${expenseRemaining >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${expenseRemaining.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Savings Allocation */}
                    {Number(budget.savings_allocation) > 0 && (
                      <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <PiggyBank size={14} className="text-success" />
                          <p className="text-xs text-muted-foreground">Savings</p>
                        </div>
                        <p className="text-lg font-bold text-success">${Number(budget.savings_allocation).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Linked Goal */}
                  {linkedGoalName && (
                    <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                      <Target size={14} className="text-primary" />
                      <span className="text-sm text-muted-foreground">Linked to:</span>
                      <span className="text-sm font-medium">{linkedGoalName}</span>
                      <ArrowRight size={12} className="text-muted-foreground" />
                      <span className="text-sm text-primary">${Number(budget.savings_allocation).toLocaleString()}/month</span>
                    </div>
                  )}

                  {/* Progress Bar (for expense budgets) */}
                  {Number(budget.expense_allocation) > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Expense Progress</span>
                        <span>{expensePercentage.toFixed(1)}%</span>
                      </div>
                      <ProgressBar value={expenseSpent} max={Number(budget.expense_allocation)} />
                    </div>
                  )}

                  {/* Total Allocation Badge */}
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Allocation</span>
                    <span className="text-sm font-bold">${totalAllocation.toLocaleString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Budget Dialog */}
      <AddBudgetDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleRefresh}
      />

      {/* Edit Budget Dialog */}
      <EditBudgetDialog
        open={!!editingBudget}
        onOpenChange={(open) => !open && setEditingBudget(null)}
        budget={editingBudget}
        onSuccess={handleRefresh}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{budgetToDelete?.name}" budget? 
              This action cannot be undone. Expenses linked to this budget will no longer have a budget association.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setBudgetToDelete(null);
                setIsDeleteDialogOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBudget}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
