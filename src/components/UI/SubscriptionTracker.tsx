import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CreditCard, Bell, BellOff, Trash2, Plus, Calendar,
  CheckCircle, AlertTriangle, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, isPast, isToday, addDays } from 'date-fns';

interface DetectedSubscription {
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'yearly';
  category: string;
  confidence: 'high' | 'medium' | 'low';
  annualCost: number;
  transactionIds: string[];
}

interface TrackedSubscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string | null;
  reminder_date: string | null;
  reminder_note: string | null;
  is_active: boolean;
  detected_transaction_ids: string[] | null;
  created_at: string;
}

interface SubscriptionTrackerProps {
  detectedSubscriptions: DetectedSubscription[];
  totalMonthly: number;
  totalAnnual: number;
  onRefresh?: () => void;
}

const SubscriptionTracker: React.FC<SubscriptionTrackerProps> = ({
  detectedSubscriptions,
  totalMonthly,
  totalAnnual,
  onRefresh,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trackedSubscriptions, setTrackedSubscriptions] = useState<TrackedSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<DetectedSubscription | TrackedSubscription | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');

  // Fetch tracked subscriptions
  const fetchTrackedSubscriptions = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('tracked_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setTrackedSubscriptions(data);
    }
  };

  useEffect(() => {
    fetchTrackedSubscriptions();
  }, [user]);

  // Check if a subscription is already tracked
  const isTracked = (name: string) => {
    return trackedSubscriptions.some(
      s => s.name.toLowerCase() === name.toLowerCase() && s.is_active
    );
  };

  // Track a detected subscription
  const handleTrackSubscription = async (sub: DetectedSubscription) => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tracked_subscriptions')
        .insert({
          user_id: user.id,
          name: sub.name,
          amount: sub.amount,
          frequency: sub.frequency,
          category: sub.category,
          detected_transaction_ids: sub.transactionIds,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: 'Subscription Tracked',
        description: `"${sub.name}" has been added to your tracked subscriptions.`,
      });

      fetchTrackedSubscriptions();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to track subscription.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Open reminder dialog
  const openReminderDialog = (sub: DetectedSubscription | TrackedSubscription) => {
    setSelectedSubscription(sub);
    if ('reminder_date' in sub && sub.reminder_date) {
      setReminderDate(sub.reminder_date);
      setReminderNote(sub.reminder_note || '');
    } else {
      // Default to 7 days from now
      setReminderDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
      setReminderNote('');
    }
    setShowReminderDialog(true);
  };

  // Save reminder
  const handleSaveReminder = async () => {
    if (!user || !selectedSubscription) return;
    setLoading(true);

    try {
      // Check if it's a tracked subscription or needs to be tracked first
      let subscriptionId: string;
      
      if ('id' in selectedSubscription) {
        // Already tracked
        subscriptionId = selectedSubscription.id;
      } else {
        // Need to track first
        const { data, error: insertError } = await supabase
          .from('tracked_subscriptions')
          .insert({
            user_id: user.id,
            name: selectedSubscription.name,
            amount: selectedSubscription.amount,
            frequency: selectedSubscription.frequency,
            category: selectedSubscription.category,
            detected_transaction_ids: selectedSubscription.transactionIds,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        subscriptionId = data.id;
      }

      // Update reminder
      const { error } = await supabase
        .from('tracked_subscriptions')
        .update({
          reminder_date: reminderDate || null,
          reminder_note: reminderNote || null,
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: 'Reminder Set',
        description: `Reminder set for ${format(new Date(reminderDate), 'MMM d, yyyy')}.`,
      });

      setShowReminderDialog(false);
      fetchTrackedSubscriptions();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set reminder.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove reminder
  const handleRemoveReminder = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('tracked_subscriptions')
      .update({ reminder_date: null, reminder_note: null })
      .eq('id', id);

    if (!error) {
      toast({ title: 'Reminder removed' });
      fetchTrackedSubscriptions();
    }
  };

  // Delete tracked subscription
  const handleDeleteTracked = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('tracked_subscriptions')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({ title: 'Subscription removed from tracking' });
      fetchTrackedSubscriptions();
    }
  };

  // Get reminder status
  const getReminderStatus = (reminderDate: string | null) => {
    if (!reminderDate) return null;
    const date = new Date(reminderDate);
    const daysUntil = differenceInDays(date, new Date());
    
    if (isPast(date) && !isToday(date)) {
      return { status: 'overdue', text: 'Overdue', color: 'text-destructive' };
    }
    if (isToday(date)) {
      return { status: 'today', text: 'Today!', color: 'text-warning' };
    }
    if (daysUntil <= 7) {
      return { status: 'soon', text: `${daysUntil} days`, color: 'text-warning' };
    }
    return { status: 'upcoming', text: format(date, 'MMM d'), color: 'text-muted-foreground' };
  };

  // Subscriptions with upcoming reminders
  const upcomingReminders = trackedSubscriptions
    .filter(s => s.reminder_date && s.is_active)
    .sort((a, b) => new Date(a.reminder_date!).getTime() - new Date(b.reminder_date!).getTime());

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-secondary" />
              Subscription Tracker
            </CardTitle>
            <Badge variant="secondary">
              ${totalMonthly.toFixed(0)}/mo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upcoming Reminders */}
          {upcomingReminders.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Bell className="h-3 w-3" />
                Upcoming Reminders
              </h4>
              <div className="space-y-1.5">
                {upcomingReminders.slice(0, 3).map((sub) => {
                  const status = getReminderStatus(sub.reminder_date);
                  return (
                    <div 
                      key={sub.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg border",
                        status?.status === 'overdue' ? "bg-destructive/10 border-destructive/30" :
                        status?.status === 'today' ? "bg-warning/10 border-warning/30" :
                        "bg-muted/30 border-border/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {status?.status === 'overdue' ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : status?.status === 'today' ? (
                          <Bell className="h-4 w-4 text-warning animate-pulse" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{sub.name}</p>
                          {sub.reminder_note && (
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {sub.reminder_note}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-medium", status?.color)}>
                          {status?.text}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveReminder(sub.id)}
                        >
                          <BellOff className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detected Subscriptions */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Detected Subscriptions
            </h4>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {detectedSubscriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No subscriptions detected yet
                  </p>
                ) : (
                  detectedSubscriptions.map((sub, i) => {
                    const tracked = isTracked(sub.name);
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg",
                          tracked ? "bg-success/5 border border-success/20" : "bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-1.5 rounded",
                            tracked ? "bg-success/20" : "bg-secondary/20"
                          )}>
                            {tracked ? (
                              <CheckCircle className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <CreditCard className="h-3.5 w-3.5 text-secondary" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{sub.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {sub.category} • {sub.frequency}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-sm font-semibold">${sub.amount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">${sub.annualCost}/yr</p>
                          </div>
                          {!tracked ? (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleTrackSubscription(sub)}
                                disabled={loading}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openReminderDialog(sub)}
                              >
                                <Bell className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-success"
                              onClick={() => {
                                const tracked = trackedSubscriptions.find(
                                  s => s.name.toLowerCase() === sub.name.toLowerCase()
                                );
                                if (tracked) openReminderDialog(tracked);
                              }}
                            >
                              <Bell className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Tracked Subscriptions Summary */}
          {trackedSubscriptions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Your Tracked Subscriptions ({trackedSubscriptions.length})
              </h4>
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-1.5">
                  {trackedSubscriptions.map((sub) => (
                    <div 
                      key={sub.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/50"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <div>
                          <p className="text-sm font-medium">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ${sub.amount}/{sub.frequency}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => openReminderDialog(sub)}
                        >
                          <Calendar className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteTracked(sub.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Annual Summary */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Annual subscription cost</span>
            <span className="font-semibold">${totalAnnual.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Set Cancellation Reminder
            </DialogTitle>
            <DialogDescription>
              Get reminded to review or cancel "{selectedSubscription?.name}" before renewal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reminder-date">Reminder Date</Label>
              <Input
                id="reminder-date"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reminder-note">Note (optional)</Label>
              <Input
                id="reminder-note"
                placeholder="e.g., Check if still using this service"
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReminder} disabled={!reminderDate || loading}>
              {loading ? 'Saving...' : 'Set Reminder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionTracker;
