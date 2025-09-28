import { useState, useMemo } from "react";
import { TrendingUp, Calendar, DollarSign, Gift, Trash2 } from "lucide-react";
import StatCard from "@/components/UI/StatCard";
import AddIncomeDialog from "@/components/UI/AddIncomeDialog";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuth } from "@/hooks/useAuth";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Income() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const { user } = useAuth();
  const { transactions, loading, refetch } = useFinanceData();
  const { toast } = useToast();

  const handleDeleteIncome = async (incomeId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', incomeId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Income deleted",
        description: "The income entry has been successfully deleted.",
      });

      refetch.transactions();
    } catch (error) {
      console.error('Error deleting income:', error);
      toast({
        title: "Error",
        description: "Failed to delete the income entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const incomeData = useMemo(() => 
    transactions.filter(t => t.type === 'income'), 
    [transactions]
  );

  const totalIncome = useMemo(() => 
    incomeData.reduce((sum, t) => sum + Number(t.amount), 0), 
    [incomeData]
  );

  const stipendIncome = useMemo(() => 
    incomeData.filter(t => t.category === 'stipend').reduce((sum, t) => sum + Number(t.amount), 0), 
    [incomeData]
  );

  const variableIncome = useMemo(() => 
    incomeData.filter(t => t.category !== 'stipend').reduce((sum, t) => sum + Number(t.amount), 0), 
    [incomeData]
  );

  const incomeCategories = useMemo(() => {
    const categories = [
      'stipend', 'scholarship', 'refund', 'side-gig', 'gift', 'other'
    ];
    
    return categories.map(category => {
      const categoryTransactions = incomeData.filter(t => t.category === category);
      const amount = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const isRecurring = category === 'stipend' || category === 'scholarship';
      
      return {
        type: category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' '),
        amount,
        recurring: isRecurring,
        next: isRecurring ? 'Next month' : 'Variable'
      };
    }).filter(category => category.amount > 0);
  }, [incomeData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Income Manager</h1>
          <p className="text-muted-foreground">Track all your income sources</p>
        </div>
        <AddIncomeDialog onIncomeAdded={refetch.transactions} />
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {['week', 'month', 'semester'].map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === period
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent/50 hover:bg-accent'
            }`}
          >
            This {period}
          </button>
        ))}
      </div>

      {/* Income Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Income (Month)"
          value={`$${totalIncome.toLocaleString()}`}
          change="+$650 vs last month"
          changeType="positive"
          icon={<TrendingUp size={24} />}
        />
        <StatCard
          title="Regular Income"
          value={`$${stipendIncome.toLocaleString()}`}
          subtitle="Monthly stipend"
          icon={<Calendar size={24} />}
        />
        <StatCard
          title="Variable Income"
          value={`$${variableIncome.toLocaleString()}`}
          subtitle="Other sources"
          icon={<Gift size={24} />}
        />
      </div>

      {/* Income Forecast */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Income Forecast
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3">If no new refunds arrive:</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total monthly income:</span>
                <span className="font-semibold">${totalIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Regular income:</span>
                <span className="font-semibold">${stipendIncome.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <h3 className="font-medium text-primary mb-2">💡 Recommendation</h3>
            <p className="text-sm">
              {totalIncome > 0 
                ? "Great job tracking your income! Keep diversifying your income sources for better financial security."
                : "Start by adding your income sources to get a complete picture of your finances."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Income Sources */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Income Sources Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incomeCategories.map((category, index) => (
            <div key={index} className="p-4 bg-accent/20 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{category.type}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  category.recurring 
                    ? 'bg-success/10 text-success' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {category.recurring ? 'Recurring' : 'Variable'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">This month:</span>
                  <span className="font-bold text-success">
                    +${category.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next expected:</span>
                  <span className="text-sm font-medium">{category.next}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Income */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Recent Income</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse expense-item">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-32"></div>
                    <div className="h-3 bg-muted rounded w-20"></div>
                  </div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : incomeData.length > 0 ? (
          <div className="space-y-3">
            {incomeData.slice(0, 5).map((income) => (
              <div key={income.id} className="expense-item">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <DollarSign size={18} className="text-success" />
                  </div>
                  <div>
                    <p className="font-medium">{income.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(income.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-success text-lg">
                      +${Number(income.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {income.category.replace('-', ' ')}
                    </p>
                  </div>
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
                        <AlertDialogTitle>Delete Income Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this income entry for ${Number(income.amount).toLocaleString()}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteIncome(income.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign size={48} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No income records yet</p>
            <p className="text-sm text-muted-foreground">Add your first income entry to get started</p>
          </div>
        )}
      </div>

      {/* Income Goals */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Income Goals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <h3 className="font-semibold mb-2">Monthly Target</h3>
            <p className="text-2xl font-bold mb-1">${totalIncome} / $300</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full"
                style={{ width: `${Math.min((totalIncome / 300) * 100, 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {totalIncome >= 300 ? '🎉 Target exceeded!' : `$${300 - totalIncome} to go`}
            </p>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-success/5 to-success/10 rounded-lg border border-success/20">
            <h3 className="font-semibold mb-2">Emergency Fund Goal</h3>
            <p className="text-2xl font-bold mb-1">$850 / $1,500</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="h-full bg-gradient-to-r from-success to-success/80 rounded-full"
                style={{ width: `${(850 / 1500) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              $650 remaining (3.7 months at current rate)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}