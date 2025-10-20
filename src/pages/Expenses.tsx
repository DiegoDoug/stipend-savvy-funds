import { Pencil } from "lucide-react";
import EditExpenseDialog from "@/components/UI/EditExpenseDialog";
import { useState, useEffect } from "react";
import { CreditCard, Plus, Search, Filter, Calendar, Trash2, Camera, ExternalLink, Eye } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import StatCard from "@/components/UI/StatCard";
import CategoryBadge from "@/components/UI/CategoryBadge";
import AddExpenseDialog from "@/components/UI/AddExpenseDialog";
import ReceiptScannerModal from "@/components/UI/ReceiptScannerModal";
import ExpenseDetailsDialog from "@/components/UI/ExpenseDetailsDialog";
import { useFinanceData } from "@/hooks/useFinanceData";
import { categoryLabels } from "@/lib/mockData";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAccountStatus } from "@/hooks/useAccountStatus";
export default function Expenses() {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("date");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showScannerDialog, setShowScannerDialog] = useState(false);
  const [scanningExpenseId, setScanningExpenseId] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkAndNotify } = useAccountStatus();
  const { transactions, loading, refetch } = useFinanceData();

  useEffect(() => {
    if (location.state?.openExpenseId && transactions.length > 0) {
      const expense = transactions.find(t => t.id === location.state.openExpenseId && t.type === 'expense');
      if (expense) {
        setSelectedExpense(expense);
        setShowDetailsDialog(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, transactions]);

  const handleDeleteExpense = async (expenseId: string) => {
    if (!checkAndNotify()) return;

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", expenseId).eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Expense deleted",
        description: "The expense entry has been successfully deleted.",
      });

      refetch.transactions();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Error",
        description: "Failed to delete the expense entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenScanner = (expenseId: string) => {
    if (!checkAndNotify()) return;
    setScanningExpenseId(expenseId);
    setShowScannerDialog(true);
  };

  const handleReceiptUploaded = () => {
    refetch.transactions();
  };

  const handleViewDetails = (expense: any) => {
    setSelectedExpense(expense);
    setShowDetailsDialog(true);
  };
  const handleEditExpense = (expense: any) => {
    if (!checkAndNotify()) return;
    setEditingExpense(expense);
    setShowEditDialog(true);
  };

  const handleUpdateExpense = async (updates: {
    description: string;
    amount: number;
    date: string;
    category: string;
  }) => {
    if (!editingExpense || !checkAndNotify()) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          description: updates.description,
          amount: updates.amount,
          date: updates.date,
          category: updates.category,
        })
        .eq("id", editingExpense.id)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Expense updated",
        description: "The expense entry has been successfully updated.",
      });

      refetch.transactions();
      setShowEditDialog(false);
      setEditingExpense(null);
    } catch (error) {
      console.error("Error updating expense:", error);
      toast({
        title: "Error",
        description: "Failed to update the expense entry. Please try again.",
        variant: "destructive",
      });
    }
  };
  const expenses = transactions?.filter((t) => t.type === "expense") || [];
  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
  const avgDaily = totalExpenses / 30; // Approximate daily average

  // Get unique categories from expenses
  const availableCategories = [...new Set(expenses.map((e) => e.category))].filter(Boolean);

  // Filter and sort expenses
  const filteredExpenses = expenses
    .filter(
      (expense) =>
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedCategory === null || expense.category === selectedCategory),
    )
    .sort((a, b) => {
      if (sortBy === "amount") return Number(b.amount) - Number(a.amount);
      if (sortBy === "date") return new Date(b.date).getTime() - new Date(a.date).getTime();
      return 0;
    });
  const categoryTotals = expenses.reduce(
    (acc, expense) => {
      const amount = Number(expense.amount);
      acc[expense.category] = (acc[expense.category] || 0) + amount;
      return acc;
    },
    {} as Record<string, number>,
  );
  const largestCategory = Object.entries(categoryTotals).reduce(
    (max, [category, amount]) =>
      amount > max.amount
        ? {
            category,
            amount,
          }
        : max,
    {
      category: "",
      amount: 0,
    },
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Expense Tracker</h1>
          <p className="text-muted-foreground">Monitor your spending patterns</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-to-r from-primary to-primary-glow">
          <Plus size={18} className="mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Spent (Month)"
          value={`$${totalExpenses.toLocaleString()}`}
          change="-12% vs last month"
          changeType="positive"
          icon={<CreditCard size={24} />}
        />
        <StatCard
          title="Daily Average"
          value={`$${avgDaily.toFixed(2)}`}
          subtitle="Based on 30 days"
          icon={<Calendar size={24} />}
        />
        <StatCard
          title="Largest Category"
          value={
            largestCategory.category
              ? categoryLabels[largestCategory.category as keyof typeof categoryLabels] || largestCategory.category
              : "None"
          }
          subtitle={`$${largestCategory.amount.toFixed(2)}`}
          icon={<Filter size={24} />}
        />
      </div>

      {/* Filters and Search */}
      <div className="budget-card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === null ? "bg-primary text-primary-foreground" : "bg-accent/50 hover:bg-accent"}`}
            >
              All Categories
            </button>
            {availableCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === category ? "bg-primary text-primary-foreground" : "bg-accent/50 hover:bg-accent"}`}
              >
                {categoryLabels[category as keyof typeof categoryLabels] || category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          {["date", "amount"].map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`px-2 py-1 text-xs rounded ${sortBy === sort ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {sort === "date" ? "Date" : "Amount"}
            </button>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="budget-card">
        <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(categoryTotals).map(([category, amount]) => (
            <div key={category} className="p-4 bg-accent/20 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <CategoryBadge category={category} size="sm" />
                <span className="text-sm text-muted-foreground">
                  {totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <p className="text-xl font-bold">${amount.toFixed(2)}</p>
              <div className="mt-2">
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className={`h-full rounded-full bg-category-${category}`}
                    style={{
                      width: `${totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="budget-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {selectedCategory
              ? `${categoryLabels[selectedCategory as keyof typeof categoryLabels] || selectedCategory} Expenses`
              : "All Expenses"}
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredExpenses.map((expense) => (
            <div key={expense.id} className="expense-item">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center bg-category-${expense.category}/10`}
                >
                  <CreditCard size={18} className={`text-category-${expense.category}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{expense.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CategoryBadge category={expense.category} size="sm" />
                    <span className="text-xs text-muted-foreground">{expense.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-bold text-lg">-${Number(expense.amount).toFixed(2)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80"
                  onClick={() => handleViewDetails(expense)}
                  title="View details"
                >
                  <Eye size={16} />
                </Button>
                {expense.receipt_url ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/80"
                    onClick={() => window.open(expense.receipt_url!, "_blank")}
                    title="View receipt"
                  >
                    <ExternalLink size={16} />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => handleOpenScanner(expense.id)}
                    title="Scan receipt"
                  >
                    <Camera size={16} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => handleEditExpense(expense)}
                  title="Edit expense"
                >
                  <Pencil size={16} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete expense"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Expense Entry</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this expense entry for $
                        {Number(expense.amount).toLocaleString()}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteExpense(expense.id)}
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

        {filteredExpenses.length === 0 && (
          <div className="text-center py-8">
            <CreditCard size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No expenses found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Spending Insights */}

      <AddExpenseDialog open={showAddDialog} onOpenChange={setShowAddDialog} onExpenseAdded={refetch.transactions} />

      {/* Receipt Scanner Modal */}
      {scanningExpenseId && (
        <ReceiptScannerModal
          open={showScannerDialog}
          onOpenChange={setShowScannerDialog}
          incomeId={scanningExpenseId}
          onReceiptUploaded={handleReceiptUploaded}
        />
      )}

      {/* Expense Details Dialog */}
      <ExpenseDetailsDialog 
        open={showDetailsDialog} 
        onOpenChange={setShowDetailsDialog} 
        expense={selectedExpense}
        onRefresh={refetch.transactions}
      />

      {/* Edit Expense Dialog */}
      <EditExpenseDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        expense={editingExpense}
        onUpdate={handleUpdateExpense}
      />
    </div>
  );
}
