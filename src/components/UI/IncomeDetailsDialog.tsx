import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  user_id?: string;
}

interface IncomeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income: Transaction | null;
}

export default function IncomeDetailsDialog({ open, onOpenChange, income }: IncomeDetailsDialogProps) {
  if (!income) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Income Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Description</p>
            <p className="font-medium">{income.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Amount</p>
              <p className="font-semibold text-green-600 dark:text-green-400 text-lg">
                ${Number(income.amount).toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Date</p>
              <p className="font-medium">{format(new Date(income.date), 'MMM dd, yyyy')}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Category</p>
            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
              {income.category}
            </Badge>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Transaction ID</p>
            <p className="text-xs font-mono text-muted-foreground">{income.id}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
