import { Dock, DockItem, DockIcon, DockLabel } from "./DockBase";
import { Home, PieChart, TrendingUp, CreditCard, Target, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const dockItems = [
  { label: "Dashboard", icon: <Home size={32} />, path: "/" },
  { label: "Budget", icon: <PieChart size={32} />, path: "/budget" },
  { label: "Income", icon: <TrendingUp size={32} />, path: "/income" },
  { label: "Expenses", icon: <CreditCard size={32} />, path: "/expenses" },
  { label: "Goals", icon: <Target size={32} />, path: "/goals" },
  { label: "Settings", icon: <Settings size={32} />, path: "/account" },
];

export function SidebarDock({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Dock className="flex flex-col h-full items-center px-2 py-8 bg-card shadow-lg">
      {dockItems.map((item, idx) => (
        <DockItem
          key={item.path}
          className="mb-6 cursor-pointer"
          onClick={() => {
            navigate(item.path);
            onClose?.();
          }}
        >
          <DockIcon>{item.icon}</DockIcon>
          <DockLabel>{item.label}</DockLabel>
        </DockItem>
      ))}
    </Dock>
  );
}
