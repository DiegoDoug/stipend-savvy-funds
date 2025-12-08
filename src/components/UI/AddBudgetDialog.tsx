import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Wallet, PiggyBank, AlertCircle } from 'lucide-react';
import { useBudgets, SavingsGoalOption } from '@/hooks/useBudgets';

interface AddBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AddBudgetDialog({ open, onOpenChange, onSuccess }: AddBudgetDialogProps) {
  const { savingsGoals, totals, validateAllocation, createBudget } = useBudgets();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expenseAllocation, setExpenseAllocation] = useState('');
  const [savingsAllocation, setSavingsAllocation] = useState('');
  const [linkedGoalId, setLinkedGoalId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setExpenseAllocation('');
      setSavingsAllocation('');
      setLinkedGoalId('');
      setValidationError(null);
    }
  }, [open]);

  // Validate on input change
  useEffect(() => {
    const expense = Number(expenseAllocation) || 0;
    const savings = Number(savingsAllocation) || 0;
    
    if (expense > 0 || savings > 0) {
      const validation = validateAllocation(expense, savings);
      if (!validation.isValid) {
        setValidationError(`Exceeds income by $${validation.exceededBy.toLocaleString()}`);
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  }, [expenseAllocation, savingsAllocation, validateAllocation]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    const expense = Number(expenseAllocation) || 0;
    const savings = Number(savingsAllocation) || 0;
    
    if (expense === 0 && savings === 0) {
      setValidationError('At least one allocation is required');
      return;
    }

    setLoading(true);
    const success = await createBudget(
      name.trim(),
      expense,
      savings,
      description.trim() || undefined,
      linkedGoalId || undefined
    );
    setLoading(false);

    if (success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const totalAllocation = (Number(expenseAllocation) || 0) + (Number(savingsAllocation) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Create New Budget
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Budget Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Budget Name</Label>
            <Input
              id="name"
              placeholder="e.g., Monthly Living, Emergency Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What is this budget for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Allocations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense" className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-warning" />
                Expense Allocation
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="expense"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseAllocation}
                  onChange={(e) => setExpenseAllocation(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="savings" className="flex items-center gap-1.5">
                <PiggyBank className="w-3.5 h-3.5 text-success" />
                Savings Allocation
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="savings"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={savingsAllocation}
                  onChange={(e) => setSavingsAllocation(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Link Savings Goal (only if savings allocation > 0) */}
          {Number(savingsAllocation) > 0 && (
            <div className="space-y-2">
              <Label htmlFor="goal" className="flex items-center gap-1.5">
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
              <p className="text-xs text-muted-foreground">
                Savings will auto-transfer to this goal at month reset
              </p>
            </div>
          )}

          {/* Summary & Validation */}
          <div className="p-3 rounded-lg bg-accent/30 border border-border/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly Income</span>
              <span className="font-medium">${totals.monthlyIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Already Allocated</span>
              <span className="font-medium">${totals.totalAllocation.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">This Budget</span>
              <span className="font-medium text-primary">${totalAllocation.toLocaleString()}</span>
            </div>
            <div className="border-t border-border/50 pt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining After</span>
              <span className={`font-bold ${(totals.remainingToAllocate - totalAllocation) >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${(totals.remainingToAllocate - totalAllocation).toLocaleString()}
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
              {loading ? 'Creating...' : 'Create Budget'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
