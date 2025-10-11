import { Home, PieChart, TrendingUp, CreditCard, Target, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const dockItems = [
  { label: "Dashboard", icon: Home, path: "/" },
  { label: "Budget", icon: PieChart, path: "/budget" },
  { label: "Income", icon: TrendingUp, path: "/income" },
  { label: "Expenses", icon: CreditCard, path: "/expenses" },
  { label: "Goals", icon: Target, path: "/goals" },
  { label: "Settings", icon: Settings, path: "/account" },
];

export function SidebarDock({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="flex flex-col h-full items-center justify-center px-3 py-8 bg-card w-20 gap-2">
      {dockItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <button
            key={item.path}
            onClick={() => {
              navigate(item.path);
              onClose?.();
            }}
            className={cn(
              "group relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-200",
              "hover:bg-primary/10 hover:scale-110",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
            title={item.label}
          >
            <Icon size={24} className="transition-transform group-hover:scale-110" />
            <span className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none shadow-lg">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
