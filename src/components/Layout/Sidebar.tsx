import { NavLink } from "react-router-dom";
import { Home, PieChart, TrendingUp, CreditCard, Target, BarChart3, X } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/budget", icon: PieChart, label: "Budget Planner" },
  { path: "/income", icon: TrendingUp, label: "Income Manager" },
  { path: "/expenses", icon: CreditCard, label: "Expense Tracker" },
  { path: "/refunds", icon: CreditCard, label: "Refund Manager" },
  { path: "/goals", icon: Target, label: "Goals & Savings" },
  { path: "/reports", icon: BarChart3, label: "Reports" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
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
            <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
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
      </aside>
    </>
  );
}