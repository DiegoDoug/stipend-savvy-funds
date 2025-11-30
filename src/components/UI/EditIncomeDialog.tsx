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
  onUpdate: (data: { amount: number; description: string; category: string; date: string }) => void;
}

export default function EditIncomeDialog({
  open,
  onOpenChange,
  income,
  onUpdate
}: EditIncomeDialogProps) {
  const [amount, setAmount] = useState(income.amount.toString());
  const [description, setDescription] = useState(income.description);
  const [category, setCategory] = useState(income.category);
  const [date, setDate] = useState(income.date);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    if (!description.trim()) {
      return;
    }

    setLoading(true);
    await onUpdate({ amount: numAmount, description, category, date });
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
            <Label htmlFor="description">Description</Label>
            <Input 
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Monthly Stipend"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              required
            >
              <option value="stipend">Stipend</option>
              <option value="scholarship">Scholarship</option>
              <option value="refund">Refund</option>
              <option value="side-gig">Side Gig</option>
              <option value="gift">Gift</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input 
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
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
