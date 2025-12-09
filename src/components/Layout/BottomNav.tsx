import { NavLink } from "react-router-dom";
import { Home, PieChart, TrendingUp, CreditCard, Target, Sparkles, Settings, RefreshCw } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const navItems = [
  { path: "/", icon: Home, labelKey: "nav.home" },
  { path: "/budget", icon: PieChart, labelKey: "nav.budget" },
  { path: "/income", icon: TrendingUp, labelKey: "nav.income" },
  { path: "/expenses", icon: CreditCard, labelKey: "nav.expenses" },
  { path: "/goals", icon: Target, labelKey: "nav.goals" },
  { path: "/subscriptions", icon: RefreshCw, labelKey: "nav.subs" },
  { path: "/sage", icon: Sparkles, labelKey: "nav.sage" },
  { path: "/account", icon: Settings, labelKey: "nav.account" },
];

export default function BottomNav() {
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 px-4 py-2 md:hidden z-50">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map(({ path, icon: Icon, labelKey }) => (
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
            <span className="text-xs mt-1 font-medium">{t(labelKey)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
