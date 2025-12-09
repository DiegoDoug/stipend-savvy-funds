import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useLanguage } from "@/hooks/useLanguage";
import { expenseSchema } from "@/lib/validation";
import { logError, getUserFriendlyErrorMessage } from "@/lib/errorLogger";
import { Wallet, AlertCircle, Repeat, Info, ScanLine, ImageIcon, CheckCircle2 } from "lucide-react";
import { addMonths, format } from "date-fns";
import ReceiptScannerModal, { ReceiptExpenseData } from "./ReceiptScannerModal";

interface Budget {
  id: string;
  name: string;
  expense_allocation: number;
  expense_spent: number;
}

interface PrefilledData {
  amount?: number;
  description?: string;
  category?: string;
  date?: string;
  receiptPath?: string;
  ocrVendor?: string;
  ocrAmount?: number;
  ocrDate?: string;
}

interface AddExpenseDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onExpenseAdded?: () => void;
  showTrigger?: boolean;
  prefilledData?: PrefilledData;
}

export default function AddExpenseDialog({ open, onOpenChange, onExpenseAdded, prefilledData }: AddExpenseDialogProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [pendingReceiptData, setPendingReceiptData] = useState<PrefilledData | null>(null);
  
  // Recurring expense state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState(3);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { getExpenseCategories, addCustomCategory } = useCategories();
  const { checkAndNotify } = useAccountStatus();

  const expenseCategories = getExpenseCategories();

  // Apply prefilled data when it changes
  useEffect(() => {
    if (prefilledData) {
      if (prefilledData.amount) setAmount(prefilledData.amount.toString());
      if (prefilledData.description) setDescription(prefilledData.description);
      if (prefilledData.category) setCategory(prefilledData.category);
      if (prefilledData.date) setDate(prefilledData.date);
    }
  }, [prefilledData]);

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
        title: t('common.error'),
        description: "You must be logged in to add an expense.",
        variant: "destructive",
      });
      return;
    }

    if (!amount || !description || (!category && !customCategory) || !budgetId) {
      toast({
        title: t('common.error'), 
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
      
      // Generate a subscription group ID for recurring expenses
      const subscriptionGroupId = isRecurring ? crypto.randomUUID() : null;
      
      if (isRecurring) {
        // Create multiple transactions for recurring expense
        const transactions = [];
        const baseDate = new Date(date);
        
        for (let i = 0; i < recurringMonths; i++) {
          const expenseDate = addMonths(baseDate, i);
          transactions.push({
            user_id: user.id,
            type: "expense",
            budget_id: budgetId,
            amount: validatedData.amount,
            description: validatedData.description,
            category: validatedData.category,
            date: format(expenseDate, 'yyyy-MM-dd'),
            is_recurring: true,
            subscription_group_id: subscriptionGroupId,
          });
        }
        
        const { error } = await supabase
          .from("transactions")
          .insert(transactions);

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: `Created ${recurringMonths} recurring expense entries!`,
        });
      } else {
        // Single expense - include receipt data if available
        const expenseInsert = {
          user_id: user.id,
          type: "expense" as const,
          budget_id: budgetId,
          is_recurring: false,
          amount: validatedData.amount,
          description: validatedData.description,
          category: validatedData.category,
          date: validatedData.date,
          receipt_url: pendingReceiptData?.receiptPath || null,
          ocr_vendor: pendingReceiptData?.ocrVendor || null,
          ocr_amount: pendingReceiptData?.ocrAmount || null,
          ocr_date: pendingReceiptData?.ocrDate || null,
        };

        const { error } = await supabase
          .from("transactions")
          .insert([expenseInsert]);

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: "Expense added successfully!",
        });
      }

      // Reset form
      setAmount("");
      setDescription("");
      setCategory("");
      setCustomCategory("");
      setBudgetId("");
      setDate(new Date().toISOString().split('T')[0]);
      setBudgetWarning(null);
      setIsRecurring(false);
      setRecurringMonths(3);
      setPendingReceiptData(null);
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

  // Preview dates for recurring expense
  const getRecurringPreview = () => {
    if (!isRecurring) return null;
    const baseDate = new Date(date);
    const dates = [];
    for (let i = 0; i < Math.min(recurringMonths, 6); i++) {
      dates.push(format(addMonths(baseDate, i), 'MMM yyyy'));
    }
    if (recurringMonths > 6) {
      dates.push(`... +${recurringMonths - 6} more`);
    }
    return dates.join(', ');
  };

  const handleReceiptData = (data: PrefilledData) => {
    if (data.amount) setAmount(data.amount.toString());
    if (data.description) setDescription(data.description);
    if (data.category) setCategory(data.category);
    if (data.date) setDate(data.date);
    // Store receipt data for when the expense is created
    if (data.receiptPath) {
      setPendingReceiptData(data);
    }
    setShowReceiptScanner(false);
  };

  return (
    <>
      <ReceiptScannerModal
        open={showReceiptScanner}
        onOpenChange={setShowReceiptScanner}
        mode="create"
        onCreateExpense={handleReceiptData}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{t('dialog.addNewExpense')}</span>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setShowReceiptScanner(true)}
                className="gap-2"
              >
                <ScanLine className="w-4 h-4" />
                Scan Receipt
              </Button>
            </DialogTitle>
            <DialogDescription>
              {t('dialog.addNewExpenseDesc')}
            </DialogDescription>
          </DialogHeader>
          
          {/* Receipt attached indicator */}
          {pendingReceiptData?.receiptPath && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30 text-success text-sm mb-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <ImageIcon className="w-4 h-4 flex-shrink-0" />
              <span>Receipt image will be attached to this expense</span>
            </div>
          )}
          
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
            
            <div className="grid gap-2">
              <Label htmlFor="description">{t('form.description')}</Label>
              <Input
                id="description"
                placeholder={t('form.whatDidYouSpendOn')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Budget Selection */}
            <div className="grid gap-2">
              <Label htmlFor="budget" className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-warning" />
                {t('nav.budget')}
              </Label>
              <Select value={budgetId} onValueChange={setBudgetId} required>
                <SelectTrigger id="budget">
                  <SelectValue placeholder={t('form.selectBudget')} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-md z-50">
                  {budgets.length === 0 ? (
                    <SelectItem value="no-budgets" disabled>
                      {t('form.noBudgetsWithExpense')}
                    </SelectItem>
                  ) : (
                    budgets.map((budget) => {
                      const remaining = Number(budget.expense_allocation) - Number(budget.expense_spent);
                      return (
                        <SelectItem key={budget.id} value={budget.id}>
                          {budget.name} (${remaining.toLocaleString()} {t('common.remaining').toLowerCase()})
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
              <Label htmlFor="category">{t('form.category')}</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('form.selectCategory')} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-md z-50">
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label} {cat.isCustom && `(${t('common.custom')})`}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">{t('form.addCustomCategory')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {category === "custom" && (
              <div className="grid gap-2">
                <Label htmlFor="customCategory">{t('form.customCategoryName')}</Label>
                <Input
                  id="customCategory"
                  placeholder={t('form.enterCategoryName')}
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="date">{t('form.date')}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Recurring Expense Section */}
            <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="recurring" 
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked === true)}
                />
                <Label 
                  htmlFor="recurring" 
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                >
                  <Repeat className="h-4 w-4 text-primary" />
                  {t('dialog.recurringExpense')}
                </Label>
              </div>
              
              {isRecurring && (
                <div className="space-y-3 pl-6">
                  <div className="grid gap-2">
                    <Label htmlFor="months" className="text-sm">{t('dialog.numberOfMonths')}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="months"
                        type="number"
                        min="2"
                        max="24"
                        value={recurringMonths}
                        onChange={(e) => setRecurringMonths(Math.max(2, Math.min(24, parseInt(e.target.value) || 3)))}
                        className="w-20 h-8"
                      />
                      <span className="text-sm text-muted-foreground">{t('common.months')}</span>
                    </div>
                  </div>
                  
                  {amount && (
                    <div className="flex items-start gap-2 p-2 rounded bg-primary/5 border border-primary/20">
                      <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">
                          Total: ${(parseFloat(amount) * recurringMonths).toFixed(2)} over {recurringMonths} months
                        </p>
                        <p>{getRecurringPreview()}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || budgets.length === 0}>
              {isLoading ? t('common.adding') : isRecurring ? `${t('common.add')} ${recurringMonths} ${t('expenses.title')}` : t('expenses.addExpense')}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </>
  );
}