import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, AlertCircle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface Budget {
  id: string;
  name: string;
  expense_allocation: number;
  expense_spent: number;
}

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: any;
  onUpdate: (updates: { description: string; amount: number; date: string; category: string; budget_id: string }) => void;
}

export default function EditExpenseDialog({ open, onOpenChange, expense, onUpdate }: EditExpenseDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { getExpenseCategories } = useCategories();
  const expenseCategories = getExpenseCategories();
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);

  // Fetch budgets with expense allocation
  useEffect(() => {
    const fetchBudgets = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('budgets')
        .select('id, name, expense_allocation, expense_spent')
        .gt('expense_allocation', 0)
        .order('name');
      
      if (!error && data) {
        setBudgets(data as Budget[]);
      }
    };

    if (open) {
      fetchBudgets();
    }
  }, [user, open]);

  useEffect(() => {
    if (expense) {
      setDescription(expense.description || "");
      setAmount(expense.amount.toString());
      setDate(expense.date || "");
      setCategory(expense.category || "");
      setBudgetId(expense.budget_id || "");
    }
  }, [expense]);

  // Check budget remaining when amount or budget changes
  useEffect(() => {
    if (budgetId && amount && expense) {
      const selectedBudget = budgets.find(b => b.id === budgetId);
      if (selectedBudget) {
        // If editing and keeping the same budget, add back the original expense amount
        const originalAmount = expense.budget_id === budgetId ? Number(expense.amount) : 0;
        const remaining = Number(selectedBudget.expense_allocation) - Number(selectedBudget.expense_spent) + originalAmount;
        const expenseAmount = parseFloat(amount) || 0;
        
        if (expenseAmount > remaining) {
          setBudgetWarning(`${t('dialog.exceedsIncomeBy')} ($${remaining.toLocaleString()})`);
        } else {
          setBudgetWarning(null);
        }
      }
    } else {
      setBudgetWarning(null);
    }
  }, [budgetId, amount, budgets, expense]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0 && description.trim() && date && category && budgetId) {
      onUpdate({
        description: description.trim(),
        amount: numAmount,
        date,
        category,
        budget_id: budgetId,
      });
    }
  };

  if (!expense) return null;

  const selectedBudget = budgets.find(b => b.id === budgetId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('dialog.editExpense')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">{t('form.description')}</Label>
              <Input
                id="description"
                type="text"
                placeholder={t('form.whatDidYouSpendOn')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Budget Selection */}
            <div className="grid gap-2">
              <Label htmlFor="edit-budget" className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-warning" />
                {t('nav.budget')}
              </Label>
              <Select value={budgetId} onValueChange={setBudgetId} required>
                <SelectTrigger id="edit-budget">
                  <SelectValue placeholder={t('form.selectBudget')} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-md z-50">
                  {budgets.length === 0 ? (
                    <SelectItem value="no-budgets" disabled>
                      {t('form.noBudgetsWithExpense')}
                    </SelectItem>
                  ) : (
                    budgets.map((budget) => {
                      const originalAmount = expense.budget_id === budget.id ? Number(expense.amount) : 0;
                      const remainingAmount = Number(budget.expense_allocation) - Number(budget.expense_spent) + originalAmount;
                      return (
                        <SelectItem key={budget.id} value={budget.id}>
                          {budget.name} (${remainingAmount.toLocaleString()} {t('common.remaining')})
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {selectedBudget && (
                <p className="text-xs text-muted-foreground">
                  {t('nav.budget')}: ${Number(selectedBudget.expense_spent).toLocaleString()} / ${Number(selectedBudget.expense_allocation).toLocaleString()} {t('common.spent')}
                </p>
              )}
            </div>

            {/* Budget Warning */}
            {budgetWarning && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {budgetWarning}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="category">{t('form.category')}</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger id="category">
                  <SelectValue placeholder={t('form.selectCategory')} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-md z-50">
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">{t('form.date')}</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">{t('form.amount')} ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={budgets.length === 0 || !budgetId}>
              {t('expenses.expenseUpdated')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
