import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { expenseSchema } from "@/lib/validation";
import { logError, getUserFriendlyErrorMessage } from "@/lib/errorLogger";
import { Wallet, AlertCircle } from "lucide-react";

interface Budget {
  id: string;
  name: string;
  expense_allocation: number;
  expense_spent: number;
}

interface AddExpenseDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onExpenseAdded?: () => void;
  showTrigger?: boolean;
}

export default function AddExpenseDialog({ open, onOpenChange, onExpenseAdded }: AddExpenseDialogProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { getExpenseCategories, addCustomCategory } = useCategories();
  const { checkAndNotify } = useAccountStatus();

  const expenseCategories = getExpenseCategories();

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

  // Check budget remaining when amount or budget changes
  useEffect(() => {
    if (budgetId && amount) {
      const selectedBudget = budgets.find(b => b.id === budgetId);
      if (selectedBudget) {
        const remaining = Number(selectedBudget.expense_allocation) - Number(selectedBudget.expense_spent);
        const expenseAmount = parseFloat(amount) || 0;
        
        if (expenseAmount > remaining) {
          setBudgetWarning(`This expense exceeds the budget's remaining amount ($${remaining.toLocaleString()})`);
        } else {
          setBudgetWarning(null);
        }
      }
    } else {
      setBudgetWarning(null);
    }
  }, [budgetId, amount, budgets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!checkAndNotify()) {
      return;
    }
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add an expense.",
        variant: "destructive",
      });
      return;
    }

    if (!amount || !description || (!category && !customCategory) || !budgetId) {
      toast({
        title: "Error", 
        description: "Please fill in all required fields including budget.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      let finalCategory = category;
      
      // If custom category is selected, add it to the database first
      if (category === "custom" && customCategory) {
        const success = await addCustomCategory(
          customCategory.toLowerCase().replace(/\s+/g, '-'),
          customCategory,
          'expense'
        );
        if (success) {
          finalCategory = customCategory.toLowerCase().replace(/\s+/g, '-');
        } else {
          setIsLoading(false);
          return;
        }
      }
      
      // Validate input data using zod schema
      const validatedData = expenseSchema.parse({
        amount: parseFloat(amount),
        description: description.trim(),
        category: finalCategory,
        date,
      });
      
      const { error } = await supabase
        .from("transactions")
        .insert([
          {
            user_id: user.id,
            type: "expense",
            budget_id: budgetId,
            ...validatedData,
          },
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense added successfully!",
      });

      // Reset form
      setAmount("");
      setDescription("");
      setCategory("");
      setCustomCategory("");
      setBudgetId("");
      setDate(new Date().toISOString().split('T')[0]);
      setBudgetWarning(null);
      onExpenseAdded?.();
      onOpenChange?.(false);
    } catch (error: any) {
      logError(error, 'AddExpenseDialog.handleSubmit');
      
      // Handle validation errors specifically
      if (error?.name === 'ZodError') {
        const firstError = error.errors?.[0];
        toast({
          title: "Validation Error",
          description: firstError?.message || "Please check your input.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: getUserFriendlyErrorMessage(error),
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedBudget = budgets.find(b => b.id === budgetId);
  const budgetRemaining = selectedBudget 
    ? Number(selectedBudget.expense_allocation) - Number(selectedBudget.expense_spent)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Record a new expense transaction. All fields are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount ($)</Label>
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
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="What did you spend on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Budget Selection */}
            <div className="grid gap-2">
              <Label htmlFor="budget" className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-warning" />
                Budget
              </Label>
              <Select value={budgetId} onValueChange={setBudgetId} required>
                <SelectTrigger id="budget">
                  <SelectValue placeholder="Select a budget" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-md z-50">
                  {budgets.length === 0 ? (
                    <SelectItem value="no-budgets" disabled>
                      No budgets with expense allocation
                    </SelectItem>
                  ) : (
                    budgets.map((budget) => {
                      const remaining = Number(budget.expense_allocation) - Number(budget.expense_spent);
                      return (
                        <SelectItem key={budget.id} value={budget.id}>
                          {budget.name} (${remaining.toLocaleString()} remaining)
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {selectedBudget && (
                <p className="text-xs text-muted-foreground">
                  Budget: ${Number(selectedBudget.expense_spent).toLocaleString()} / ${Number(selectedBudget.expense_allocation).toLocaleString()} spent
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
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-md z-50">
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label} {cat.isCustom && "(Custom)"}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Add Custom Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {category === "custom" && (
              <div className="grid gap-2">
                <Label htmlFor="customCategory">Custom Category Name</Label>
                <Input
                  id="customCategory"
                  placeholder="Enter category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || budgets.length === 0}>
              {isLoading ? "Adding..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
