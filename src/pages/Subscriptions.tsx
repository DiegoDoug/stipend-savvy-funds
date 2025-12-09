import { useState, useMemo, useEffect } from 'react';
import { RefreshCw, Bell, Calendar, DollarSign, Pause, Play, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import StatCard from '@/components/UI/StatCard';
import SubscriptionTracker from '@/components/UI/SubscriptionTracker';
import { BillingHistory } from '@/components/UI/BillingHistory';
import { EditRecurringExpenseDialog } from '@/components/UI/EditRecurringExpenseDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TrackedSubscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string | null;
  reminder_date: string | null;
  reminder_note: string | null;
  is_active: boolean;
  status: string;
  next_billing_date: string | null;
}

export default function Subscriptions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { transactions, refetch } = useFinanceData();
  
  const [trackedSubscriptions, setTrackedSubscriptions] = useState<TrackedSubscription[]>([]);
  const [editingRecurring, setEditingRecurring] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  // Fetch tracked subscriptions
  const fetchSubscriptions = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('tracked_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTrackedSubscriptions(data.map(s => ({
        ...s,
        status: s.status || 'active',
      })));
    }
  };

  // Get recurring expense groups - cast transactions to access new fields
  const recurringGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    (transactions as any[])
      .filter(t => t.type === 'expense' && t.is_recurring && t.subscription_group_id)
      .forEach(t => {
        if (!groups[t.subscription_group_id!]) {
          groups[t.subscription_group_id!] = [];
        }
        groups[t.subscription_group_id!].push(t);
      });

    return Object.entries(groups).map(([groupId, txns]) => {
      const sortedTxns = txns.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstTxn = sortedTxns[0];
      const futureTxns = sortedTxns.filter((t: any) => new Date(t.date) >= new Date());
      const pastTxns = sortedTxns.filter((t: any) => new Date(t.date) < new Date());

      return {
        groupId,
        name: firstTxn.description,
        amount: Number(firstTxn.amount),
        category: firstTxn.category,
        totalOccurrences: txns.length,
        futureOccurrences: futureTxns.length,
        pastOccurrences: pastTxns.length,
        isPaused: futureTxns.every((t: any) => t.status === 'paused'),
        transactions: sortedTxns,
      };
    });
  }, [transactions]);

  // Calculate stats
  const activeSubscriptions = trackedSubscriptions.filter(s => s.status === 'active');
  const pausedSubscriptions = trackedSubscriptions.filter(s => s.status === 'paused');
  const cancelledSubscriptions = trackedSubscriptions.filter(s => s.status === 'cancelled');

  const monthlyTotal = activeSubscriptions.reduce((sum, s) => {
    if (s.frequency === 'monthly') return sum + Number(s.amount);
    if (s.frequency === 'yearly') return sum + Number(s.amount) / 12;
    if (s.frequency === 'weekly') return sum + Number(s.amount) * 4;
    return sum;
  }, 0);

  const yearlyTotal = monthlyTotal * 12;

  const handlePauseSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('tracked_subscriptions')
        .update({ status: 'paused', is_active: false })
        .eq('id', subscriptionId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      toast({ title: 'Subscription paused' });
      fetchSubscriptions();
    } catch (error) {
      console.error('Error pausing subscription:', error);
      toast({ title: 'Error', description: 'Failed to pause subscription', variant: 'destructive' });
    }
  };

  const handleReactivateSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('tracked_subscriptions')
        .update({ status: 'active', is_active: true })
        .eq('id', subscriptionId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      toast({ title: 'Subscription reactivated' });
      fetchSubscriptions();
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast({ title: 'Error', description: 'Failed to reactivate subscription', variant: 'destructive' });
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('tracked_subscriptions')
        .update({ status: 'cancelled', is_active: false })
        .eq('id', subscriptionId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      toast({ title: 'Subscription cancelled' });
      fetchSubscriptions();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({ title: 'Error', description: 'Failed to cancel subscription', variant: 'destructive' });
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('tracked_subscriptions')
        .delete()
        .eq('id', subscriptionId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      toast({ title: 'Subscription deleted' });
      fetchSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({ title: 'Error', description: 'Failed to delete subscription', variant: 'destructive' });
    }
  };

  const handlePauseRecurringGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'paused' })
        .eq('subscription_group_id', groupId)
        .eq('user_id', user?.id)
        .gte('date', new Date().toISOString().split('T')[0]);

      if (error) throw error;
      
      toast({ title: 'Recurring expenses paused' });
      refetch.transactions();
    } catch (error) {
      console.error('Error pausing recurring expenses:', error);
      toast({ title: 'Error', description: 'Failed to pause recurring expenses', variant: 'destructive' });
    }
  };

  const handleReactivateRecurringGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'active' })
        .eq('subscription_group_id', groupId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      toast({ title: 'Recurring expenses reactivated' });
      refetch.transactions();
    } catch (error) {
      console.error('Error reactivating recurring expenses:', error);
      toast({ title: 'Error', description: 'Failed to reactivate recurring expenses', variant: 'destructive' });
    }
  };

  const handleDeleteFutureRecurring = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('subscription_group_id', groupId)
        .eq('user_id', user?.id)
        .gte('date', new Date().toISOString().split('T')[0]);

      if (error) throw error;
      
      toast({ title: 'Future recurring expenses deleted' });
      refetch.transactions();
    } catch (error) {
      console.error('Error deleting recurring expenses:', error);
      toast({ title: 'Error', description: 'Failed to delete recurring expenses', variant: 'destructive' });
    }
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Subscriptions</h1>
            <p className="text-muted-foreground">Manage subscriptions and recurring expenses</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-tour="subscription-stats">
          <StatCard
            title="Monthly Cost"
            value={`$${monthlyTotal.toFixed(0)}`}
            subtitle={`${activeSubscriptions.length} active subscriptions`}
            icon={<DollarSign size={24} />}
          />
          <StatCard
            title="Yearly Cost"
            value={`$${yearlyTotal.toFixed(0)}`}
            subtitle="Projected annual spending"
            icon={<Calendar size={24} />}
          />
          <StatCard
            title="Upcoming Reminders"
            value={trackedSubscriptions.filter(s => s.reminder_date).length.toString()}
            subtitle="Cancellation reminders set"
            icon={<Bell size={24} />}
          />
        </div>

        {/* Subscription Tracker - for detecting and tracking */}
        <div data-tour="subscription-tracker">
          <SubscriptionTracker />
        </div>

        {/* Tabs for subscription status */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Play size={14} />
              Active ({activeSubscriptions.length})
            </TabsTrigger>
            <TabsTrigger value="paused" className="flex items-center gap-2">
              <Pause size={14} />
              Paused ({pausedSubscriptions.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center gap-2">
              <Trash2 size={14} />
              Cancelled ({cancelledSubscriptions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {activeSubscriptions.length === 0 ? (
              <div className="budget-card text-center py-8">
                <RefreshCw size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No active subscriptions</p>
              </div>
            ) : (
              activeSubscriptions.map(sub => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  onPause={() => handlePauseSubscription(sub.id)}
                  onDelete={() => handleDeleteSubscription(sub.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="paused" className="space-y-3">
            {pausedSubscriptions.length === 0 ? (
              <div className="budget-card text-center py-8">
                <Pause size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No paused subscriptions</p>
              </div>
            ) : (
              pausedSubscriptions.map(sub => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  onReactivate={() => handleReactivateSubscription(sub.id)}
                  onCancel={() => handleCancelSubscription(sub.id)}
                  onDelete={() => handleDeleteSubscription(sub.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-3">
            {cancelledSubscriptions.length === 0 ? (
              <div className="budget-card text-center py-8">
                <Trash2 size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No cancelled subscriptions</p>
              </div>
            ) : (
              cancelledSubscriptions.map(sub => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  onReactivate={() => handleReactivateSubscription(sub.id)}
                  onDelete={() => handleDeleteSubscription(sub.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Recurring Expenses Section */}
        <div className="budget-card" data-tour="recurring-expenses">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RefreshCw size={20} className="text-primary" />
            Recurring Expenses
          </h2>
          
          {recurringGroups.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No recurring expenses</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Create recurring expenses when adding new expenses
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recurringGroups.map(group => (
                <div 
                  key={group.groupId} 
                  className={`p-4 rounded-lg border transition-colors ${
                    group.isPaused 
                      ? 'bg-muted/30 border-muted-foreground/20' 
                      : 'bg-accent/20 border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{group.name}</p>
                        {group.isPaused && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted-foreground/20 text-muted-foreground">
                            Paused
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>${group.amount.toFixed(2)}/month</span>
                        <span>•</span>
                        <span>{group.futureOccurrences} upcoming</span>
                        <span>•</span>
                        <span>{group.pastOccurrences} past</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRecurring(group.groupId)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Pencil size={16} />
                      </Button>
                      {group.isPaused ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReactivateRecurringGroup(group.groupId)}
                          className="text-success hover:text-success/80"
                        >
                          <Play size={16} />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePauseRecurringGroup(group.groupId)}
                          className="text-warning hover:text-warning/80"
                        >
                          <Pause size={16} />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Future Occurrences</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete {group.futureOccurrences} future occurrences of "{group.name}". 
                              Past transactions will be preserved. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteFutureRecurring(group.groupId)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Future
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Billing History */}
        <BillingHistory subscriptions={trackedSubscriptions} />

        {/* Edit Recurring Dialog */}
        {editingRecurring && (
          <EditRecurringExpenseDialog
            open={!!editingRecurring}
            onOpenChange={(open) => !open && setEditingRecurring(null)}
            groupId={editingRecurring}
            transactions={recurringGroups.find(g => g.groupId === editingRecurring)?.transactions || []}
            onUpdate={() => {
              refetch.transactions();
              setEditingRecurring(null);
            }}
          />
        )}
      </div>
  );
}

interface SubscriptionCardProps {
  subscription: TrackedSubscription;
  onPause?: () => void;
  onReactivate?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

function SubscriptionCard({ subscription, onPause, onReactivate, onCancel, onDelete }: SubscriptionCardProps) {
  const isActive = subscription.status === 'active';
  const isPaused = subscription.status === 'paused';
  
  return (
    <div className={`budget-card p-4 ${!isActive && 'opacity-75'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
            <p className="font-medium">{subscription.name}</p>
            {subscription.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                {subscription.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">${Number(subscription.amount).toFixed(2)}</span>
            <span>/{subscription.frequency}</span>
            {subscription.next_billing_date && (
              <>
                <span>•</span>
                <span>Next: {subscription.next_billing_date}</span>
              </>
            )}
          </div>
          {subscription.reminder_date && (
            <div className="flex items-center gap-1 mt-2 text-xs text-warning">
              <Bell size={12} />
              <span>Reminder: {subscription.reminder_date}</span>
              {subscription.reminder_note && <span>- {subscription.reminder_note}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onReactivate && (
            <Button variant="ghost" size="sm" onClick={onReactivate} className="text-success">
              <Play size={16} />
            </Button>
          )}
          {onPause && isActive && (
            <Button variant="ghost" size="sm" onClick={onPause} className="text-warning">
              <Pause size={16} />
            </Button>
          )}
          {onCancel && isPaused && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-destructive">
              <AlertTriangle size={16} />
            </Button>
          )}
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={16} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{subscription.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}
