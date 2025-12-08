import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Wallet, PiggyBank, AlertCircle, Edit3 } from 'lucide-react';
import { useBudgets, Budget } from '@/hooks/useBudgets';

interface EditBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget | null;
  onSuccess?: () => void;
}

export default function EditBudgetDialog({ open, onOpenChange, budget, onSuccess }: EditBudgetDialogProps) {
  const { savingsGoals, totals, validateAllocation, updateBudget, budgets } = useBudgets();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expenseAllocation, setExpenseAllocation] = useState('');
  const [savingsAllocation, setSavingsAllocation] = useState('');
  const [linkedGoalId, setLinkedGoalId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Populate form when budget changes
  useEffect(() => {
    if (budget && open) {
      setName(budget.name);
      setDescription(budget.description || '');
      setExpenseAllocation(String(budget.expense_allocation));
      setSavingsAllocation(String(budget.savings_allocation));
      setLinkedGoalId(budget.linked_savings_goal_id || '');
      setValidationError(null);
    }
  }, [budget, open]);

  // Validate on input change
  useEffect(() => {
    if (!budget) return;
    
    const expense = Number(expenseAllocation) || 0;
    const savings = Number(savingsAllocation) || 0;
    
    if (expense > 0 || savings > 0) {
      const validation = validateAllocation(expense, savings, budget.id);
      if (!validation.isValid) {
        setValidationError(`Exceeds income by $${validation.exceededBy.toLocaleString()}`);
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  }, [expenseAllocation, savingsAllocation, validateAllocation, budget]);

  const handleSubmit = async () => {
    if (!budget || !name.trim()) return;
    
    const expense = Number(expenseAllocation) || 0;
    const savings = Number(savingsAllocation) || 0;
    
    if (expense === 0 && savings === 0) {
      setValidationError('At least one allocation is required');
      return;
    }

    setLoading(true);
    const success = await updateBudget(budget.id, {
      name: name.trim(),
      description: description.trim() || null,
      expense_allocation: expense,
      savings_allocation: savings,
      linked_savings_goal_id: linkedGoalId || null,
    });
    setLoading(false);

    if (success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  if (!budget) return null;

  const totalAllocation = (Number(expenseAllocation) || 0) + (Number(savingsAllocation) || 0);
  
  // Calculate remaining excluding this budget
  const otherBudgetsTotal = budgets
    .filter(b => b.id !== budget.id)
    .reduce((sum, b) => sum + Number(b.expense_allocation) + Number(b.savings_allocation), 0);
  const remainingAfter = totals.monthlyIncome - otherBudgetsTotal - totalAllocation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-primary" />
            Edit Budget
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Budget Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Budget Name</Label>
            <Input
              id="edit-name"
              placeholder="e.g., Monthly Living, Emergency Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Textarea
              id="edit-description"
              placeholder="What is this budget for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Allocations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-expense" className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-warning" />
                Expense Allocation
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="edit-expense"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseAllocation}
                  onChange={(e) => setExpenseAllocation(e.target.value)}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Spent: ${Number(budget.expense_spent).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-savings" className="flex items-center gap-1.5">
                <PiggyBank className="w-3.5 h-3.5 text-success" />
                Savings Allocation
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="edit-savings"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={savingsAllocation}
                  onChange={(e) => setSavingsAllocation(e.target.value)}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-transfers at month reset
              </p>
            </div>
          </div>

          {/* Link Savings Goal (only if savings allocation > 0) */}
          {Number(savingsAllocation) > 0 && (
            <div className="space-y-2">
              <Label htmlFor="edit-goal" className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                Link to Savings Goal (optional)
              </Label>
              <Select value={linkedGoalId || "none"} onValueChange={(val) => setLinkedGoalId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal for auto-transfer" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="none">No linked goal</SelectItem>
                  {savingsGoals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.name} (${goal.current_amount.toLocaleString()} / ${goal.target_amount.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Summary & Validation */}
          <div className="p-3 rounded-lg bg-accent/30 border border-border/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly Income</span>
              <span className="font-medium">${totals.monthlyIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Other Budgets</span>
              <span className="font-medium">${otherBudgetsTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">This Budget</span>
              <span className="font-medium text-primary">${totalAllocation.toLocaleString()}</span>
            </div>
            <div className="border-t border-border/50 pt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining After</span>
              <span className={`font-bold ${remainingAfter >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${remainingAfter.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {validationError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-primary to-primary-glow"
              disabled={loading || !name.trim() || !!validationError || totalAllocation === 0}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
