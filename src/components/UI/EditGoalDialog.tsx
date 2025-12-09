import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { useLanguage } from "@/hooks/useLanguage";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  description: string | null;
  status: string;
}

interface EditGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: SavingsGoal | null;
  onGoalUpdated?: () => void;
}

export default function EditGoalDialog({ open, onOpenChange, goal, onGoalUpdated }: EditGoalDialogProps) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { checkAndNotify } = useAccountStatus();

  // Populate form when goal changes
  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTargetAmount(goal.target_amount.toString());
      setCurrentAmount(goal.current_amount.toString());
      setDescription(goal.description || "");
      setTargetDate(goal.target_date || "");
    }
  }, [goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkAndNotify()) {
      return;
    }

    if (!goal) {
      toast({
        title: t('common.error'),
        description: t('goals.noGoalsYet'),
        variant: "destructive",
      });
      return;
    }

    if (!name || !targetAmount) {
      toast({
        title: t('common.error'),
        description: t('form.selectCategory'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const currentAmountNum = parseFloat(currentAmount) || 0;
      const targetAmountNum = parseFloat(targetAmount);
      
      // Determine status based on progress
      const status = currentAmountNum >= targetAmountNum ? 'completed' : 'active';

      const { error } = await supabase
        .from("savings_goals")
        .update({
          name,
          target_amount: targetAmountNum,
          current_amount: currentAmountNum,
          description: description || null,
          target_date: targetDate || null,
          status,
        })
        .eq("id", goal.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('goals.goalUpdated'),
      });

      onOpenChange(false);
      
      if (onGoalUpdated) {
        onGoalUpdated();
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('common.error'),
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
          <DialogTitle>{t('dialog.editGoal')}</DialogTitle>
          <DialogDescription>
            {t('goals.trackManage')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t('goals.goalName')} *</Label>
            <Input
              id="edit-name"
              placeholder={t('goals.goalName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-currentAmount">{t('goals.currentAmount')} *</Label>
              <Input
                id="edit-currentAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-targetAmount">{t('goals.targetAmount')} *</Label>
              <Input
                id="edit-targetAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="1000.00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-targetDate">{t('goals.targetDate')} ({t('common.optional')})</Label>
            <Input
              id="edit-targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">{t('goals.description')} ({t('common.optional')})</Label>
            <Textarea
              id="edit-description"
              placeholder={t('goals.description')}
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
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.updating') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
