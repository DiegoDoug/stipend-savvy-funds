import { NavLink } from "react-router-dom";
import { Home, PieChart, TrendingUp, CreditCard, Target, Sparkles, Settings } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/budget", icon: PieChart, label: "Budget" },
  { path: "/income", icon: TrendingUp, label: "Income" },
  { path: "/expenses", icon: CreditCard, label: "Expenses" },
  { path: "/goals", icon: Target, label: "Goals" },
  { path: "/sage", icon: Sparkles, label: "Sage" },
  { path: "/account", icon: Settings, label: "Account" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 px-4 py-2 md:hidden z-50">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`
            }
          >
            <Icon size={20} />
            <span className="text-xs mt-1 font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}