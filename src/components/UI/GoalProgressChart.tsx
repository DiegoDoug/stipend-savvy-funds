import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { TrendingUp, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { logError } from '@/lib/errorLogger';

interface ProgressData {
  date: string;
  amount: number;
  formattedDate: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
}

interface GoalProgressChartProps {
  goals: SavingsGoal[];
}

export default function GoalProgressChart({ goals }: GoalProgressChartProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  const dateLocale = language === 'es' ? es : enUS;

  // Auto-select first goal when goals change
  useEffect(() => {
    if (goals.length > 0 && !selectedGoalId) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);

  // Fetch progress history when goal changes
  useEffect(() => {
    const fetchProgress = async () => {
      if (!selectedGoalId || !user) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('goal_progress_history')
          .select('amount, recorded_at')
          .eq('goal_id', selectedGoalId)
          .order('recorded_at', { ascending: true });

        if (error) throw error;

        const formattedData: ProgressData[] = (data || []).map(item => ({
          date: item.recorded_at,
          amount: Number(item.amount),
          formattedDate: format(new Date(item.recorded_at), 'MMM d', { locale: dateLocale }),
        }));

        // If no history, add current amount as starting point
        if (formattedData.length === 0 && selectedGoal) {
          formattedData.push({
            date: new Date().toISOString(),
            amount: selectedGoal.current_amount,
            formattedDate: format(new Date(), 'MMM d', { locale: dateLocale }),
          });
        }

        setProgressData(formattedData);
      } catch (error) {
        logError(error, 'GoalProgressChart:fetchProgress');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [selectedGoalId, user, selectedGoal]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (goals.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t('charts.progressOverTime')}</CardTitle>
          </div>
          <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
            <SelectTrigger className="w-[180px] h-8 text-sm">
              <SelectValue placeholder={t('charts.selectGoal')} />
            </SelectTrigger>
            <SelectContent>
              {goals.map(goal => (
                <SelectItem key={goal.id} value={goal.id}>
                  {goal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : progressData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            {t('charts.noProgressData')}
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="formattedDate"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `$${value}`}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), t('charts.saved')]}
                  labelFormatter={(label) => `${t('charts.date')}: ${label}`}
                />
                {selectedGoal && (
                  <ReferenceLine
                    y={selectedGoal.target_amount}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="5 5"
                    label={{
                      value: `${t('charts.target')}: ${formatCurrency(selectedGoal.target_amount)}`,
                      position: 'right',
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 10,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#progressGradient)"
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {selectedGoal && progressData.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t('charts.started')}: {progressData[0]?.formattedDate}
            </span>
            <span className="font-medium text-foreground">
              {formatCurrency(selectedGoal.current_amount)} / {formatCurrency(selectedGoal.target_amount)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
