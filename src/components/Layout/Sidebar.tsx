import { NavLink, useLocation } from "react-router-dom";
import { Home, PieChart, TrendingUp, CreditCard, Target, Settings, X } from "lucide-react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { categoryLabels } from "@/lib/mockData";

const navItems = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/budget", icon: PieChart, label: "Budget Planner" },
  { path: "/income", icon: TrendingUp, label: "Income Manager" },
  { path: "/expenses", icon: CreditCard, label: "Expense Tracker" },
  { path: "/goals", icon: Target, label: "Goals & Savings" },
  { path: "/account", icon: Settings, label: "Account Settings" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { budgetCategories, stats } = useFinanceData();
  
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

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-border/50 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              FinTrack
            </h2>
            <p className="text-xs text-muted-foreground">Student Finance Manager</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent/50 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col h-[calc(100%-73px)] overflow-y-auto">
          <nav className="p-4 space-y-2">
            {navItems.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`
                }
              >
                <Icon size={18} />
                <span className="font-medium">{label}</span>
              </NavLink>
            ))}
          </nav>

          {showBudgetInsights && budgetCategories.length > 0 && (
            <div className="p-4 pt-0">
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
        </div>
      </aside>
    </>
  );
}