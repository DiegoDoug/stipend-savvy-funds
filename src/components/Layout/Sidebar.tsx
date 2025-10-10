import { Dock } from "motion-primitives";
import { Home, PieChart, TrendingUp, CreditCard, Target, Settings, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useFinanceData } from "@/hooks/useFinanceData";
import { categoryLabels } from "@/lib/mockData";

const dockItems = [
  { label: "Dashboard", icon: <Home size={24} />, path: "/" },
  { label: "Budget", icon: <PieChart size={24} />, path: "/budget" },
  { label: "Income", icon: <TrendingUp size={24} />, path: "/income" },
  { label: "Expenses", icon: <CreditCard size={24} />, path: "/expenses" },
  { label: "Goals", icon: <Target size={24} />, path: "/goals" },
  { label: "Settings", icon: <Settings size={24} />, path: "/account" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { budgetCategories } = useFinanceData();

  const totalAllocated = budgetCategories.reduce((sum, cat) => sum + Number(cat.allocated), 0);
  const totalSpent = budgetCategories.reduce((sum, cat) => sum + Number(cat.spent), 0);
  const remaining = totalAllocated - totalSpent;
  const showBudgetInsights = location.pathname === '/budget';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside className="fixed left-0 top-0 h-full flex items-center bg-card z-50 shadow-lg">
        {/* Dock menu */}
        <Dock
          orientation="vertical"
          className="h-full"
          items={dockItems.map(item => ({
            icon: item.icon,
            label: item.label,
            onClick: () => {
              navigate(item.path);
              onClose();
            },
            active: location.pathname === item.path,
          }))}
        />
      </aside>
      {/* Budget Insights (optional, appears next to dock on budget page) */}
      {showBudgetInsights && budgetCategories.length > 0 && (
        <div className="pt-6 pl-24">
          <div className="budget-card">
            <h2 className="text-lg font-semibold mb-4">Budget Insights</h2>
            <div className="space-y-4">
              <div className="p-4 bg-success-light rounded-lg">
                <h3 className="font-semibold text-success mb-2">💡 Smart Tip</h3>
                <p className="text-sm text-success-foreground">
                  You have ${remaining.toLocaleString()} remaining this month. Consider moving some to your emergency fund!
                </p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg">
                <h3 className="font-semibold text-primary mb-2">📊 Spending Pattern</h3>
                <p className="text-sm">
                  {budgetCategories.length > 0 && (
                    `Your largest expense category is ${categoryLabels[budgetCategories.reduce((max, cat) =>
                      Number(cat.spent) > Number(max.spent) ? cat : max
                    ).category as keyof typeof categoryLabels]} at $${budgetCategories.reduce((max, cat) =>
                      Number(cat.spent) > Number(max.spent) ? cat : max
                    ).spent} this month.`
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}