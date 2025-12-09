import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ComposedChart
} from 'recharts';
import { 
  TrendingUp, Target, AlertTriangle, Lightbulb, 
  RefreshCw, Calendar, DollarSign, Zap, ChevronRight,
  Clock, ShieldAlert, Sparkles, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FinancialContext } from '@/components/UI/FinancialAdvisorChat';
import SubscriptionTracker from './SubscriptionTracker';

interface ForecastAnalysisProps {
  financialContext: FinancialContext;
}

type PeriodType = 'shortTerm' | 'midTerm' | 'longTerm';

interface CashFlowPrediction {
  period: string;
  predictedIncome: number;
  predictedExpenses: number;
  predictedSavings: number;
  confidence: 'high' | 'medium' | 'low';
  monthlyBreakdown: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  insights: string[];
}

interface GoalProjection {
  goalId: string;
  goalName: string;
  currentAmount: number;
  targetAmount: number;
  projectedCompletionDate: string | null;
  onTrack: boolean;
  monthlyContributionNeeded: number;
  recommendedAction: string;
}

interface DetectedSubscription {
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'yearly';
  category: string;
  confidence: 'high' | 'medium' | 'low';
  annualCost: number;
  transactionIds: string[];
}

interface RiskFactor {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

interface Opportunity {
  type: string;
  title: string;
  potentialSavings: number;
  description: string;
  actionItems: string[];
}

interface ForecastData {
  cashFlowPredictions: {
    shortTerm: CashFlowPrediction;
    midTerm: CashFlowPrediction;
    longTerm: CashFlowPrediction;
  };
  goalProjections: GoalProjection[];
  subscriptions: DetectedSubscription[];
  totalMonthlySubscriptions: number;
  totalAnnualSubscriptions: number;
  riskFactors: RiskFactor[];
  opportunities: Opportunity[];
}

const ForecastAnalysis: React.FC<ForecastAnalysisProps> = ({ financialContext }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('shortTerm');
  const [showSimulator, setShowSimulator] = useState(false);
  
  // What-If simulator state
  const [simulatedIncomeChange, setSimulatedIncomeChange] = useState(0);
  const [simulatedExpenseReduction, setSimulatedExpenseReduction] = useState(0);
  const [extraMonthlySavings, setExtraMonthlySavings] = useState(0);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('financial-forecast', {
        body: { financialContext, analysisType: 'full' }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setForecastData(data);
    } catch (error) {
      console.error('Forecast error:', error);
      toast({
        title: 'Analysis Error',
        description: error instanceof Error ? error.message : 'Failed to generate forecast',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (financialContext.transactions.length > 0) {
      fetchForecast();
    }
  }, []);

  const currentPrediction = useMemo(() => {
    if (!forecastData) return null;
    return forecastData.cashFlowPredictions[selectedPeriod];
  }, [forecastData, selectedPeriod]);

  const simulatedProjections = useMemo(() => {
    if (!currentPrediction) return null;
    
    const incomeMultiplier = 1 + (simulatedIncomeChange / 100);
    const expenseMultiplier = 1 - (simulatedExpenseReduction / 100);
    
    return currentPrediction.monthlyBreakdown.map(month => ({
      ...month,
      simulatedIncome: month.income * incomeMultiplier,
      simulatedExpenses: month.expenses * expenseMultiplier,
      simulatedNet: (month.income * incomeMultiplier) - (month.expenses * expenseMultiplier) + extraMonthlySavings,
      originalNet: month.net,
    }));
  }, [currentPrediction, simulatedIncomeChange, simulatedExpenseReduction, extraMonthlySavings]);

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    const styles = {
      high: 'bg-success/20 text-success border-success/30',
      medium: 'bg-warning/20 text-warning border-warning/30',
      low: 'bg-destructive/20 text-destructive border-destructive/30',
    };
    return (
      <Badge variant="outline" className={cn('text-xs', styles[confidence])}>
        {confidence} confidence
      </Badge>
    );
  };

  const getSeverityIcon = (severity: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'text-destructive',
      medium: 'text-warning',
      low: 'text-muted-foreground',
    };
    return <AlertTriangle className={cn('h-4 w-4', colors[severity])} />;
  };

  const periodLabels = {
    shortTerm: { label: '1-3 Months', icon: Clock },
    midTerm: { label: '3-6 Months', icon: Calendar },
    longTerm: { label: '6-12 Months', icon: TrendingUp },
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Analyzing your financial patterns...</p>
          <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
        </CardContent>
      </Card>
    );
  }

