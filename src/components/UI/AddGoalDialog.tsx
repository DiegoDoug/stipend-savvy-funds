import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAccountStatus } from "@/hooks/useAccountStatus";

interface AddGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalAdded?: () => void;
}

export default function AddGoalDialog({ open, onOpenChange, onGoalAdded }: AddGoalDialogProps) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { checkAndNotify } = useAccountStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkAndNotify()) {
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add a goal",
        variant: "destructive",
      });
      return;
    }

    if (!name || !targetAmount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("savings_goals").insert({
        user_id: user.id,
        name,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount) || 0,
        description: description || null,
        target_date: targetDate || null,
        status: "active",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Savings goal added successfully",
      });

      // Reset form
      setName("");
      setTargetAmount("");
      setCurrentAmount("0");
      setDescription("");
      setTargetDate("");
      onOpenChange(false);
      
      if (onGoalAdded) {
        onGoalAdded();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add goal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set Savings Goal</DialogTitle>
          <DialogDescription>
            Create a new savings goal to track your progress
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Emergency Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Target Amount *</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="1000.00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentAmount">Current Amount</Label>
              <Input
                id="currentAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date (Optional)</Label>
            <Input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Why are you saving for this goal?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
