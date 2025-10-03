import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: string;
  user_id: string;
}

interface EditIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income: Transaction;
  onUpdate: (amount: number) => void;
}

export default function EditIncomeDialog({
  open,
  onOpenChange,
  income,
  onUpdate
}: EditIncomeDialogProps) {
  const [amount, setAmount] = useState(income.amount.toString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    setLoading(true);
    await onUpdate(numAmount);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Income Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input 
              value={income.description} 
              disabled 
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Input 
              value={income.category.replace('-', ' ')}
              disabled 
              className="bg-muted capitalize"
            />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input 
              value={new Date(income.date).toLocaleDateString()}
              disabled 
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-success to-success/80">
              {loading ? "Updating..." : "Update Income"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
