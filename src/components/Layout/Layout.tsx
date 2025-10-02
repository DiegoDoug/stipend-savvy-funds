import { useState } from "react";
import { Outlet } from "react-router-dom";
import { CreditCard, TrendingUp, Target } from "lucide-react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import QuickActionFAB from "@/components/UI/QuickActionFAB";
import AddExpenseDialog from "@/components/UI/AddExpenseDialog";
import AddIncomeDialog from "@/components/UI/AddIncomeDialog";
import AddGoalDialog from "@/components/UI/AddGoalDialog";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  const quickActions = [
    {
      label: "Add Expense",
      icon: <CreditCard size={18} />,
      onClick: () => setExpenseDialogOpen(true),
    },
    {
      label: "Log Income",
      icon: <TrendingUp size={18} />,
      onClick: () => setIncomeDialogOpen(true),
    },
    {
      label: "Set Goal",
      icon: <Target size={18} />,
      onClick: () => setGoalDialogOpen(true),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 min-h-screen flex flex-col">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 p-4 pb-20 md:pb-4 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
      
      <BottomNav />
      <QuickActionFAB actions={quickActions} />

      <AddExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onExpenseAdded={() => {}}
      />
      <AddIncomeDialog
        open={incomeDialogOpen}
        onOpenChange={setIncomeDialogOpen}
      />
      <AddGoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
      />
    </div>
  );
}