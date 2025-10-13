import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categoryLabels } from "@/lib/mockData";

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: any;
  onUpdate: (updates: { description: string; amount: number; date: string; category: string }) => void;
}

export default function EditExpenseDialog({ open, onOpenChange, expense, onUpdate }: EditExpenseDialogProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (expense) {
      setDescription(expense.description || "");
      setAmount(expense.amount.toString());
      setDate(expense.date || "");
      setCategory(expense.category || "");
    }
  }, [expense]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      onUpdate(numAmount);
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Description</Label>
              <div className="text-sm text-muted-foreground">{expense.description}</div>
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <div className="text-sm text-muted-foreground capitalize">{expense.category.replace("-", " ")}</div>
            </div>

            <div className="grid gap-2">
              <Label>Date</Label>
              <div className="text-sm text-muted-foreground">{new Date(expense.date).toLocaleDateString()}</div>
            </div>

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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Expense</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
