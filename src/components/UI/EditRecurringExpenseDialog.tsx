import { useState, useMemo } from 'react';
import { Calendar, DollarSign, Plus, Minus, Pause, Play } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorLogger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  budget_id: string | null;
  status: string;
  subscription_group_id: string | null;
}

interface EditRecurringExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  transactions: Transaction[];
  onUpdate: () => void;
}

export function EditRecurringExpenseDialog({
  open,
  onOpenChange,
  groupId,
  transactions,
  onUpdate,
}: EditRecurringExpenseDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const sortedTransactions = useMemo(() => 
    [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [transactions]
  );
  
  const firstTxn = sortedTransactions[0];
  const futureTxns = sortedTransactions.filter(t => new Date(t.date) >= new Date());
  const lastTxn = sortedTransactions[sortedTransactions.length - 1];
  
  const [newAmount, setNewAmount] = useState(Number(firstTxn?.amount || 0).toString());
  const [newDescription, setNewDescription] = useState(firstTxn?.description || '');
  const [monthsToAdd, setMonthsToAdd] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleUpdateFutureTransactions = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Update all future transactions with new amount and description
      const futureIds = futureTxns.map(t => t.id);
      
      if (futureIds.length > 0) {
        const { error } = await supabase
          .from('transactions')
          .update({
            amount: parseFloat(newAmount),
            description: newDescription,
          })
          .in('id', futureIds)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      toast({ title: 'Updated', description: `${futureIds.length} future transactions updated` });
      onUpdate();
    } catch (error) {
      logError(error, 'EditRecurringExpenseDialog:handleUpdateFutureTransactions');
      toast({ title: 'Error', description: 'Failed to update transactions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExtendRecurrence = async () => {
    if (!user || monthsToAdd <= 0 || !lastTxn) return;
    setLoading(true);

    try {
      const newTransactions = [];
      const lastDate = new Date(lastTxn.date);

      for (let i = 1; i <= monthsToAdd; i++) {
        const newDate = new Date(lastDate);
        newDate.setMonth(newDate.getMonth() + i);
        
        newTransactions.push({
          user_id: user.id,
          description: newDescription || firstTxn.description,
          amount: parseFloat(newAmount) || Number(firstTxn.amount),
          date: newDate.toISOString().split('T')[0],
          category: firstTxn.category,
          budget_id: firstTxn.budget_id,
          type: 'expense',
          is_recurring: true,
          subscription_group_id: groupId,
          status: 'active',
        });
      }

      const { error } = await supabase
        .from('transactions')
        .insert(newTransactions);

      if (error) throw error;

      toast({ title: 'Extended', description: `Added ${monthsToAdd} more months` });
      setMonthsToAdd(0);
      onUpdate();
    } catch (error) {
      logError(error, 'EditRecurringExpenseDialog:handleExtendRecurrence');
      toast({ title: 'Error', description: 'Failed to extend recurrence', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePauseAll = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const futureIds = futureTxns.map(t => t.id);
      
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'paused' })
        .in('id', futureIds)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Paused', description: 'All future occurrences paused' });
      onUpdate();
    } catch (error) {
      logError(error, 'EditRecurringExpenseDialog:handlePauseAll');
      toast({ title: 'Error', description: 'Failed to pause transactions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateAll = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'active' })
        .eq('subscription_group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Reactivated', description: 'All occurrences reactivated' });
      onUpdate();
    } catch (error) {
      logError(error, 'EditRecurringExpenseDialog:handleReactivateAll');
      toast({ title: 'Error', description: 'Failed to reactivate transactions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const allPaused = futureTxns.every(t => t.status === 'paused');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Recurring Expense</DialogTitle>
          <DialogDescription>
            Manage "{firstTxn?.description}" recurring expense group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-accent/20">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold">{transactions.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <p className="text-xs text-muted-foreground">Upcoming</p>
              <p className="font-semibold text-primary">{futureTxns.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Past</p>
              <p className="font-semibold">{transactions.length - futureTxns.length}</p>
            </div>
          </div>

          {/* Edit Amount & Description */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Update Future Transactions</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    id="amount"
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="pl-9"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
            </div>
            <Button 
              onClick={handleUpdateFutureTransactions} 
              disabled={loading || futureTxns.length === 0}
              className="w-full"
              size="sm"
            >
              Update {futureTxns.length} Future Transactions
            </Button>
          </div>

          {/* Extend Recurrence */}
          <div className="space-y-3 pt-3 border-t border-border">
            <h4 className="text-sm font-medium">Extend Recurrence</h4>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonthsToAdd(Math.max(0, monthsToAdd - 1))}
                disabled={monthsToAdd <= 0}
              >
                <Minus size={16} />
              </Button>
              <div className="flex-1 text-center">
                <p className="font-semibold text-lg">{monthsToAdd}</p>
                <p className="text-xs text-muted-foreground">months to add</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonthsToAdd(monthsToAdd + 1)}
              >
                <Plus size={16} />
              </Button>
            </div>
            <Button 
              onClick={handleExtendRecurrence} 
              disabled={loading || monthsToAdd <= 0}
              variant="secondary"
              className="w-full"
              size="sm"
            >
              <Calendar size={16} className="mr-2" />
              Add {monthsToAdd} More Months
            </Button>
          </div>

          {/* Pause/Reactivate */}
          <div className="pt-3 border-t border-border">
            {allPaused ? (
              <Button
                onClick={handleReactivateAll}
                disabled={loading}
                variant="outline"
                className="w-full text-success border-success/50 hover:bg-success/10"
                size="sm"
              >
                <Play size={16} className="mr-2" />
                Reactivate All Occurrences
              </Button>
            ) : (
              <Button
                onClick={handlePauseAll}
                disabled={loading || futureTxns.length === 0}
                variant="outline"
                className="w-full text-warning border-warning/50 hover:bg-warning/10"
                size="sm"
              >
                <Pause size={16} className="mr-2" />
                Pause All Future Occurrences
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
