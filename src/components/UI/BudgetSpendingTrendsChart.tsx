import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  category: string;
  budget_id?: string | null;
}

interface Budget {
  id: string;
  name: string;
  expense_allocation: number;
  expense_spent: number;
}

interface BudgetSpendingTrendsChartProps {
  transactions: Transaction[];
  budgets: Budget[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(var(--success))',
  'hsl(180 60% 50%)',
  'hsl(280 60% 60%)',
  'hsl(30 80% 55%)',
];

const BudgetSpendingTrendsChart: React.FC<BudgetSpendingTrendsChartProps> = ({ 
  transactions, 
  budgets 
}) => {
  // Get the last 6 months of data
  const chartData = useMemo(() => {
    const now = new Date();
    const months: { month: string; date: Date; data: Record<string, number> }[] = [];
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        date,
        data: {},
      });
    }

    // Calculate spending per budget per month
    transactions
      .filter(t => t.type === 'expense' && t.budget_id)
      .forEach(t => {
        const txDate = new Date(t.date);
        const monthEntry = months.find(m => 
          m.date.getMonth() === txDate.getMonth() && 
          m.date.getFullYear() === txDate.getFullYear()
        );
        
        if (monthEntry && t.budget_id) {
          const budget = budgets.find(b => b.id === t.budget_id);
          if (budget) {
            const budgetKey = budget.name;
            monthEntry.data[budgetKey] = (monthEntry.data[budgetKey] || 0) + t.amount;
          }
        }
      });

    // Format for chart
    return months.map(m => ({
      month: m.month,
      ...m.data,
    }));
  }, [transactions, budgets]);

  // Get unique budget names that have data
  const budgetNames = useMemo(() => {
    const names = new Set<string>();
    chartData.forEach(d => {
      Object.keys(d).forEach(key => {
        if (key !== 'month') names.add(key);
      });
    });
    return Array.from(names);
  }, [chartData]);

  // Calculate trend (comparing last month to previous)
  const trend = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const lastMonth = chartData[chartData.length - 1];
    const prevMonth = chartData[chartData.length - 2];
    
    const lastTotal = Object.entries(lastMonth)
      .filter(([k]) => k !== 'month')
      .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);
    
    const prevTotal = Object.entries(prevMonth)
      .filter(([k]) => k !== 'month')
      .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);
    
    if (prevTotal === 0) return null;
    
    const change = ((lastTotal - prevTotal) / prevTotal) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isUp: change > 0,
      lastTotal,
      prevTotal,
    };
  }, [chartData]);

  if (budgetNames.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Spending Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No spending data available yet</p>
            <p className="text-xs mt-1">Start tracking expenses to see trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg">Spending Trends</CardTitle>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${trend.isUp ? 'text-destructive' : 'text-success'}`}>
              {trend.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{trend.value}%</span>
              <span className="text-muted-foreground text-xs">vs last month</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {budgetNames.map((name, idx) => (
                  <linearGradient key={name} id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                iconSize={8}
              />
              {budgetNames.map((name, idx) => (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  fill={`url(#gradient-${idx})`}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetSpendingTrendsChart;
