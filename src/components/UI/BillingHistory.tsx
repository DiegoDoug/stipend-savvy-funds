import { useState, useEffect, useMemo } from 'react';
import { Calendar, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format, subMonths, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  next_billing_date: string | null;
}

interface BillingEntry {
  id: string;
  subscription_id: string;
  subscription_name: string;
  amount: number;
  billing_date: string;
  status: 'paid' | 'upcoming' | 'skipped';
}

interface BillingHistoryProps {
  subscriptions: Subscription[];
}

export function BillingHistory({ subscriptions }: BillingHistoryProps) {
  const { user } = useAuth();
  const [billingHistory, setBillingHistory] = useState<BillingEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Generate billing history from subscriptions
  useEffect(() => {
    const generateHistory = () => {
      const history: BillingEntry[] = [];
      const now = new Date();
      const threeMonthsAgo = subMonths(now, 3);
      const threeMonthsAhead = new Date(now);
      threeMonthsAhead.setMonth(threeMonthsAhead.getMonth() + 3);

      subscriptions.forEach(sub => {
        if (sub.frequency === 'monthly' && sub.next_billing_date) {
          // Generate past and future billing dates
          let currentDate = new Date(sub.next_billing_date);
          
          // Go back to find past dates
          while (currentDate > threeMonthsAgo) {
            const prevDate = new Date(currentDate);
            prevDate.setMonth(prevDate.getMonth() - 1);
            if (prevDate >= threeMonthsAgo) {
              currentDate = prevDate;
            } else {
              break;
            }
          }

          // Generate entries
          while (currentDate <= threeMonthsAhead) {
            const isPast = currentDate < now;
            history.push({
              id: `${sub.id}-${currentDate.toISOString()}`,
              subscription_id: sub.id,
              subscription_name: sub.name,
              amount: Number(sub.amount),
              billing_date: currentDate.toISOString().split('T')[0],
              status: isPast ? 'paid' : 'upcoming',
            });
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
        } else if (sub.frequency === 'yearly' && sub.next_billing_date) {
          const nextDate = new Date(sub.next_billing_date);
          const isPast = nextDate < now;
          history.push({
            id: `${sub.id}-${nextDate.toISOString()}`,
            subscription_id: sub.id,
            subscription_name: sub.name,
            amount: Number(sub.amount),
            billing_date: nextDate.toISOString().split('T')[0],
            status: isPast ? 'paid' : 'upcoming',
          });
        }
      });

      setBillingHistory(history.sort((a, b) => 
        new Date(a.billing_date).getTime() - new Date(b.billing_date).getTime()
      ));
    };

    generateHistory();
  }, [subscriptions]);

  // Filter by selected month
  const filteredHistory = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    
    return billingHistory.filter(entry => {
      const entryDate = new Date(entry.billing_date);
      return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
    });
  }, [billingHistory, selectedMonth]);

  const monthlyTotal = filteredHistory.reduce((sum, entry) => sum + entry.amount, 0);

  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = -3; i <= 3; i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() + i);
      result.push(date);
    }
    return result;
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={14} className="text-success" />;
      case 'upcoming':
        return <Clock size={14} className="text-primary" />;
      case 'skipped':
        return <XCircle size={14} className="text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div className="budget-card" data-tour="billing-history">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar size={20} className="text-secondary" />
          Billing History
        </h2>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{format(selectedMonth, 'MMMM yyyy')}</p>
          <p className="font-semibold text-primary">${monthlyTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
        {months.map((month) => {
          const isSelected = format(month, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM');
          const isCurrentMonth = format(month, 'yyyy-MM') === format(new Date(), 'yyyy-MM');
          
          return (
            <button
              key={month.toISOString()}
              onClick={() => setSelectedMonth(month)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : isCurrentMonth
                    ? 'bg-secondary/20 text-secondary hover:bg-secondary/30'
                    : 'bg-accent/50 hover:bg-accent'
              }`}
            >
              {format(month, 'MMM')}
            </button>
          );
        })}
      </div>

      {/* Billing Entries */}
      <ScrollArea className="max-h-64">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-6">
            <DollarSign size={24} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No billing entries for this month</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  entry.status === 'upcoming' 
                    ? 'bg-primary/5 border-primary/20' 
                    : entry.status === 'paid'
                      ? 'bg-success/5 border-success/20'
                      : 'bg-muted border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(entry.status)}
                  <div>
                    <p className="font-medium text-sm">{entry.subscription_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.billing_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${entry.amount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground capitalize">{entry.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
