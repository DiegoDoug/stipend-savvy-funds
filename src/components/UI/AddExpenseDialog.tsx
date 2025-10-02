import { useState } from "react";
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { getExpenseCategories, addCustomCategory } = useCategories();
  const { checkAndNotify } = useAccountStatus();

  const expenseCategories = getExpenseCategories();

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

    if (!amount || !description || (!category && !customCategory)) {
      toast({
        title: "Error", 
        description: "Please fill in all required fields.",
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
      
      const { error } = await supabase
        .from("transactions")
        .insert([
          {
            user_id: user.id,
            type: "expense",
            amount: parseFloat(amount),
            description,
            category: finalCategory,
            date,
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
      setDate(new Date().toISOString().split('T')[0]);
      onExpenseAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding expense:", error);
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}