import { useState, useMemo } from "react";
import { TrendingUp, Calendar, DollarSign, Gift, Trash2, Plus, Pencil, Clock } from "lucide-react";
import StatCard from "@/components/UI/StatCard";
import AddIncomeDialog from "@/components/UI/AddIncomeDialog";
import EditIncomeDialog from "@/components/UI/EditIncomeDialog";
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
import { useAccountStatus } from "@/hooks/useAccountStatus";

export default function Income() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any | null>(null);
  const { user } = useAuth();
  const { transactions, loading, refetch } = useFinanceData();
  const { toast } = useToast();
  const { checkAndNotify } = useAccountStatus();

  const handleEditIncome = (income: any) => {
    if (!checkAndNotify()) return;
    setEditingIncome(income);
    setShowEditDialog(true);
  };

  const handleUpdateIncome = async (amount: number) => {
    if (!editingIncome || !checkAndNotify()) return;
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ amount })
        .eq("id", editingIncome.id)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Income updated",
        description: "The income entry has been successfully updated.",
      });

      refetch.transactions();
      setShowEditDialog(false);
      setEditingIncome(null);
    } catch (error) {
      console.error("Error updating income:", error);
      toast({
        title: "Error",
        description: "Failed to update the income entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!checkAndNotify()) return;
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", incomeId).eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Income deleted",
        description: "The income entry has been successfully deleted.",
      });

      refetch.transactions();
    } catch (error) {
      console.error("Error deleting income:", error);
      toast({
        title: "Error",
        description: "Failed to delete the income entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const incomeData = useMemo(() => transactions.filter((t) => t.type === "income"), [transactions]);

  // Get current month's start and end dates
  const currentMonthRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  // Filter income for current month only
  const currentMonthIncome = useMemo(() => {
    return incomeData.filter((t) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= currentMonthRange.start && transactionDate <= currentMonthRange.end;
    });
  }, [incomeData, currentMonthRange]);

  // Filter income for future months
  const futureIncome = useMemo(() => {
    return incomeData
      .filter((t) => {
        const transactionDate = new Date(t.date);
        return transactionDate > currentMonthRange.end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [incomeData, currentMonthRange]);

  const totalIncome = useMemo(
    () => currentMonthIncome.reduce((sum, t) => sum + Number(t.amount), 0),
    [currentMonthIncome],
  );

  const totalFutureIncome = useMemo(() => futureIncome.reduce((sum, t) => sum + Number(t.amount), 0), [futureIncome]);

  const stipendIncome = useMemo(
    () => currentMonthIncome.filter((t) => t.category === "stipend").reduce((sum, t) => sum + Number(t.amount), 0),
    [currentMonthIncome],
  );

  const variableIncome = useMemo(
    () => currentMonthIncome.filter((t) => t.category !== "stipend").reduce((sum, t) => sum + Number(t.amount), 0),
    [currentMonthIncome],
  );

  const incomeCategories = useMemo(() => {
    const categories = ["stipend", "scholarship", "refund", "side-gig", "gift", "other"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return categories
      .map((category) => {
        const categoryTransactions = incomeData.filter((t) => t.category === category);

        // Current month's total
        const amount = categoryTransactions
          .filter((t) => {
            const transactionDate = new Date(t.date);
            return transactionDate >= currentMonthRange.start && transactionDate <= currentMonthRange.end;
          })
          .reduce((sum, t) => sum + Number(t.amount), 0);

        // Find next expected income (future dates only)
        const futureTransactions = categoryTransactions
          .filter((t) => {
            const transactionDate = new Date(t.date);
            transactionDate.setHours(0, 0, 0, 0);
            return transactionDate > today;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const isRecurring = category === "stipend" || category === "scholarship";
        const nextDate =
          futureTransactions.length > 0
            ? new Date(futureTransactions[0].date).toLocaleDateString()
            : isRecurring
              ? "Not scheduled"
              : "Variable";

        return {
          type: category.charAt(0).toUpperCase() + category.slice(1).replace("-", " "),
          amount,
          recurring: isRecurring,
          next: nextDate,
        };
      })
      .filter((category) => category.amount > 0);
  }, [incomeData, currentMonthRange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Income Manager</h1>
          <p className="text-muted-foreground">Track all your income sources</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-to-r from-success to-success/80">
          <Plus size={18} className="mr-2" />
          Add Income
        </Button>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {["week", "month", "semester"].map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === period ? "bg-primary text-primary-foreground" : "bg-accent/50 hover:bg-accent"
            }`}
          >
            This {period}
          </button>
        ))}
      </div>

      {/* Income Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Income (This Month)"
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
        <StatCard
          title="Future Income"
          value={`$${totalFutureIncome.toLocaleString()}`}
          subtitle={`${futureIncome.length} scheduled`}
          icon={<Clock size={24} />}
        />
      </div>

      {/* Future Income Section */}
      {futureIncome.length > 0 && (
        <div className="budget-card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} />
            Scheduled Future Income
          </h2>
          <div className="space-y-3">
            {futureIncome.map((income) => (
              <div key={income.id} className="expense-item">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <DollarSign size={18} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{income.description}</p>
                    <p className="text-xs text-muted-foreground capitalize">{income.category.replace("-", " ")}</p>
                    <p className="text-sm text-primary font-medium mt-1">
                      {new Date(income.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-bold text-primary text-lg">+${Number(income.amount).toLocaleString()}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => handleEditIncome(income)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Income Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this scheduled income entry for $
                          {Number(income.amount).toLocaleString()}? This action cannot be undone.
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
        </div>
      )}

      {/* Income Forecast */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Income Forecast
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3">Current Month Summary:</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total monthly income:</span>
                <span className="font-semibold">${totalIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Regular income:</span>
                <span className="font-semibold">${stipendIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Future income scheduled:</span>
                <span className="font-semibold text-primary">${totalFutureIncome.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <h3 className="font-medium text-primary mb-2">💡 Recommendation</h3>
            <p className="text-sm">
              {totalIncome > 0
                ? "Great job tracking your income! Keep diversifying your income sources for better financial security."
                : "Start by adding your income sources to get a complete picture of your finances."}
            </p>
          </div>
        </div>
      </div>

      {/* Income Sources */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Income Sources Overview (This Month)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incomeCategories.map((category, index) => (
            <div key={index} className="p-4 bg-accent/20 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{category.type}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    category.recurring ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {category.recurring ? "Recurring" : "Variable"}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">This month:</span>
                  <span className="font-bold text-success">+${category.amount.toLocaleString()}</span>
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
        <h2 className="text-lg font-semibold mb-4">Recent Income (This Month)</h2>
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
        ) : currentMonthIncome.length > 0 ? (
          <div className="space-y-3">
            {currentMonthIncome.slice(0, 5).map((income) => (
              <div key={income.id} className="expense-item">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <DollarSign size={18} className="text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{income.description}</p>
                    <p className="text-xs text-muted-foreground capitalize">{income.category.replace("-", " ")}</p>
                    <p className="text-sm text-muted-foreground mt-1">{new Date(income.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-bold text-success text-lg">+${Number(income.amount).toLocaleString()}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => handleEditIncome(income)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Income Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this income entry for $
                          {Number(income.amount).toLocaleString()}? This action cannot be undone.
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
            <p className="text-muted-foreground">No income records for this month yet</p>
            <p className="text-sm text-muted-foreground">Add your first income entry to get started</p>
          </div>
        )}
      </div>

      <AddIncomeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onIncomeAdded={refetch.transactions}
        showTrigger={false}
      />

      {/* Edit Income Dialog */}
      {editingIncome && (
        <EditIncomeDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          income={editingIncome}
          onUpdate={handleUpdateIncome}
        />
      )}
    </div>
  );
}
