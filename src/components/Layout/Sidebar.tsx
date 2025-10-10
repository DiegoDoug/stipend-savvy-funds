import { useState } from "react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { Home, PieChart, TrendingUp, CreditCard, Target, Settings, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useFinanceData } from "@/hooks/useFinanceData";
import { categoryLabels } from "@/lib/mockData";

const tabs = [
  { title: "Dashboard", icon: Home },
  { title: "Budget Planner", icon: PieChart },
  { title: "Income Manager", icon: TrendingUp },
  { title: "Expense Tracker", icon: CreditCard },
  { title: "Goals & Savings", icon: Target },
  { title: "Account Settings", icon: Settings },
];

const paths = ["/", "/budget", "/income", "/expenses", "/goals", "/account"];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { budgetCategories } = useFinanceData();
  const [expanded, setExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState<number | null>(null);

  const totalAllocated = budgetCategories.reduce((sum, cat) => sum + Number(cat.allocated), 0);
  const totalSpent = budgetCategories.reduce((sum, cat) => sum + Number(cat.spent), 0);
  const remaining = totalAllocated - totalSpent;
  const showBudgetInsights = location.pathname === '/budget';

  // Sidebar width changes based on expanded state
  const sidebarWidth = expanded ? "w-48" : "w-16";

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
        className={`fixed left-0 top-0 h-full ${sidebarWidth} bg-card border-r border-border/50 z-50 transform transition-all duration-300 md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-border/50 flex items-center justify-between">

        
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent/50 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col h-[calc(100%-73px)] overflow-y-auto p-2 items-center">
          <ExpandableTabs
            tabs={tabs}
            activeColor="text-primary"
            expanded={expanded}
            selectedTab={selectedTab}
            className={`flex flex-col gap-2 items-center w-full`}
            onChange={index => {
              if (index !== null) {
                setExpanded(true);
                setSelectedTab(index);
                window.location.href = paths[index];
                onClose();
              } else {
                setExpanded(false);
                setSelectedTab(null);
              }
            }}
          />

          {showBudgetInsights && budgetCategories.length > 0 && (
            <div className="pt-6">
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