  if (!forecastData) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Sparkles className="h-10 w-10 text-primary/50 mb-4" />
          <h3 className="font-semibold mb-2">Predictive Analysis</h3>
          <p className="text-muted-foreground text-sm text-center mb-4 max-w-md">
            Get AI-powered forecasts, goal projections, and subscription detection based on your financial history.
          </p>
          <Button onClick={fetchForecast} className="gap-2">
            <Zap className="h-4 w-4" />
            Generate Forecast
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Financial Forecast</h2>
            <p className="text-xs text-muted-foreground">AI-powered predictions based on your patterns</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchForecast} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(Object.keys(periodLabels) as PeriodType[]).map((period) => {
          const { label, icon: Icon } = periodLabels[period];
          return (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className="gap-2 flex-1"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          );
        })}
      </div>

      {/* Cash Flow Prediction Summary */}
      {currentPrediction && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {currentPrediction.period} Forecast
              </CardTitle>
              {getConfidenceBadge(currentPrediction.confidence)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-1 text-success mb-1">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="text-xs font-medium">Income</span>
                </div>
                <p className="text-lg font-bold text-success">
                  ${currentPrediction.predictedIncome.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-1 text-destructive mb-1">
                  <ArrowDownRight className="h-4 w-4" />
                  <span className="text-xs font-medium">Expenses</span>
                </div>
                <p className="text-lg font-bold text-destructive">
                  ${currentPrediction.predictedExpenses.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-1 text-primary mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs font-medium">Savings</span>
                </div>
                <p className="text-lg font-bold text-primary">
                  ${currentPrediction.predictedSavings.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Chart */}
            {currentPrediction.monthlyBreakdown.length > 0 && (
              <div className="h-[200px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={showSimulator ? simulatedProjections : currentPrediction.monthlyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey={showSimulator ? "simulatedIncome" : "income"} 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--success))' }}
                      name="Income"
                    />
                    <Line 
                      type="monotone" 
                      dataKey={showSimulator ? "simulatedExpenses" : "expenses"} 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--destructive))' }}
                      name="Expenses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey={showSimulator ? "simulatedNet" : "net"} 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name="Net"
                    />
                    {showSimulator && (
                      <Line 
                        type="monotone" 
                        dataKey="originalNet"
                        stroke="hsl(var(--muted-foreground))" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Original Net"
                      />
                    )}
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Insights */}
            {currentPrediction.insights.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key Insights</h4>
                <ul className="space-y-1">
                  {currentPrediction.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* What-If Simulator */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              What-If Simulator
            </CardTitle>
            <Button
              variant={showSimulator ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowSimulator(!showSimulator)}
            >
              {showSimulator ? 'Hide' : 'Show'} Simulator
            </Button>
          </div>
        </CardHeader>
        {showSimulator && (
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Income Change</Label>
                  <span className={cn(
                    "text-sm font-medium",
                    simulatedIncomeChange > 0 ? "text-success" : simulatedIncomeChange < 0 ? "text-destructive" : ""
                  )}>
                    {simulatedIncomeChange > 0 ? '+' : ''}{simulatedIncomeChange}%
                  </span>
                </div>
                <Slider
                  value={[simulatedIncomeChange]}
                  onValueChange={([v]) => setSimulatedIncomeChange(v)}
                  min={-50}
                  max={50}
                  step={5}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Expense Reduction</Label>
                  <span className={cn(
                    "text-sm font-medium",
                    simulatedExpenseReduction > 0 ? "text-success" : ""
                  )}>
                    {simulatedExpenseReduction}%
                  </span>
                </div>
                <Slider
                  value={[simulatedExpenseReduction]}
                  onValueChange={([v]) => setSimulatedExpenseReduction(v)}
                  min={0}
                  max={50}
                  step={5}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Extra Monthly Savings</Label>
                  <span className="text-sm font-medium text-primary">
                    ${extraMonthlySavings}
                  </span>
                </div>
                <Input
                  type="number"
                  value={extraMonthlySavings}
                  onChange={(e) => setExtraMonthlySavings(Number(e.target.value) || 0)}
                  min={0}
                  step={50}
                  className="h-9"
                />
              </div>
            </div>
            
            {simulatedProjections && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  With these changes, you could save an extra{' '}
                  <span className="font-semibold text-primary">
                    ${(simulatedProjections.reduce((sum, m) => sum + m.simulatedNet, 0) - 
                       simulatedProjections.reduce((sum, m) => sum + m.originalNet, 0)).toLocaleString()}
                  </span>{' '}
                  over the {currentPrediction?.period || 'selected period'}.
                </p>
              </div>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSimulatedIncomeChange(0);
                setSimulatedExpenseReduction(0);
                setExtraMonthlySavings(0);
              }}
            >
              Reset Simulator
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Subscription Tracker */}
      <SubscriptionTracker 
        detectedSubscriptions={forecastData.subscriptions}
        totalMonthly={forecastData.totalMonthlySubscriptions}
        totalAnnual={forecastData.totalAnnualSubscriptions}
        onRefresh={fetchForecast}
      />

      {/* Goal Projections */}
      {forecastData.goalProjections.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Goal Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {forecastData.goalProjections.map((goal) => (
                <div key={goal.goalId} className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{goal.goalName}</h4>
                    <Badge variant={goal.onTrack ? 'default' : 'destructive'} className="text-xs">
                      {goal.onTrack ? 'On Track' : 'At Risk'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                    </span>
                    {goal.projectedCompletionDate && (
                      <span className="text-muted-foreground">
                        Est. {new Date(goal.projectedCompletionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        goal.onTrack ? "bg-primary" : "bg-destructive"
                      )}
                      style={{ width: `${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Need ${goal.monthlyContributionNeeded.toFixed(0)}/mo • {goal.recommendedAction}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors & Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forecastData.riskFactors.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {forecastData.riskFactors.map((risk, i) => (
                    <div key={i} className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex items-center gap-2 mb-1">
                        {getSeverityIcon(risk.severity)}
                        <span className="text-sm font-medium">{risk.type.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{risk.description}</p>
                      <p className="text-xs text-primary mt-1">{risk.recommendation}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {forecastData.opportunities.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-warning" />
                Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {forecastData.opportunities.map((opp, i) => (
                    <div key={i} className="p-2 rounded-lg bg-warning/5 border border-warning/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{opp.title}</span>
                        <Badge variant="secondary" className="text-xs">
                          +${opp.potentialSavings.toFixed(0)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{opp.description}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ForecastAnalysis;
